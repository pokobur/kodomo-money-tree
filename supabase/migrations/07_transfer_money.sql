-- ============================================================
-- 07. お金の移動（つかえる ⇔ ちょきんばこ）ストアドプロシージャ & RLS
-- ============================================================

-- 1. 子どもによる口座残高移動プロシージャ（SECURITY DEFINER で安全に実行）
CREATE OR REPLACE FUNCTION public.transfer_money(
  p_child_id UUID,
  p_direction TEXT,
  p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_new_spending INTEGER;
  v_new_savings INTEGER;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('error', '金額は1以上を指定してください');
  END IF;

  SELECT * INTO v_account
  FROM public.accounts
  WHERE child_id = p_child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', '口座が見つかりません');
  END IF;

  IF p_direction = 'SPENDING_TO_SAVINGS' THEN
    IF v_account.spending_balance < p_amount THEN
      RETURN jsonb_build_object('error', 'つかえるお金が足りません');
    END IF;
    v_new_spending := v_account.spending_balance - p_amount;
    v_new_savings := v_account.savings_balance + p_amount;
  ELSIF p_direction = 'SAVINGS_TO_SPENDING' THEN
    IF v_account.savings_balance < p_amount THEN
      RETURN jsonb_build_object('error', '貯金が足りません');
    END IF;
    v_new_savings := v_account.savings_balance - p_amount;
    v_new_spending := v_account.spending_balance + p_amount;
  ELSE
    RETURN jsonb_build_object('error', '無効な移動方向です');
  END IF;

  -- 口座残高を更新
  UPDATE public.accounts
  SET
    spending_balance = v_new_spending,
    savings_balance = v_new_savings
  WHERE id = v_account.id;

  -- 取引レコードを作成
  INSERT INTO public.transactions (child_id, family_id, target_account, type, amount, title, created_at)
  VALUES
    (
      v_account.child_id,
      v_account.family_id,
      CASE WHEN p_direction = 'SPENDING_TO_SAVINGS' THEN 'SPENDING' ELSE 'SAVINGS' END,
      'ADJUSTMENT',
      -p_amount,
      CASE WHEN p_direction = 'SPENDING_TO_SAVINGS' THEN 'ちょきんばこへ うつしたよ' ELSE 'つかえるおかねへ うつしたよ' END,
      v_now
    ),
    (
      v_account.child_id,
      v_account.family_id,
      CASE WHEN p_direction = 'SPENDING_TO_SAVINGS' THEN 'SAVINGS' ELSE 'SPENDING' END,
      'ADJUSTMENT',
      p_amount,
      CASE WHEN p_direction = 'SPENDING_TO_SAVINGS' THEN 'つかえるおかねから うつしたよ' ELSE 'ちょきんばこから うつしたよ' END,
      v_now
    );

  RETURN jsonb_build_object(
    'success', true,
    'spending_balance', v_new_spending,
    'savings_balance', v_new_savings
  );
END;
$$;

COMMENT ON FUNCTION public.transfer_money IS '子どもによる「つかえる」と「ためる」間の残高移動';

-- 実行権限を付与
GRANT EXECUTE ON FUNCTION public.transfer_money(UUID, TEXT, INTEGER) TO authenticated, anon;

-- 2. 直接テーブルUPDATEも許可するRLSポリシー（自分の口座への移動用）
CREATE POLICY "Children can update own account for transfer"
  ON public.accounts FOR UPDATE
  USING (
    child_id = public.get_my_user_id()
    OR family_id = public.get_my_family_id()
  );
