-- ============================================================
-- マネーツリー 🌳 データベース初期化（全データリセット）スクリプト
-- ============================================================
-- 
-- 【注意】
-- Supabase SQL Editor では、テキストの一部を選択（ドラッグ）した状態で
-- 「Run」を押すと「選択された部分だけ」が実行されて構文エラーになります。
-- 必ず【何も文字を選択していない状態（または Cmd+A / Ctrl+A で全選択）】で「Run」を押してください。
-- ============================================================

-- 1. 全テーブルのデータを安全に削除
DELETE FROM public.withdrawal_requests;
DELETE FROM public.wish_items;
DELETE FROM public.transactions;
DELETE FROM public.quest_submissions;
DELETE FROM public.quests;
DELETE FROM public.accounts;
DELETE FROM public.users;
DELETE FROM public.families;

-- 2. （任意）親の Supabase Auth 認証ユーザーもすべて削除したい場合は、
-- 下記の行の先頭の「-- 」を削除して実行してください:
-- DELETE FROM auth.users;

-- ============================================================
-- 3. 初期デモデータの再投入
-- ============================================================

-- デモファミリーの作成（ファミリーコード: DEMO01）
INSERT INTO public.families (id, name, family_code, weekly_interest_rate, max_weekly_reward_limit)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'デモファミリー',
  'DEMO01',
  0.05,
  5000
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  family_code = EXCLUDED.family_code;

-- デモ用の子どもプロファイル（なまえ: たろう, PIN: 1234）
INSERT INTO public.users (id, family_id, role, display_name, pin_code_hash, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'CHILD',
  'たろう',
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  '🧒'
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  pin_code_hash = EXCLUDED.pin_code_hash;

-- デモ用の子ども口座（つかう: 300コイン, 貯金: 1,000コイン）
INSERT INTO public.accounts (child_id, family_id, spending_balance, savings_balance, unclaimed_interest)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  300,
  1000,
  0
) ON CONFLICT (child_id) DO UPDATE SET
  spending_balance = EXCLUDED.spending_balance,
  savings_balance = EXCLUDED.savings_balance;

-- デモ用初期クエストの作成
INSERT INTO public.quests (family_id, title, description, reward_amount, spending_percent, savings_percent, repeat_type, requires_photo, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'しょっきあらい',       'ゆうごはんの おさらを あらおう',         30,  70, 30, 'DAILY',  false, true),
  ('00000000-0000-0000-0000-000000000001', 'おふろそうじ',         'おふろを ピカピカに しよう',             50,  70, 30, 'WEEKLY', false, true),
  ('00000000-0000-0000-0000-000000000001', 'おへやのかたづけ',     'じぶんの おへやを きれいに しよう',       20,  70, 30, 'DAILY',  true,  true),
  ('00000000-0000-0000-0000-000000000001', 'せんたくもの たたみ',  'せんたくものを きれいに たたもう',         40,  60, 40, 'WEEKLY', false, true),
  ('00000000-0000-0000-0000-000000000001', 'テストで100てん',      'テストで 100てんを とったら しゃしんを おくろう', 100, 50, 50, 'ONCE', true,  true)
ON CONFLICT DO NOTHING;

-- 完了メッセージ
SELECT 'マネーツリーのデータベース初期化が正常に完了しました！【デモ用子ども: たろう (PIN: 1234)】' AS status;
