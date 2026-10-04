import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { store } from '../lib/store';
import type { Account, Transaction } from '../types/models';
import { getLocalData, saveLocalData, generateId } from './local-data';

export const accountService = {
  async getAccount(childId: string): Promise<Account | null> {
    const local = getLocalData();
    const localAcc = local.accounts?.find(a => a.child_id === childId);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('child_id', childId)
          .single();
        if (!error && data) {
          const remoteAcc = data as Account;
          
          if (localAcc) {
            const localTotal = (localAcc.spending_balance || 0) + (localAcc.savings_balance || 0);
            const remoteTotal = (remoteAcc.spending_balance || 0) + (remoteAcc.savings_balance || 0);

            // 1. ローカルに残高がありリモートが0の場合（Supabase RLS等で未反映）、ローカル値を保持
            if (localTotal > 0 && remoteTotal === 0) {
              remoteAcc.spending_balance = localAcc.spending_balance;
              remoteAcc.savings_balance = localAcc.savings_balance;
              if ((localAcc as any)._local_transfer_at) {
                (remoteAcc as any)._local_transfer_at = (localAcc as any)._local_transfer_at;
              }
            } else if ((localAcc as any)._local_transfer_at) {
              // 2. ローカルで最近行われた「おかねを うつす」の配分を保護
              const diff = remoteTotal - localTotal;
              if (diff === 0) {
                remoteAcc.spending_balance = localAcc.spending_balance;
                remoteAcc.savings_balance = localAcc.savings_balance;
              } else if (diff > 0) {
                // リモート側で新たな入金（お手伝い承認等）があった場合はつかえるお金に反映
                remoteAcc.spending_balance = (localAcc.spending_balance || 0) + diff;
                remoteAcc.savings_balance = localAcc.savings_balance;
              }
              (remoteAcc as any)._local_transfer_at = (localAcc as any)._local_transfer_at;
            }

            // 3. 子ども個別金利・スケジュールの保持（リモートがnullの場合）
            if (remoteAcc.weekly_interest_rate == null && localAcc.weekly_interest_rate != null) {
              remoteAcc.weekly_interest_rate = localAcc.weekly_interest_rate;
            }
            if (remoteAcc.max_weekly_reward_limit == null && localAcc.max_weekly_reward_limit != null) {
              remoteAcc.max_weekly_reward_limit = localAcc.max_weekly_reward_limit;
            }
            if (!remoteAcc.interest_schedule_type && localAcc.interest_schedule_type) {
              remoteAcc.interest_schedule_type = localAcc.interest_schedule_type;
            }
            if (remoteAcc.interest_schedule_day == null && localAcc.interest_schedule_day != null) {
              remoteAcc.interest_schedule_day = localAcc.interest_schedule_day;
            }
          }

          // ローカルも更新（emitEvent: false で内部キャッシュ更新時の無限再帰を防止）
          if (!Array.isArray(local.accounts)) local.accounts = [];
          const idx = local.accounts.findIndex(a => a.child_id === childId);
          if (idx >= 0) local.accounts[idx] = remoteAcc;
          else local.accounts.push(remoteAcc);
          saveLocalData(local, false);
          return remoteAcc;
        }
      } catch (err) {
        console.warn('getAccount (Supabase) error, fallback to local:', err);
      }
    }
    return localAcc || null;
  },

  async getAccountsForFamily(familyId: string): Promise<Account[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('family_id', familyId);
        if (!error && data) {
          const local = getLocalData();
          if (!Array.isArray(local.accounts)) local.accounts = [];
          
          const mergedAccounts: Account[] = (data as Account[]).map((remoteA: Account) => {
            const localAcc = local.accounts.find(a => a.id === remoteA.id || a.child_id === remoteA.child_id);
            if (localAcc) {
              // 1. 最近の振替（お金をうつす）保護
              if ((localAcc as any)._local_transfer_at) {
                const timeSinceTransfer = Date.now() - (localAcc as any)._local_transfer_at;
                const localTotal = (localAcc.spending_balance || 0) + (localAcc.savings_balance || 0);
                const remoteTotal = (remoteA.spending_balance || 0) + (remoteA.savings_balance || 0);
                if (timeSinceTransfer < 300000 && localTotal === remoteTotal) {
                  remoteA.spending_balance = localAcc.spending_balance;
                  remoteA.savings_balance = localAcc.savings_balance;
                  (remoteA as any)._local_transfer_at = (localAcc as any)._local_transfer_at;
                }
              }
              // 2. ローカルに残高がありリモートが0の場合（Supabase RLS等で未反映）はローカル値を保持
              const localTotal = (localAcc.spending_balance || 0) + (localAcc.savings_balance || 0);
              const remoteTotal = (remoteA.spending_balance || 0) + (remoteA.savings_balance || 0);
              if (localTotal > 0 && remoteTotal === 0) {
                remoteA.spending_balance = localAcc.spending_balance;
                remoteA.savings_balance = localAcc.savings_balance;
              }
              // 3. 子ども個別金利設定・スケジュールのマージ
              if (remoteA.weekly_interest_rate == null && localAcc.weekly_interest_rate != null) {
                remoteA.weekly_interest_rate = localAcc.weekly_interest_rate;
              }
              if (remoteA.max_weekly_reward_limit == null && localAcc.max_weekly_reward_limit != null) {
                remoteA.max_weekly_reward_limit = localAcc.max_weekly_reward_limit;
              }
              if (!remoteA.interest_schedule_type && localAcc.interest_schedule_type) {
                remoteA.interest_schedule_type = localAcc.interest_schedule_type;
              }
              if (remoteA.interest_schedule_day == null && localAcc.interest_schedule_day != null) {
                remoteA.interest_schedule_day = localAcc.interest_schedule_day;
              }
            }
            return remoteA;
          });

          const deletedIds = new Set(local.deletedChildIds || []);
          local.accounts = local.accounts.filter(a => !deletedIds.has(a.child_id));
          const validMergedAccounts = mergedAccounts.filter(acc => !deletedIds.has(acc.child_id));

          // ローカル口座リストを同期
          validMergedAccounts.forEach(acc => {
            const idx = local.accounts.findIndex(a => a.id === acc.id || a.child_id === acc.child_id);
            if (idx >= 0) local.accounts[idx] = acc;
            else local.accounts.push(acc);
          });

          // リモートにまだないローカル専用口座があれば補完
          const localOnly = local.accounts.filter(
            la => (!familyId || la.family_id === familyId) && !validMergedAccounts.some(ma => ma.id === la.id || ma.child_id === la.child_id)
          );
          const finalAccounts = [...validMergedAccounts, ...localOnly];
          saveLocalData(local, false);
          return finalAccounts;
        }
      } catch (err) {
        console.warn('getAccountsForFamily (Supabase) error, fallback to local:', err);
      }
    }
    const data = getLocalData();
    const deletedIds = new Set(data.deletedChildIds || []);
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    return accounts.filter(a => (!familyId || a.family_id === familyId) && !deletedIds.has(a.child_id));
  },

  async getTransactions(childId: string, limit: number = 50): Promise<Transaction[]> {
    const data = getLocalData();
    const localTxs = (data.transactions || [])
      .filter((t: any) => t.child_id === childId);

    const txMap = new Map<string, Transaction>();
    localTxs.forEach(t => txMap.set(t.id, t));

    if (isSupabaseConfigured) {
      try {
        const { data: remoteData, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('child_id', childId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (!error && remoteData && remoteData.length > 0) {
          remoteData.forEach((t: any) => txMap.set(t.id, t));

          // ローカルキャッシュにも反映
          let modified = false;
          remoteData.forEach((t: any) => {
            if (!data.transactions.some(lt => lt.id === t.id)) {
              data.transactions.push(t);
              modified = true;
            }
          });
          if (modified) saveLocalData(data, false);
        }
      } catch (err) {
        console.warn('getTransactions (Supabase) error, fallback to local:', err);
      }
    }

    // ストア内の transactions も統合
    const storeTxs = (store.get('transactions') || []).filter((t: any) => t.child_id === childId);
    storeTxs.forEach((t: any) => txMap.set(t.id, t));

    return Array.from(txMap.values())
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  },

  async adjustBalance(childId: string, targetAccount: 'SPENDING' | 'SAVINGS', amount: number, title: string): Promise<void> {
    const data = getLocalData();
    let account = data.accounts?.find(a => a.child_id === childId);
    if (!account && isSupabaseConfigured) {
      account = await this.getAccount(childId) || undefined;
    }
    if (!account) throw new Error('口座が見つかりません');

    const balanceField = targetAccount === 'SPENDING' ? 'spending_balance' : 'savings_balance';
    if (amount < 0 && (account[balanceField] || 0) + amount < 0) {
      const accName = targetAccount === 'SPENDING' ? 'つかえるお金' : 'ちょきん';
      throw new Error(`${accName}が たりないよ！`);
    }

    const now = new Date().toISOString();

    account[balanceField] = (account[balanceField] || 0) + amount;
    data.transactions.push({
      id: generateId(),
      child_id: account.child_id,
      family_id: account.family_id,
      amount,
      type: amount >= 0 ? 'ADJUSTMENT' : 'WITHDRAW',
      target_account: targetAccount,
      title,
      created_at: now
    });
    saveLocalData(data);

    if (isSupabaseConfigured && account) {
      try {
        await supabase.from('accounts').update({
          [balanceField]: account[balanceField]
        }).eq('id', account.id);

        await supabase.from('transactions').insert([{
          child_id: account.child_id,
          family_id: account.family_id,
          amount,
          type: amount >= 0 ? 'ADJUSTMENT' : 'WITHDRAW',
          target_account: targetAccount,
          title,
          created_at: now
        }]);
      } catch (err) {
        console.warn('adjustBalance (Supabase) error, completed locally:', err);
      }
    }
  },

  async transferMoney(
    childId: string,
    direction: 'SPENDING_TO_SAVINGS' | 'SAVINGS_TO_SPENDING',
    amount: number
  ): Promise<Account> {
    const data = getLocalData();
    if (!Array.isArray(data.accounts)) data.accounts = [];
    if (!Array.isArray(data.transactions)) data.transactions = [];

    let account = data.accounts.find(a => a.child_id === childId);
    const storeAcc = store.get('account');
    if (!account && storeAcc && storeAcc.child_id === childId) {
      account = { ...storeAcc };
    }
    if (account && storeAcc && storeAcc.child_id === childId) {
      const accTotal = (account.spending_balance || 0) + (account.savings_balance || 0);
      const storeTotal = (storeAcc.spending_balance || 0) + (storeAcc.savings_balance || 0);
      if (storeTotal > accTotal) {
        account.spending_balance = storeAcc.spending_balance;
        account.savings_balance = storeAcc.savings_balance;
      }
    }
    if (!account && isSupabaseConfigured) {
      account = await this.getAccount(childId) || undefined;
    }
    if (!account) throw new Error('口座が見つかりません');

    if (direction === 'SPENDING_TO_SAVINGS') {
      if ((account.spending_balance || 0) < amount) {
        throw new Error('つかえるお金が たりないよ！');
      }
      account.spending_balance = (account.spending_balance || 0) - amount;
      account.savings_balance = (account.savings_balance || 0) + amount;
    } else {
      if ((account.savings_balance || 0) < amount) {
        throw new Error('ちょきんが たりないよ！');
      }
      account.savings_balance = (account.savings_balance || 0) - amount;
      account.spending_balance = (account.spending_balance || 0) + amount;
    }

    // ローカル移動タイムスタンプを付与（古いリモートによる上書きを防止）
    (account as any)._local_transfer_at = Date.now();

    const now = new Date().toISOString();
    const tOut: Transaction = {
      id: generateId(),
      child_id: account.child_id,
      family_id: account.family_id,
      amount: -amount,
      type: 'ADJUSTMENT',
      target_account: direction === 'SPENDING_TO_SAVINGS' ? 'SPENDING' : 'SAVINGS',
      title: direction === 'SPENDING_TO_SAVINGS' ? 'ちょきんばこへ うつしたよ' : 'つかえるおかねへ うつしたよ',
      created_at: now
    };
    const tIn: Transaction = {
      id: generateId(),
      child_id: account.child_id,
      family_id: account.family_id,
      amount: amount,
      type: 'ADJUSTMENT',
      target_account: direction === 'SPENDING_TO_SAVINGS' ? 'SAVINGS' : 'SPENDING',
      title: direction === 'SPENDING_TO_SAVINGS' ? 'つかえるおかねから うつしたよ' : 'ちょきんばこから うつしたよ',
      created_at: now
    };

    // ローカル口座と取引を確実に保存
    const aIdx = data.accounts.findIndex(a => a.child_id === childId || a.id === account!.id);
    if (aIdx >= 0) {
      data.accounts[aIdx] = { ...account };
    } else {
      data.accounts.push({ ...account });
    }
    data.transactions.push(tOut, tIn);
    saveLocalData(data);

    // グローバルストアの account も即時同期
    store.set('account', { ...account });

    // 親画面用の accounts 配列がある場合も同期
    const storeAccounts = store.get('accounts');
    if (Array.isArray(storeAccounts)) {
      const idx = storeAccounts.findIndex(a => a.child_id === childId || a.id === account!.id);
      if (idx >= 0) {
        storeAccounts[idx] = { ...account };
        store.set('accounts', [...storeAccounts]);
      }
    }

    // Supabase同期を試行（RPC または テーブル直接更新）
    if (isSupabaseConfigured && account) {
      try {
        // 1. RPC関数 transfer_money があれば最優先で実行
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('transfer_money', {
          p_child_id: childId,
          p_direction: direction,
          p_amount: amount
        });

        if (rpcErr || !rpcRes?.success) {
          // 2. RPCがない場合はテーブル直接更新を試行
          const { error: updateErr } = await supabase.from('accounts').update({
            spending_balance: account.spending_balance,
            savings_balance: account.savings_balance
          }).eq('id', account.id);

          if (!updateErr) {
            await supabase.from('transactions').insert([
              { child_id: tOut.child_id, family_id: tOut.family_id, amount: tOut.amount, type: tOut.type, target_account: tOut.target_account, title: tOut.title, created_at: now },
              { child_id: tIn.child_id, family_id: tIn.family_id, amount: tIn.amount, type: tIn.type, target_account: tIn.target_account, title: tIn.title, created_at: now }
            ]);
          } else {
            console.warn('transferMoney (Supabase update) blocked by policy or failed, maintained locally:', updateErr.message);
          }
        }
      } catch (err) {
        console.warn('transferMoney (Supabase) exception, maintained locally:', err);
      }
    }

    return { ...account };
  },

  subscribeToAccount(childId: string, callback: (account: Account) => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    try {
      const channel = supabase.channel(`account_changes_${childId}_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `child_id=eq.${childId}` }, (payload) => {
          if (payload.new) {
            const raw = payload.new as Account;
            const localAcc = getLocalData().accounts?.find(a => a.child_id === childId);
            if (localAcc) {
              const localTotal = (localAcc.spending_balance || 0) + (localAcc.savings_balance || 0);
              const remoteTotal = (raw.spending_balance || 0) + (raw.savings_balance || 0);
              if (localTotal > 0 && remoteTotal === 0) {
                raw.spending_balance = localAcc.spending_balance;
                raw.savings_balance = localAcc.savings_balance;
              } else if ((localAcc as any)._local_transfer_at) {
                if (localTotal === remoteTotal) {
                  raw.spending_balance = localAcc.spending_balance;
                  raw.savings_balance = localAcc.savings_balance;
                }
              }
            }
            callback(raw);
          }
        })
        .subscribe();
      return {
        unsubscribe: () => {
          try { supabase.removeChannel(channel); } catch {}
        }
      };
    } catch {
      return { unsubscribe: () => {} };
    }
  },

  subscribeToFamilyAccounts(familyId: string, callback: () => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    try {
      const channel = supabase.channel(`family_accounts_${familyId}_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `family_id=eq.${familyId}` }, () => {
          callback();
        })
        .subscribe();
      return {
        unsubscribe: () => {
          try { supabase.removeChannel(channel); } catch {}
        }
      };
    } catch {
      return { unsubscribe: () => {} };
    }
  },

  /** 子どもごとの金利ルール・上限設定を更新 */
  async updateChildAccountSettings(
    childId: string,
    settings: {
      weekly_interest_rate?: number;
      max_weekly_reward_limit?: number;
      interest_schedule_type?: 'WEEKLY' | 'MONTHLY';
      interest_schedule_day?: number;
    }
  ): Promise<Account | null> {
    const local = getLocalData();
    if (!Array.isArray(local.accounts)) local.accounts = [];
    if (!Array.isArray(local.users)) local.users = [];

    let account = local.accounts.find(a => a.child_id === childId);
    if (!account) {
      account = {
        id: generateId(),
        child_id: childId,
        family_id: store.get('family')?.id || '',
        spending_balance: 0,
        savings_balance: 0,
        last_interest_calculated_at: new Date().toISOString(),
        unclaimed_interest: 0,
        ...settings
      };
      local.accounts.push(account);
    } else {
      Object.assign(account, settings);
    }

    const user = local.users.find(u => u.id === childId);
    if (user) {
      Object.assign(user, settings);
    }

    saveLocalData(local);

    // グローバルストア更新
    const currentChildAcc = store.get('account');
    if (currentChildAcc && currentChildAcc.child_id === childId) {
      store.set('account', { ...account });
    }
    const storeAccounts = store.get('accounts');
    if (Array.isArray(storeAccounts)) {
      const idx = storeAccounts.findIndex(a => a.child_id === childId);
      if (idx >= 0) {
        storeAccounts[idx] = { ...account };
        store.set('accounts', [...storeAccounts]);
      } else {
        store.set('accounts', [...storeAccounts, { ...account }]);
      }
    }
    const storeChildren = store.get('children');
    if (Array.isArray(storeChildren)) {
      const cIdx = storeChildren.findIndex(c => c.id === childId);
      if (cIdx >= 0) {
        storeChildren[cIdx] = { ...storeChildren[cIdx], ...settings };
        store.set('children', [...storeChildren]);
      }
    }

    // Supabaseに反映を試行
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('accounts').update(settings).eq('child_id', childId);
        if (error) {
          // スケジュール設定カラムがない場合は基本金利カラムのみ更新を試行
          await supabase.from('accounts').update({
            weekly_interest_rate: settings.weekly_interest_rate,
            max_weekly_reward_limit: settings.max_weekly_reward_limit,
          }).eq('child_id', childId);
        }
      } catch (e) {
        console.warn('updateChildAccountSettings (Supabase accounts) error:', e);
      }
    }

    return { ...account };
  }
};
