-- ============================================================
-- マネーツリー Supabase マイグレーション
-- Step 6: データベース容量最適化・定期クリーンアップ関数
-- ============================================================
--
-- 概要:
--   古い完了・却下済みデータ（30日以上前）や古い取引履歴（90日以上前）を
--   安全に一括削除し、データベースのストレージ容量を効率化します。
--   ※現在の口座残高や未完了のお手伝い、親の設定は一切削除されません。
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_records(
  p_completed_retention_days INTEGER DEFAULT 30,
  p_transactions_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  deleted_submissions BIGINT,
  deleted_withdrawals BIGINT,
  deleted_transactions BIGINT,
  deleted_wish_items BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subs_count BIGINT := 0;
  v_wds_count BIGINT := 0;
  v_tx_count BIGINT := 0;
  v_wish_count BIGINT := 0;
  v_completed_cutoff TIMESTAMPTZ;
  v_tx_cutoff TIMESTAMPTZ;
BEGIN
  v_completed_cutoff := now() - (p_completed_retention_days || ' days')::INTERVAL;
  v_tx_cutoff := now() - (p_transactions_retention_days || ' days')::INTERVAL;

  -- 1. 30日以上前の承認・却下済みお手伝い報告を削除
  WITH deleted AS (
    DELETE FROM public.quest_submissions
    WHERE status IN ('APPROVED', 'REJECTED')
      AND COALESCE(reviewed_at, submitted_at) < v_completed_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_subs_count FROM deleted;

  -- 2. 30日以上前の承認・却下済み出金申請を削除
  WITH deleted AS (
    DELETE FROM public.withdrawal_requests
    WHERE status IN ('APPROVED', 'REJECTED')
      AND created_at < v_completed_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_wds_count FROM deleted;

  -- 3. 90日以上前の古い取引ログを削除（残高は accounts テーブルにあるため影響なし）
  WITH deleted AS (
    DELETE FROM public.transactions
    WHERE created_at < v_tx_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_tx_count FROM deleted;

  -- 4. 30日以上前の購入済みウィッシュアイテムを削除
  WITH deleted AS (
    DELETE FROM public.wish_items
    WHERE is_purchased = true
      AND created_at < v_completed_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_wish_count FROM deleted;

  RETURN QUERY SELECT v_subs_count, v_wds_count, v_tx_count, v_wish_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_records IS '古い完了データや履歴を自動削除してデータベース容量を最適化するストアドプロシージャ';
