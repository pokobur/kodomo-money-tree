import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { store } from '../lib/store';
import type { WithdrawalRequest, Account } from '../types/models';
import { getLocalData, saveLocalData, generateId } from './local-data';
import { wishService } from './wish.service';

export const withdrawalService = {
  async createWithdrawalRequest(childId: string, familyId: string, amount: number, purpose: string, sourceAccount: 'SPENDING' | 'SAVINGS'): Promise<WithdrawalRequest> {
    const data = getLocalData();
    let account = data.accounts?.find(a => a.child_id === childId);
    if (!account && isSupabaseConfigured) {
      try {
        const { data: remoteAcc } = await supabase.from('accounts').select('*').eq('child_id', childId).single();
        if (remoteAcc) account = remoteAcc as Account;
      } catch (err) {
        console.warn('fetch account error:', err);
      }
    }
    if (account) {
      const currentBalance = sourceAccount === 'SPENDING'
        ? (account.spending_balance || 0)
        : (account.savings_balance || 0);
      if (currentBalance < amount) {
        const accName = sourceAccount === 'SPENDING' ? 'つかえるおかね' : 'ちょきん';
        throw new Error(`${accName}が たりないよ！（いまののこり: ${currentBalance}コイン）`);
      }
    }

    const newRequest: WithdrawalRequest = {
      id: generateId(),
      child_id: childId,
      family_id: familyId,
      amount,
      purpose,
      source_account: sourceAccount,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('withdrawal_requests')
          .insert([{
            child_id: childId,
            family_id: familyId,
            amount,
            purpose,
            source_account: sourceAccount,
            status: 'PENDING'
          }])
          .select()
          .single();
        if (!error && data) {
          Object.assign(newRequest, data);
        }
      } catch (err) {
        console.warn('createWithdrawalRequest (Supabase) error, saved locally:', err);
      }
    }

    if (!Array.isArray(data.withdrawals)) data.withdrawals = [];
    data.withdrawals.push(newRequest);
    saveLocalData(data);
    return newRequest;
  },

  async getWithdrawals(id: string): Promise<WithdrawalRequest[]> {
    const local = getLocalData();
    const deletedIds = new Set(local.deletedChildIds || []);
    const localFamilyWithdrawals = (local.withdrawals || []).filter(w => (w.child_id === id || w.family_id === id) && !deletedIds.has(w.child_id));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .or(`child_id.eq.${id},family_id.eq.${id}`)
          .order('created_at', { ascending: false });
        if (!error && data) {
          local.withdrawals = (local.withdrawals || []).filter(w => !deletedIds.has(w.child_id));
          const validData = (data as WithdrawalRequest[]).filter(w => !deletedIds.has(w.child_id));
          validData.forEach((remoteW: WithdrawalRequest) => {
            const idx = local.withdrawals.findIndex(w => w.id === remoteW.id);
            if (idx >= 0) local.withdrawals[idx] = remoteW;
            else local.withdrawals.push(remoteW);
          });
          saveLocalData(local, false);

          const remoteIds = new Set(validData.map(w => w.id));
          const localOnly = localFamilyWithdrawals.filter(w => !remoteIds.has(w.id));
          const merged = [...validData, ...localOnly];
          return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (err) {
        console.warn('getWithdrawals (Supabase) error, fallback to local:', err);
      }
    }
    return localFamilyWithdrawals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getPendingWithdrawals(familyId: string): Promise<WithdrawalRequest[]> {
    const data = getLocalData();
    const deletedIds = new Set(data.deletedChildIds || []);
    const localList = (Array.isArray(data.withdrawals) ? data.withdrawals : [])
      .filter(w => w.family_id === familyId && (w.status === 'PENDING' || w.status === 'COOLDOWN') && !deletedIds.has(w.child_id));

    if (isSupabaseConfigured) {
      try {
        const { data: remoteData, error } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('family_id', familyId)
          .in('status', ['PENDING', 'COOLDOWN']);
        if (!error && remoteData) {
          const validRemote = (remoteData as WithdrawalRequest[]).filter(w => !deletedIds.has(w.child_id));
          const remoteIds = new Set(validRemote.map(w => w.id));
          const localOnly = localList.filter(w => !remoteIds.has(w.id));
          const merged = [...validRemote, ...localOnly];
          return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (err) {
        console.warn('getPendingWithdrawals (Supabase) error, fallback to local:', err);
      }
    }
    return localList;
  },

  async cancelWithdrawal(requestId: string): Promise<void> {
    const data = getLocalData();
    if (!Array.isArray(data.withdrawals)) data.withdrawals = [];
    const req = data.withdrawals.find(w => w.id === requestId);
    if (req) {
      req.status = 'REJECTED';
      saveLocalData(data);
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('withdrawal_requests')
          .update({ status: 'REJECTED' })
          .eq('id', requestId);
      } catch (err) {
        console.warn('cancelWithdrawal (Supabase) error, completed locally:', err);
      }
    }
  },

  async checkCooldownExpiry(request: WithdrawalRequest): Promise<number> {
    // クールダウン機能廃止のため、常に0（即時PENDING扱い）
    return 0;
  },

  async approveWithdrawal(requestId: string): Promise<void> {
    const data = getLocalData();
    if (!Array.isArray(data.withdrawals)) data.withdrawals = [];
    if (!Array.isArray(data.accounts)) data.accounts = [];
    if (!Array.isArray(data.transactions)) data.transactions = [];

    let request = data.withdrawals.find(w => w.id === requestId);
    if (!request && isSupabaseConfigured) {
      try {
        const { data: remoteW } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        if (remoteW) {
          request = remoteW as WithdrawalRequest;
          data.withdrawals.push(request);
        }
      } catch (e) {
        console.warn('approveWithdrawal: fetch request error', e);
      }
    }

    let account = data.accounts.find(a => a.child_id === request?.child_id);
    if (isSupabaseConfigured && request?.child_id) {
      try {
        const { data: remoteAcc } = await supabase
          .from('accounts')
          .select('*')
          .eq('child_id', request.child_id)
          .single();
        if (remoteAcc) {
          account = remoteAcc as Account;
          const aIdx = data.accounts.findIndex(a => a.child_id === request!.child_id);
          if (aIdx >= 0) data.accounts[aIdx] = account;
          else data.accounts.push(account);
        }
      } catch (e) {
        console.warn('approveWithdrawal: fetch account error', e);
      }
    }

    if (!request) {
      throw new Error('出金リクエストが見つかりません');
    }

    if (!account) {
      throw new Error('口座情報が見つかりません');
    }

    const currentBalance = request.source_account === 'SPENDING'
      ? (account.spending_balance || 0)
      : (account.savings_balance || 0);

    if (currentBalance < request.amount) {
      const accName = request.source_account === 'SPENDING' ? 'つかえるお金' : '貯金';
      throw new Error(`${accName}の残高が足りないため承認できません（残高: ${currentBalance}コイン、出金額: ${request.amount}コイン）`);
    }

    const now = new Date().toISOString();

    request.status = 'APPROVED';

    if (request.source_account === 'SPENDING') {
      account.spending_balance = (account.spending_balance || 0) - request.amount;
    } else {
      account.savings_balance = (account.savings_balance || 0) - request.amount;
    }

      const cleanPurpose = request.purpose.replace(/\[[^\]]+\]/, '').trim();
      const txTitle = cleanPurpose.startsWith('ほしいもの購入') ? cleanPurpose : `出金: ${cleanPurpose}`;

      data.transactions.push({
        id: generateId(),
        child_id: account.child_id,
        family_id: account.family_id,
        amount: -request.amount,
        type: 'WITHDRAW',
        target_account: request.source_account,
        title: txTitle,
        created_at: now
      });

    // ほしいもの購入リクエストの場合、対象アイテムを自動削除
    const wishMatch = request?.purpose?.match(/\[([a-zA-Z0-9_-]+)\]/);
    if (wishMatch && wishMatch[1]) {
      const wishId = wishMatch[1];
      if (Array.isArray(data.wishItems)) {
        data.wishItems = data.wishItems.filter(w => w.id !== wishId);
      }
      try {
        await wishService.deleteWishItem(wishId);
      } catch (err) {
        console.warn('Failed to delete wish item on approval:', err);
      }
      const currentStoreWishes = store.getState()?.wishItems;
      if (currentStoreWishes) {
        store.set('wishItems', currentStoreWishes.filter((w: any) => w.id !== wishId));
      }
    }

    saveLocalData(data);

    // グローバルストアのaccountsも即座に同期
    const storeAccounts = store.get('accounts');
    if (Array.isArray(storeAccounts) && account) {
      const idx = storeAccounts.findIndex(a => a.child_id === account!.child_id || a.id === account!.id);
      if (idx >= 0) {
        storeAccounts[idx] = { ...account };
        store.set('accounts', [...storeAccounts]);
      } else {
        store.set('accounts', [...storeAccounts, { ...account }]);
      }
    }

    if (isSupabaseConfigured && request && account) {
      try {
        await supabase.from('withdrawal_requests').update({
          status: 'APPROVED'
        }).eq('id', requestId);

        const balanceField = request.source_account === 'SPENDING' ? 'spending_balance' : 'savings_balance';
        const { error: accErr } = await supabase.from('accounts').update({
          [balanceField]: account[balanceField]
        }).eq('id', account.id);

        if (accErr && account.child_id) {
          await supabase.from('accounts').update({
            [balanceField]: account[balanceField]
          }).eq('child_id', account.child_id);
        }

        const cleanPurpose = request.purpose.replace(/\[[^\]]+\]/, '').trim();
        const txTitle = cleanPurpose.startsWith('ほしいもの購入') ? cleanPurpose : `出金: ${cleanPurpose}`;

        await supabase.from('transactions').insert([{
          child_id: account.child_id,
          family_id: account.family_id,
          amount: -request.amount,
          type: 'WITHDRAW',
          target_account: request.source_account,
          title: txTitle,
          created_at: now
        }]);
      } catch (err) {
        console.warn('approveWithdrawal (Supabase) error, completed locally:', err);
      }
    }
  },

  async rejectWithdrawal(requestId: string, comment?: string): Promise<void> {
    const data = getLocalData();
    if (!Array.isArray(data.withdrawals)) data.withdrawals = [];

    let req = data.withdrawals.find(w => w.id === requestId);
    if (!req && isSupabaseConfigured) {
      try {
        const { data: remoteW } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        if (remoteW) {
          req = remoteW as WithdrawalRequest;
          data.withdrawals.push(req);
        }
      } catch (e) {
        console.warn('rejectWithdrawal: fetch request error', e);
      }
    }

    if (req) {
      req.status = 'REJECTED';
      req.parent_comment = comment;
      saveLocalData(data);
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('withdrawal_requests')
          .update({ status: 'REJECTED', parent_comment: comment })
          .eq('id', requestId);
        if (error) {
          // カラムがない場合のフォールバック
          await supabase
            .from('withdrawal_requests')
            .update({ status: 'REJECTED' })
            .eq('id', requestId);
        }
      } catch (err) {
        console.warn('rejectWithdrawal (Supabase) error, completed locally:', err);
      }
    }
  },

  subscribeToWithdrawals(_id: string, callback: () => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    try {
      const channel = supabase.channel(`withdrawals_changes_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, callback)
        .subscribe();
      return {
        unsubscribe: () => {
          try { supabase.removeChannel(channel); } catch {}
        }
      };
    } catch {
      return { unsubscribe: () => {} };
    }
  }
};
