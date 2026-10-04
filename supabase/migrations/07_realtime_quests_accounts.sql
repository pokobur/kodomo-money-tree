-- ============================================================
-- 07_realtime_quests_accounts.sql
-- Add quests and accounts tables to Supabase Realtime publication
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'quests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
  END IF;
END $$;
