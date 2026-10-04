-- ============================================================
-- マネーツリー Supabase マイグレーション
-- Step 3: ストアドプロシージャ & トリガー
-- ============================================================

-- ============================================================
-- 1. ファミリーコード自動生成
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- 6桁英数字コード生成（大文字のみ、紛らわしい文字を除外）
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 30 + 1)::int, 1);
    END LOOP;

    -- 重複チェック
    SELECT EXISTS (
      SELECT 1 FROM public.families WHERE family_code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$;

-- families挿入時にfamily_codeが空なら自動生成するトリガー
CREATE OR REPLACE FUNCTION public.trigger_set_family_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.family_code IS NULL OR NEW.family_code = '' THEN
    NEW.family_code := public.generate_family_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_families_set_code
  BEFORE INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_family_code();

-- ============================================================
-- 2. 子アカウント自動作成トリガー
--    users に CHILD ロールが INSERT されたら accounts を自動作成
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_create_child_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role = 'CHILD' THEN
    INSERT INTO public.accounts (child_id, family_id)
    VALUES (NEW.id, NEW.family_id)
    ON CONFLICT (child_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_create_account
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_child_account();

-- ============================================================
-- 3. クエスト承認時の残高更新プロシージャ
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_quest_submission(
  p_submission_id UUID,
  p_parent_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission  RECORD;
  v_quest       RECORD;
  v_account     RECORD;
  v_spending_amount INTEGER;
  v_savings_amount  INTEGER;
  v_now         TIMESTAMPTZ := now();
BEGIN
  -- 提出を取得
  SELECT * INTO v_submission
  FROM public.quest_submissions
  WHERE id = p_submission_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Submission not found or already processed');
  END IF;

  -- クエストを取得
  SELECT * INTO v_quest
  FROM public.quests
  WHERE id = v_submission.quest_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Quest not found');
  END IF;

  -- 口座を取得
  SELECT * INTO v_account
  FROM public.accounts
  WHERE child_id = v_submission.child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Account not found');
  END IF;

  -- 配分計算
  v_spending_amount := CEIL(v_quest.reward_amount::NUMERIC * v_quest.spending_percent / 100);
  v_savings_amount  := v_quest.reward_amount - v_spending_amount;

  -- 残高更新
  UPDATE public.accounts
  SET
    spending_balance = spending_balance + v_spending_amount,
    savings_balance  = savings_balance + v_savings_amount
  WHERE id = v_account.id;

  -- 取引レコード作成（つかう口座分）
  IF v_spending_amount > 0 THEN
    INSERT INTO public.transactions (child_id, family_id, target_account, type, amount, title)
    VALUES (v_submission.child_id, v_submission.family_id, 'SPENDING', 'QUEST_REWARD', v_spending_amount, v_quest.title || '（つかう）');
  END IF;

  -- 取引レコード作成（ためる口座分）
  IF v_savings_amount > 0 THEN
    INSERT INTO public.transactions (child_id, family_id, target_account, type, amount, title)
    VALUES (v_submission.child_id, v_submission.family_id, 'SAVINGS', 'QUEST_REWARD', v_savings_amount, v_quest.title || '（ためる）');
  END IF;

  -- 提出ステータス更新
  UPDATE public.quest_submissions
  SET
    status = 'APPROVED',
    reviewed_at = v_now,
    parent_comment = COALESCE(p_parent_comment, parent_comment)
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'spending_added', v_spending_amount,
    'savings_added', v_savings_amount,
    'total_reward', v_quest.reward_amount
  );
END;
$$;

COMMENT ON FUNCTION public.approve_quest_submission IS 'クエスト提出承認: 残高更新 + 取引記録 + ステータス変更をアトミックに実行';

-- ============================================================
-- 4. 出金承認プロシージャ
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_withdrawal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_withdrawal RECORD;
  v_account    RECORD;
  v_balance_col TEXT;
  v_current_balance INTEGER;
BEGIN
  -- リクエスト取得
  SELECT * INTO v_withdrawal
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Withdrawal not found or not in PENDING state');
  END IF;

  -- 口座取得
  SELECT * INTO v_account
  FROM public.accounts
  WHERE child_id = v_withdrawal.child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Account not found');
  END IF;

  -- 残高チェック
  IF v_withdrawal.source_account = 'SPENDING' THEN
    v_current_balance := v_account.spending_balance;
  ELSE
    v_current_balance := v_account.savings_balance;
  END IF;

  IF v_current_balance < v_withdrawal.amount THEN
    RETURN jsonb_build_object('error', 'Insufficient balance');
  END IF;

  -- 残高引き落とし
  IF v_withdrawal.source_account = 'SPENDING' THEN
    UPDATE public.accounts
    SET spending_balance = spending_balance - v_withdrawal.amount
    WHERE id = v_account.id;
  ELSE
    UPDATE public.accounts
    SET savings_balance = savings_balance - v_withdrawal.amount
    WHERE id = v_account.id;
  END IF;

  -- 取引記録
  INSERT INTO public.transactions (child_id, family_id, target_account, type, amount, title)
  VALUES (
    v_withdrawal.child_id,
    v_withdrawal.family_id,
    v_withdrawal.source_account,
    'WITHDRAW',
    -v_withdrawal.amount,
    v_withdrawal.purpose
  );

  -- ステータス更新
  UPDATE public.withdrawal_requests
  SET status = 'APPROVED'
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_withdrawal.amount,
    'source_account', v_withdrawal.source_account
  );
END;
$$;

COMMENT ON FUNCTION public.approve_withdrawal IS '出金リクエスト承認: 残高引き落とし + 取引記録をアトミックに実行';

-- ============================================================
-- 5. 週利計算バッチプロシージャ
--    pg_cron から毎週日曜日に実行される
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_weekly_interest()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account   RECORD;
  v_family    RECORD;
  v_interest  INTEGER;
  v_processed INTEGER := 0;
  v_now       TIMESTAMPTZ := now();
BEGIN
  -- 全アクティブ口座をループ処理
  FOR v_account IN
    SELECT a.*
    FROM public.accounts a
    WHERE a.savings_balance > 0
  LOOP
    -- ファミリーの週利を取得
    SELECT * INTO v_family
    FROM public.families
    WHERE id = v_account.family_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- 利息計算（切り上げ）
    v_interest := CEIL(v_account.savings_balance::NUMERIC * v_family.weekly_interest_rate);

    IF v_interest > 0 THEN
      -- unclaimed_interestに加算（金の果実として表示）
      UPDATE public.accounts
      SET
        unclaimed_interest = unclaimed_interest + v_interest,
        last_interest_calculated_at = v_now
      WHERE id = v_account.id;

      v_processed := v_processed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_accounts', v_processed,
    'calculated_at', v_now
  );
END;
$$;

COMMENT ON FUNCTION public.calculate_weekly_interest IS '毎週実行: 全口座の貯蓄残高に対して利息を計算し、unclaimed_interestに加算';

-- ============================================================
-- 6. クールダウン→PENDING 自動遷移プロシージャ
-- ============================================================
CREATE OR REPLACE FUNCTION public.transition_cooldown_to_pending()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.withdrawal_requests
  SET status = 'PENDING'
  WHERE status = 'COOLDOWN'
    AND cooldown_expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.transition_cooldown_to_pending IS 'クールダウン期限が過ぎた出金リクエストをPENDINGに自動遷移';

-- ============================================================
-- 7. PINコードハッシュ化ヘルパー
-- ============================================================
CREATE OR REPLACE FUNCTION public.hash_pin(p_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(digest(p_pin, 'sha256'), 'hex');
END;
$$;

-- PINコード検証ヘルパー
CREATE OR REPLACE FUNCTION public.verify_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  SELECT pin_code_hash INTO v_stored_hash
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN v_stored_hash = public.hash_pin(p_pin);
END;
$$;
