-- ============================================================
-- 10_interest_schedule.sql
-- 任意の曜日・日にち（WEEKLY / MONTHLY）の金利・お小遣い付与スケジュールの追加
-- ============================================================

-- 1. families テーブルに付与スケジュール設定を追加
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS interest_schedule_type TEXT DEFAULT 'WEEKLY' CHECK (interest_schedule_type IN ('WEEKLY', 'MONTHLY')),
  ADD COLUMN IF NOT EXISTS interest_schedule_day INTEGER DEFAULT 0;

COMMENT ON COLUMN public.families.interest_schedule_type IS '金利付与サイクル (WEEKLY: 毎週, MONTHLY: 毎月)';
COMMENT ON COLUMN public.families.interest_schedule_day IS '付与日 (WEEKLY: 0=日〜6=土, MONTHLY: 1〜31)';

-- 2. accounts テーブルに子ども個別スケジュール設定を追加
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS interest_schedule_type TEXT DEFAULT 'WEEKLY' CHECK (interest_schedule_type IN ('WEEKLY', 'MONTHLY')),
  ADD COLUMN IF NOT EXISTS interest_schedule_day INTEGER DEFAULT 0;

COMMENT ON COLUMN public.accounts.interest_schedule_type IS '子ども個別の金利付与サイクル';
COMMENT ON COLUMN public.accounts.interest_schedule_day IS '子ども個別の金利付与日';

-- 3. users テーブルにもカラムを追加
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS interest_schedule_type TEXT DEFAULT 'WEEKLY' CHECK (interest_schedule_type IN ('WEEKLY', 'MONTHLY')),
  ADD COLUMN IF NOT EXISTS interest_schedule_day INTEGER DEFAULT 0;
