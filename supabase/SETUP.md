# マネーツリー 🌳 Supabase セットアップガイド

## 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) にログイン
2. 「New Project」→ プロジェクト名: `money-tree`
3. リージョン: `Northeast Asia (Tokyo)` 推奨
4. データベースパスワードを控えておく

## 2. 接続情報の設定

プロジェクト作成後、Settings → API から以下の値をコピー:

```bash
# /Users/py./Applications/games/money-tree/.env を作成
cp .env.template .env
```

`.env` ファイルを編集:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...（anon public キー）
```

## 3. SQLマイグレーション実行

Supabase Dashboard → **SQL Editor** → **New Query** で以下を順番に実行:

| 順番 | ファイル | 内容 |
|------|---------|------|
| 1 | `supabase/migrations/01_tables.sql` | テーブル定義（8テーブル + インデックス） |
| 2 | `supabase/migrations/02_rls_policies.sql` | RLSポリシー + ヘルパー関数 |
| 3 | `supabase/migrations/03_functions_triggers.sql` | ストアドプロシージャ + トリガー |
| 4 | `supabase/migrations/04_realtime_storage_cron.sql` | Realtime / Storage / pg_cron / シード |

> ⚠️ **必ず1→2→3→4の順に実行してください**（外部キー依存関係があります）

## 4. Auth 設定

### Email/Password 認証（親用）
Dashboard → Authentication → Providers → Email:
- **Enable Email provider**: ON
- **Confirm email**: OFF（開発時。本番はON推奨）

### Google OAuth（オプション）
Dashboard → Authentication → Providers → Google:
- Google Cloud Console で OAuth Client ID を作成
- Client ID と Secret を入力
- Redirect URL: `https://xxxxxxxxxx.supabase.co/auth/v1/callback`

## 5. Extensions 確認

Dashboard → Database → Extensions:
- `pgcrypto`: ON（PINハッシュ化に使用。通常デフォルトON）
- `pg_cron`: ON（週利自動計算。**Pro Plan以上のみ**）

> 💡 Free Plan で `pg_cron` が使えない場合でも、クライアントサイドの
> `interestService.checkAndCalculateInterest()` が画面表示時にフォールバック計算します。

## 6. 動作確認

```bash
cd /Users/py./Applications/games/money-tree
npm run dev
```

ブラウザで `http://localhost:5173/` を開き:

1. **親アカウント登録**: メールアドレスとパスワードで登録
2. **こども追加**: ダッシュボード → こども管理 → 子どもを追加（PIN設定）
3. **ファミリーコード確認**: 設定画面でコードを確認
4. **子どもログイン**: 別のブラウザ/シークレットウィンドウ → おこさまログイン → ファミリーコード + PIN

## テーブル構造

```
families ─┬── users (PARENT/CHILD)
          │     └── accounts (1:1, CHILD only)
          ├── quests
          │     └── quest_submissions
          ├── transactions
          ├── wish_items
          └── withdrawal_requests
```

## デモデータ

`04_realtime_storage_cron.sql` にデモ用シードデータが含まれています:
- ファミリーコード: `DEMO01`
- サンプルクエスト5件

デモデータを使う場合は、親ユーザーを登録後に `users` テーブルで
`family_id` を `00000000-0000-0000-0000-000000000001` に手動設定してください。
