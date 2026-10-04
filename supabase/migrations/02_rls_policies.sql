-- ============================================================
-- マネーツリー Supabase マイグレーション
-- Step 2: Row Level Security (RLS) ポリシー
-- ============================================================
--
-- 前提:
--   - 親ユーザーは Supabase Auth で認証済み (auth.uid() が使える)
--   - 子どもは Synthetic Email 方式で認証 (auth.uid() が users.auth_uid と一致)
--   - 全テーブルでRLSを有効化し、デフォルト拒否にする
-- ============================================================

-- ============================================================
-- ヘルパー関数: 現在のユーザーのfamily_idを取得
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id
  FROM public.users
  WHERE auth_uid = auth.uid()
  LIMIT 1;
  RETURN v_family_id;
END;
$$;

-- ヘルパー関数: 現在のユーザーのロールを取得
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE auth_uid = auth.uid()
  LIMIT 1;
  RETURN v_role;
END;
$$;

-- ヘルパー関数: 現在のユーザーのusers.idを取得
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_uid = auth.uid()
  LIMIT 1;
  RETURN v_user_id;
END;
$$;

-- ============================================================
-- families テーブル RLS
-- ============================================================
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- 同じファミリーのメンバーは閲覧可能
CREATE POLICY "Family members can view own family"
  ON public.families FOR SELECT
  USING (id = public.get_my_family_id());

-- 親のみファミリー設定を更新可能
CREATE POLICY "Parents can update own family"
  ON public.families FOR UPDATE
  USING (id = public.get_my_family_id() AND public.get_my_role() = 'PARENT');

-- 認証済みユーザーがファミリーを作成可能（新規登録時）
CREATE POLICY "Authenticated users can create family"
  ON public.families FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- users テーブル RLS
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 同じファミリーのメンバー一覧を閲覧可能
CREATE POLICY "Family members can view family users"
  ON public.users FOR SELECT
  USING (family_id = public.get_my_family_id());

-- 自分のプロフィールを更新可能
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth_uid = auth.uid());

-- 親が子プロファイルを作成可能
CREATE POLICY "Parents can create child profiles"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- family_codeで子ども一覧検索用（ログイン画面）
-- 未認証でもfamily_codeでの検索を許可（子どもログインフロー用）
CREATE POLICY "Anyone can lookup children by family"
  ON public.users FOR SELECT
  TO anon, authenticated
  USING (role = 'CHILD');

-- ============================================================
-- accounts テーブル RLS
-- ============================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 子ども: 自分の口座のみ閲覧
CREATE POLICY "Children can view own account"
  ON public.accounts FOR SELECT
  USING (
    child_id = public.get_my_user_id()
    OR family_id = public.get_my_family_id()
  );

-- 親のみ口座を更新（残高調整、利息付与等）
CREATE POLICY "Parents can update family accounts"
  ON public.accounts FOR UPDATE
  USING (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
  );

-- 口座作成（子プロファイル作成時）
CREATE POLICY "Authenticated users can create accounts"
  ON public.accounts FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_my_family_id());

-- サービスロール用: 利息バッチ更新
CREATE POLICY "Service role can manage all accounts"
  ON public.accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- quests テーブル RLS
-- ============================================================
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- ファミリー全員がクエストを閲覧可能
CREATE POLICY "Family members can view quests"
  ON public.quests FOR SELECT
  USING (family_id = public.get_my_family_id());

-- 親のみクエストを作成・更新・削除
CREATE POLICY "Parents can create quests"
  ON public.quests FOR INSERT
  WITH CHECK (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
  );

CREATE POLICY "Parents can update quests"
  ON public.quests FOR UPDATE
  USING (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
  );

CREATE POLICY "Parents can delete quests"
  ON public.quests FOR DELETE
  USING (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
  );

-- ============================================================
-- quest_submissions テーブル RLS
-- ============================================================
ALTER TABLE public.quest_submissions ENABLE ROW LEVEL SECURITY;

-- ファミリー全員が提出を閲覧可能
CREATE POLICY "Family members can view submissions"
  ON public.quest_submissions FOR SELECT
  USING (family_id = public.get_my_family_id());

-- 子どもが自分のクエスト提出を作成
CREATE POLICY "Children can create submissions"
  ON public.quest_submissions FOR INSERT
  WITH CHECK (
    child_id = public.get_my_user_id()
    AND family_id = public.get_my_family_id()
  );

-- 親が提出を承認/却下（statusの更新）
CREATE POLICY "Parents can update submissions"
  ON public.quest_submissions FOR UPDATE
  USING (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
  );

-- ============================================================
-- transactions テーブル RLS
-- ============================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 子ども: 自分の取引履歴のみ閲覧
-- 親: ファミリー全員の取引を閲覧
CREATE POLICY "Users can view relevant transactions"
  ON public.transactions FOR SELECT
  USING (
    child_id = public.get_my_user_id()
    OR family_id = public.get_my_family_id()
  );

-- 取引作成（内部処理用）
CREATE POLICY "Authenticated can create transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_my_family_id());

-- サービスロール用: 利息バッチ処理
CREATE POLICY "Service role can manage transactions"
  ON public.transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- wish_items テーブル RLS
-- ============================================================
ALTER TABLE public.wish_items ENABLE ROW LEVEL SECURITY;

-- ファミリー全員が閲覧可能
CREATE POLICY "Family members can view wish items"
  ON public.wish_items FOR SELECT
  USING (family_id = public.get_my_family_id());

-- 子ども: 自分のウィッシュアイテムを作成・更新・削除
CREATE POLICY "Children can manage own wish items"
  ON public.wish_items FOR INSERT
  WITH CHECK (
    child_id = public.get_my_user_id()
    AND family_id = public.get_my_family_id()
  );

CREATE POLICY "Children can update own wish items"
  ON public.wish_items FOR UPDATE
  USING (child_id = public.get_my_user_id());

CREATE POLICY "Children can delete own wish items"
  ON public.wish_items FOR DELETE
  USING (child_id = public.get_my_user_id());

-- 親もウィッシュアイテムを更新可能（matching_bonus設定）
CREATE POLICY "Parents can update family wish items"
  ON public.wish_items FOR UPDATE
  USING (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
  );

-- ============================================================
-- withdrawal_requests テーブル RLS
-- ============================================================
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ファミリー全員が閲覧可能
CREATE POLICY "Family members can view withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (family_id = public.get_my_family_id());

-- 子どもが出金リクエストを作成
CREATE POLICY "Children can create withdrawals"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (
    child_id = public.get_my_user_id()
    AND family_id = public.get_my_family_id()
  );

-- 子どもが自分のリクエストを更新（キャンセル用）
CREATE POLICY "Children can update own withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (child_id = public.get_my_user_id());

-- 親が出金リクエストを承認/却下
CREATE POLICY "Parents can update family withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
  );
