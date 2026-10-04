import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getLocalData, saveLocalData } from './local-data';
import { store } from '../lib/store';

const LAST_CLEANUP_KEY = 'moneytree_last_cleanup_at';
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24時間ごとに1回チェック

export interface CleanupResult {
  submissionsCleaned: number;
  withdrawalsCleaned: number;
  transactionsCleaned: number;
  wishItemsCleaned: number;
}

export const cleanupService = {
  /**
   * 前回の実行から24時間以上経過していれば自動実行
   */
  async checkAndCleanup(force = false): Promise<CleanupResult | null> {
    try {
      const lastCleanup = localStorage.getItem(LAST_CLEANUP_KEY);
      const now = Date.now();

      if (!force && lastCleanup) {
        const lastTime = new Date(lastCleanup).getTime();
        if (now - lastTime < CLEANUP_INTERVAL_MS) {
          // まだ24時間経過していない
          return null;
        }
      }

      const result = await this.performCleanup();
      localStorage.setItem(LAST_CLEANUP_KEY, new Date().toISOString());
      console.log('🧹 [Cleanup] Data cleanup completed:', result);
      return result;
    } catch (err) {
      console.warn('🧹 [Cleanup] Error during data cleanup:', err);
      return null;
    }
  },

  /**
   * 不要な古いデータをクリーンアップ（30日前の完了データ、90日前の取引履歴）
   */
  async performCleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
      submissionsCleaned: 0,
      withdrawalsCleaned: 0,
      transactionsCleaned: 0,
      wishItemsCleaned: 0,
    };

    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

    // 1. ローカルストレージ（LocalStorage）のクリーンアップ
    const local = getLocalData();
    const initialSubsCount = (local.submissions || []).length;
    const initialWdsCount = (local.withdrawals || []).length;
    const initialTxCount = (local.transactions || []).length;
    const initialWishCount = (local.wishItems || []).length;

    // 完了・却下済みで30日以上前のクエスト提出
    local.submissions = (local.submissions || []).filter(s => {
      const isCompleted = s.status === 'APPROVED' || s.status === 'REJECTED';
      const time = s.reviewed_at || s.submitted_at;
      if (isCompleted && time && time < thirtyDaysAgo) {
        return false;
      }
      return true;
    });

    // 完了・却下済みで30日以上前の出金申請
    local.withdrawals = (local.withdrawals || []).filter(w => {
      const isCompleted = w.status === 'APPROVED' || w.status === 'REJECTED';
      if (isCompleted && w.created_at && w.created_at < thirtyDaysAgo) {
        return false;
      }
      return true;
    });

    // 90日以上前の取引履歴
    local.transactions = (local.transactions || []).filter(t => {
      if (t.created_at && t.created_at < ninetyDaysAgo) {
        return false;
      }
      return true;
    });

    // 購入済みで30日以上前のウィッシュアイテム
    local.wishItems = (local.wishItems || []).filter(w => {
      if (w.is_purchased && w.created_at && w.created_at < thirtyDaysAgo) {
        return false;
      }
      return true;
    });

    result.submissionsCleaned += initialSubsCount - local.submissions.length;
    result.withdrawalsCleaned += initialWdsCount - local.withdrawals.length;
    result.transactionsCleaned += initialTxCount - local.transactions.length;
    result.wishItemsCleaned += initialWishCount - local.wishItems.length;

    saveLocalData(local);

    // 2. Supabase のクリーンアップ
    if (isSupabaseConfigured) {
      try {
        // 30日以上前の承認・却下済み提出を削除
        await supabase
          .from('quest_submissions')
          .delete()
          .in('status', ['APPROVED', 'REJECTED'])
          .lt('submitted_at', thirtyDaysAgo);

        // 30日以上前の承認・却下済み出金申請を削除
        await supabase
          .from('withdrawal_requests')
          .delete()
          .in('status', ['APPROVED', 'REJECTED'])
          .lt('created_at', thirtyDaysAgo);

        // 90日以上前の取引履歴を削除
        await supabase
          .from('transactions')
          .delete()
          .lt('created_at', ninetyDaysAgo);

        // 30日以上前の購入済みウィッシュアイテムを削除
        await supabase
          .from('wish_items')
          .delete()
          .eq('is_purchased', true)
          .lt('created_at', thirtyDaysAgo);
      } catch (err) {
        console.warn('🧹 [Cleanup] Supabase cleanup error:', err);
      }
    }

    return result;
  },

  /**
   * データベース・アプリの全データを初期化（完全リセット）
   */
  async resetAllData(): Promise<void> {
    const local = getLocalData();
    const familyId = local.families?.[0]?.id || store.get('family')?.id;

    // 1. Supabaseのデータ削除（接続されている場合、子どものデータと関連履歴を全削除）
    if (isSupabaseConfigured && familyId) {
      try {
        await supabase.from('withdrawal_requests').delete().eq('family_id', familyId);
        await supabase.from('wish_items').delete().eq('family_id', familyId);
        await supabase.from('transactions').delete().eq('family_id', familyId);
        await supabase.from('quest_submissions').delete().eq('family_id', familyId);
        await supabase.from('quests').delete().eq('family_id', familyId);
        await supabase.from('accounts').delete().eq('family_id', familyId);
        await supabase.from('users').delete().eq('family_id', familyId).eq('role', 'CHILD');
      } catch (e) {
        console.warn('🧹 [Reset] Supabase reset warning:', e);
      }
    }

    // 2. ローカルストレージの全データ初期化
    localStorage.removeItem('moneytree_data');
    localStorage.removeItem('moneytree_auth');
    localStorage.removeItem('moneytree_last_cleanup_at');

    // 3. グローバルストアのリセット
    store.reset();

    // 4. Supabase Auth からサインアウト
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
  }
};
