-- ============================================================
-- 08_withdrawal_parent_comment.sql
-- Add parent_comment column to withdrawal_requests table
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'withdrawal_requests' AND column_name = 'parent_comment'
  ) THEN
    ALTER TABLE public.withdrawal_requests ADD COLUMN parent_comment TEXT;
  END IF;
END $$;
