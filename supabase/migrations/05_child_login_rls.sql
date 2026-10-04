-- ============================================================
-- 子どもアクセス用（未認証 / anon）RLSポリシー設定
-- ============================================================
-- 子どもはPINコード＋ファミリーコードでログインするため、
-- Supabase Authセッション（auth.uid()）を持たない未認証（anon）状態で
-- ファミリー検索、子ども一覧、クエスト閲覧、提出等を行います。

-- 1. families テーブル（子どもログイン画面でのファミリーコード検索用）
DROP POLICY IF EXISTS "Anyone can lookup family by code" ON public.families;
CREATE POLICY "Anyone can lookup family by code"
  ON public.families FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. users テーブル（子ども一覧および子どもログイン検証用）
DROP POLICY IF EXISTS "Anyone can lookup children by family" ON public.users;
CREATE POLICY "Anyone can lookup children by family"
  ON public.users FOR SELECT
  TO anon, authenticated
  USING (role = 'CHILD');

-- 3. quests テーブル（子ども側のクエスト一覧表示用）
DROP POLICY IF EXISTS "Anyone can view quests by family" ON public.quests;
CREATE POLICY "Anyone can view quests by family"
  ON public.quests FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. accounts テーブル（子ども側の口座残高表示用）
DROP POLICY IF EXISTS "Anyone can view child account" ON public.accounts;
CREATE POLICY "Anyone can view child account"
  ON public.accounts FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. quest_submissions テーブル（子ども側のクエスト報告作成および状況確認用）
DROP POLICY IF EXISTS "Anyone can insert quest submissions" ON public.quest_submissions;
CREATE POLICY "Anyone can insert quest submissions"
  ON public.quest_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view quest submissions" ON public.quest_submissions;
CREATE POLICY "Anyone can view quest submissions"
  ON public.quest_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6. withdrawal_requests テーブル（子ども側の出金・購入申請作成用）
DROP POLICY IF EXISTS "Anyone can insert withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Anyone can insert withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Anyone can view withdrawal requests"
-- 7. transactions テーブル（子ども側の取引履歴・報酬履歴閲覧用）
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
CREATE POLICY "Anyone can view transactions"
  ON public.transactions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert transactions" ON public.transactions;
CREATE POLICY "Anyone can insert transactions"
  ON public.transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 権限付与
GRANT SELECT ON public.families TO anon, authenticated;
GRANT SELECT ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.accounts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quest_submissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.withdrawal_requests TO anon, authenticated;
GRANT SELECT, INSERT ON public.transactions TO anon, authenticated;

SELECT '子どもアクセス用RLSポリシーが正常に設定されました！' AS status;
