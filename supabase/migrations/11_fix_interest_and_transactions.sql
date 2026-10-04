-- ============================================================
-- 11_fix_interest_and_transactions.sql
-- 金利ルール・付与スケジュール設定の確実な保存および取引履歴RLSの整備
-- ============================================================

-- 1. families テーブルに金利・スケジュール設定カラムを追加
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS weekly_interest_rate NUMERIC(5, 4) DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS max_weekly_reward_limit INTEGER DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS interest_schedule_type TEXT DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS interest_schedule_day INTEGER DEFAULT 0;

-- 2. accounts テーブルに子ども個別金利・スケジュール設定カラムを追加
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS weekly_interest_rate NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS max_weekly_reward_limit INTEGER,
  ADD COLUMN IF NOT EXISTS interest_schedule_type TEXT DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS interest_schedule_day INTEGER DEFAULT 0;

-- 3. users テーブルにも子ども個別金利・スケジュール設定カラムを追加
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS weekly_interest_rate NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS max_weekly_reward_limit INTEGER,
  ADD COLUMN IF NOT EXISTS interest_schedule_type TEXT DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS interest_schedule_day INTEGER DEFAULT 0;

-- 4. transactions テーブルへのRLSポリシー許可（閲覧・追加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Allow select transactions'
  ) THEN
    CREATE POLICY "Allow select transactions" ON public.transactions
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Allow insert transactions'
  ) THEN
    CREATE POLICY "Allow insert transactions" ON public.transactions
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
