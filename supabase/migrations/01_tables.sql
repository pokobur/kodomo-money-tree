-- ============================================================
-- マネーツリー Supabase マイグレーション
-- Step 1: テーブル定義
-- ============================================================
-- 
-- 実行方法:
--   Supabase Dashboard → SQL Editor → New Query → このファイルを貼り付けて Run
--   または: supabase db push (Supabase CLI使用時)
--
-- 順序: 01 → 02 → 03 → 04 の順に実行してください
-- ============================================================

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. families テーブル
-- ============================================================
CREATE TABLE public.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  family_code TEXT UNIQUE NOT NULL,
  weekly_interest_rate  NUMERIC(5, 4) NOT NULL DEFAULT 0.05,
  max_weekly_reward_limit INTEGER NOT NULL DEFAULT 5000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- family_code での高速検索用インデックス
CREATE INDEX idx_families_family_code ON public.families (family_code);

COMMENT ON TABLE public.families IS 'ファミリー単位の設定・管理テーブル';
COMMENT ON COLUMN public.families.family_code IS '6桁英数字のペアリングコード（子どもログイン時に使用）';
COMMENT ON COLUMN public.families.weekly_interest_rate IS '週利（例: 0.05 = 5%）';
COMMENT ON COLUMN public.families.max_weekly_reward_limit IS '週あたりの報酬上限（コイン単位）';

-- ============================================================
-- 2. users テーブル
-- ============================================================
CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('PARENT', 'CHILD')),
  display_name    TEXT NOT NULL,
  pin_code_hash   TEXT,
  avatar_url      TEXT,
  auth_uid        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_family_id ON public.users (family_id);
CREATE INDEX idx_users_auth_uid ON public.users (auth_uid);
CREATE INDEX idx_users_family_role ON public.users (family_id, role);

COMMENT ON TABLE public.users IS 'ユーザープロファイル（親・子ども共通）';
COMMENT ON COLUMN public.users.pin_code_hash IS '子ども用PINコードのSHA-256ハッシュ';
COMMENT ON COLUMN public.users.auth_uid IS 'Supabase Authユーザーとの紐付け';

-- ============================================================
-- 3. accounts テーブル（子ども1人1レコード）
-- ============================================================
CREATE TABLE public.accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  spending_balance        INTEGER NOT NULL DEFAULT 0 CHECK (spending_balance >= 0),
  savings_balance         INTEGER NOT NULL DEFAULT 0 CHECK (savings_balance >= 0),
  last_interest_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  unclaimed_interest      INTEGER NOT NULL DEFAULT 0 CHECK (unclaimed_interest >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_child_id ON public.accounts (child_id);
CREATE INDEX idx_accounts_family_id ON public.accounts (family_id);

COMMENT ON TABLE public.accounts IS '子ども口座（つかう口座 + ためる口座）';
COMMENT ON COLUMN public.accounts.spending_balance IS 'つかう口座の残高（コイン単位、整数）';
COMMENT ON COLUMN public.accounts.savings_balance IS 'ためる口座の残高（コイン単位、整数）';
COMMENT ON COLUMN public.accounts.unclaimed_interest IS '未収穫の利息（金の果実として表示）';

-- ============================================================
-- 4. quests テーブル
-- ============================================================
CREATE TABLE public.quests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  reward_amount   INTEGER NOT NULL CHECK (reward_amount > 0),
  spending_percent INTEGER NOT NULL DEFAULT 70 CHECK (spending_percent >= 0 AND spending_percent <= 100),
  savings_percent  INTEGER NOT NULL DEFAULT 30 CHECK (savings_percent >= 0 AND savings_percent <= 100),
  repeat_type     TEXT NOT NULL DEFAULT 'ONCE' CHECK (repeat_type IN ('ONCE', 'DAILY', 'WEEKLY')),
  requires_photo  BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  assigned_child_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- spending_percent + savings_percent = 100 の制約
  CONSTRAINT chk_percent_sum CHECK (spending_percent + savings_percent = 100)
);

CREATE INDEX idx_quests_family_id ON public.quests (family_id);
CREATE INDEX idx_quests_active ON public.quests (family_id, is_active);

COMMENT ON TABLE public.quests IS 'お手伝いクエスト定義';
COMMENT ON COLUMN public.quests.spending_percent IS '報酬のつかう口座配分率 (%)';
COMMENT ON COLUMN public.quests.savings_percent IS '報酬のためる口座配分率 (%)';

-- ============================================================
-- 5. quest_submissions テーブル
-- ============================================================
CREATE TABLE public.quest_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id        UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  photo_url       TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at     TIMESTAMPTZ,
  parent_comment  TEXT
);

CREATE INDEX idx_submissions_family_status ON public.quest_submissions (family_id, status);
CREATE INDEX idx_submissions_child ON public.quest_submissions (child_id);
CREATE INDEX idx_submissions_quest ON public.quest_submissions (quest_id);

COMMENT ON TABLE public.quest_submissions IS 'クエスト完了報告（子ども提出 → 親承認/却下）';

-- ============================================================
-- 6. transactions テーブル
-- ============================================================
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  target_account  TEXT NOT NULL CHECK (target_account IN ('SPENDING', 'SAVINGS')),
  type            TEXT NOT NULL CHECK (type IN ('QUEST_REWARD', 'INTEREST', 'WITHDRAW', 'ADJUSTMENT')),
  amount          INTEGER NOT NULL,
  title           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_child ON public.transactions (child_id, created_at DESC);
CREATE INDEX idx_transactions_family ON public.transactions (family_id);
CREATE INDEX idx_transactions_type ON public.transactions (child_id, type);

COMMENT ON TABLE public.transactions IS '全取引履歴';
COMMENT ON COLUMN public.transactions.target_account IS '対象口座 (SPENDING=つかう, SAVINGS=ためる)';
COMMENT ON COLUMN public.transactions.type IS '取引種別 (QUEST_REWARD/INTEREST/WITHDRAW/ADJUSTMENT)';

-- ============================================================
-- 7. wish_items テーブル
-- ============================================================
CREATE TABLE public.wish_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  target_price    INTEGER NOT NULL CHECK (target_price > 0),
  image_url       TEXT,
  is_purchased    BOOLEAN NOT NULL DEFAULT false,
  matching_bonus_percent INTEGER CHECK (matching_bonus_percent >= 0 AND matching_bonus_percent <= 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wish_items_child ON public.wish_items (child_id);

COMMENT ON TABLE public.wish_items IS 'ほしいものリスト（計画購買）';
COMMENT ON COLUMN public.wish_items.matching_bonus_percent IS '親のマッチング応援率 (%)';

-- ============================================================
-- 8. withdrawal_requests テーブル
-- ============================================================
CREATE TABLE public.withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL CHECK (amount > 0),
  purpose         TEXT NOT NULL,
  source_account  TEXT NOT NULL CHECK (source_account IN ('SPENDING', 'SAVINGS')),
  status          TEXT NOT NULL DEFAULT 'COOLDOWN' CHECK (status IN ('COOLDOWN', 'PENDING', 'APPROVED', 'REJECTED')),
  cooldown_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawals_child ON public.withdrawal_requests (child_id);
CREATE INDEX idx_withdrawals_family_status ON public.withdrawal_requests (family_id, status);

COMMENT ON TABLE public.withdrawal_requests IS '出金リクエスト（24hクールダウン付き）';
COMMENT ON COLUMN public.withdrawal_requests.status IS 'COOLDOWN(24h) → PENDING(親待ち) → APPROVED/REJECTED';
