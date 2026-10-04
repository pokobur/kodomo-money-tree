// ============================================================
// Supabase クライアント初期化
// 環境変数未設定時はローカルモード（モックデータ）で動作
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

/** Supabase接続情報が設定されているか */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

/** Supabaseクライアント（未設定時はダミー） */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    })
  : (null as unknown as SupabaseClient);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase未設定: ローカルモード（LocalStorage）で動作します。\n' +
    '.envファイルにVITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを設定してください。'
  );
}
