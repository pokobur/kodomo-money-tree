-- ============================================================
-- マネーツリー Supabase マイグレーション
-- Step 4: Realtime / Storage / pg_cron / シードデータ (修正版)
-- ============================================================

-- ============================================================
-- 1. Realtime 有効化
--    Supabase Realtime で変更をサブスクライブするテーブル
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;

-- ============================================================
-- 2. Storage バケット作成（クエスト写真アップロード用）
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quest-photos',
  'quest-photos',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: 認証済みユーザーがアップロード可能
CREATE POLICY "Authenticated users can upload quest photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quest-photos');

-- Storage RLS: 全員が閲覧可能（publicバケット）
CREATE POLICY "Anyone can view quest photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quest-photos');

-- Storage RLS: アップロード者本人のみ削除可能
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quest-photos' AND (auth.uid()::text) = (storage.foldername(name))[1]);

-- ============================================================
-- 3. pg_cron ジョブ設定
--
-- ※ pg_cron 拡張機能が有効な場合のみスケジュール登録します。
--    Free Plan 等で pg_cron がない場合でも安全にスキップされます。
-- ============================================================
DO $cron_block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    EXECUTE 'SELECT cron.schedule(''weekly-interest-calculation'', ''0 18 * * 6'', ''SELECT public.calculate_weekly_interest()'')';
    EXECUTE 'SELECT cron.schedule(''cooldown-transition'', ''0 * * * *'', ''SELECT public.transition_cooldown_to_pending()'')';
    RAISE NOTICE 'pg_cron jobs scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron is not enabled. Skipping cron schedule (client-side fallback is active).';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped cron scheduling: %', SQLERRM;
END $cron_block$;

-- ============================================================
-- 4. デモ用シードデータ（オプション）
-- ============================================================

-- デモファミリー作成
INSERT INTO public.families (id, name, family_code, weekly_interest_rate, max_weekly_reward_limit)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'デモファミリー',
  'DEMO01',
  0.05,
  5000
)
ON CONFLICT (id) DO NOTHING;

-- デモ用クエスト
INSERT INTO public.quests (family_id, title, description, reward_amount, spending_percent, savings_percent, repeat_type, requires_photo) VALUES
  ('00000000-0000-0000-0000-000000000001', 'しょっきあらい',       'ゆうごはんの おさらを あらおう',         30,  70, 30, 'DAILY',  false),
  ('00000000-0000-0000-0000-000000000001', 'おふろそうじ',         'おふろを ピカピカに しよう',             50,  70, 30, 'WEEKLY', false),
  ('00000000-0000-0000-0000-000000000001', 'おへやのかたづけ',     'じぶんの おへやを きれいに しよう',       20,  70, 30, 'DAILY',  true),
  ('00000000-0000-0000-0000-000000000001', 'せんたくもの たたみ',  'せんたくものを きれいに たたもう',         40,  60, 40, 'WEEKLY', false),
  ('00000000-0000-0000-0000-000000000001', 'テストで100てん',      'テストで 100てんを とったら しゃしんを おくろう', 100, 50, 50, 'ONCE', true)
ON CONFLICT DO NOTHING;
