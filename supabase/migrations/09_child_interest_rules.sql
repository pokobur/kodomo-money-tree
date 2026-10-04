-- ============================================================
-- 09_child_interest_rules.sql
-- 子どもごとの金利ルール設定（週間利息率・報酬上限）の追加
-- ============================================================

-- 1. accountsテーブルに子ども個別設定カラムを追加
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS weekly_interest_rate NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS max_weekly_reward_limit INTEGER;

COMMENT ON COLUMN public.accounts.weekly_interest_rate IS '子ども個別の週利（未設定の場合はfamilyの設定を使用）';
COMMENT ON COLUMN public.accounts.max_weekly_reward_limit IS '子ども個別の週間報酬上限（未設定の場合はfamilyの設定を使用）';

-- 2. usersテーブルにも必要に応じてカラムを追加
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS weekly_interest_rate NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS max_weekly_reward_limit INTEGER;

-- 3. 週利計算関数を子どもの個別設定を優先するように更新
CREATE OR REPLACE FUNCTION public.calculate_weekly_interest()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account   RECORD;
  v_family    RECORD;
  v_rate      NUMERIC(5, 4);
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
    -- ファミリー情報を取得
    SELECT * INTO v_family
    FROM public.families
    WHERE id = v_account.family_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- 口座個別の週利があればそれを優先、なければファミリーの週利を使用
    v_rate := COALESCE(v_account.weekly_interest_rate, v_family.weekly_interest_rate, 0.05);

    -- 利息計算（切り上げ）
    v_interest := CEIL(v_account.savings_balance::NUMERIC * v_rate);

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
