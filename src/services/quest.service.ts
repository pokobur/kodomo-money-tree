import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { store } from '../lib/store';
import type { Quest, QuestSubmission, Transaction, Account } from '../types/models';
import { getLocalData, saveLocalData, generateId } from './local-data';

export const questService = {
  /** 有効なクエストのみ取得（子ども画面・ホーム画面用） */
  async getQuests(familyId: string): Promise<Quest[]> {
    const local = getLocalData();
    const localQuests = Array.isArray(local.quests) ? local.quests.filter(q => q.family_id === familyId) : [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('quests')
          .select('*')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          // リモートが0件（子どもの未認証RLS等）だがローカルにクエストがある場合、ローカルのクエストを保護
          if (data.length === 0 && localQuests.length > 0) {
            return localQuests.filter(q => q.is_active === true);
          }

          if (data.length > 0) {
            const otherQuests = (local.quests || []).filter(q => q.family_id !== familyId);
            const localOnly = localQuests.filter(lq => !(data as Quest[]).some(rq => rq.id === lq.id));
            const merged = [...(data as Quest[]), ...localOnly];
            local.quests = [...otherQuests, ...merged];
            saveLocalData(local, false);
            return merged.filter(q => q.is_active === true);
          }
        }
      } catch (err) {
        console.warn('getQuests (Supabase) error, fallback to local:', err);
      }
    }
    return localQuests.filter(q => q.is_active === true);
  },

  /** 全クエスト取得（有効・無効の両方、親管理画面用） */
  async getAllQuests(familyId: string): Promise<Quest[]> {
    const local = getLocalData();
    const localQuests = Array.isArray(local.quests) ? local.quests.filter(q => q.family_id === familyId) : [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('quests')
          .select('*')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          // リモートが0件（子どもの未認証RLS等）だがローカルにクエストがある場合、ローカルを保護
          if (data.length === 0 && localQuests.length > 0) {
            return localQuests;
          }

          if (data.length > 0) {
            const otherQuests = (local.quests || []).filter(q => q.family_id !== familyId);
            const localOnly = localQuests.filter(lq => !(data as Quest[]).some(rq => rq.id === lq.id));
            const merged = [...(data as Quest[]), ...localOnly];
            local.quests = [...otherQuests, ...merged];
            saveLocalData(local, false);
            return merged;
          }
        }
      } catch (err) {
        console.warn('getAllQuests (Supabase) error, fallback to local:', err);
      }
    }
    return localQuests;
  },

  async getQuestsForChild(familyId: string, childId?: string): Promise<Quest[]> {
    const all = await this.getQuests(familyId);
    if (!childId) return all;
    return all.filter(q => !q.assigned_child_id || q.assigned_child_id === childId);
  },

  async createQuest(quest: Partial<Quest>): Promise<Quest> {
    const localData = getLocalData();
    if (!Array.isArray(localData.quests)) localData.quests = [];

    const newQuest: Quest = {
      ...(quest as any),
      id: quest.id || generateId(),
      is_active: quest.is_active ?? true,
      created_at: quest.created_at || new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('quests')
          .insert([{ ...newQuest }])
          .select()
          .single();
        if (!error && data) {
          Object.assign(newQuest, data);
        }
      } catch (err) {
        console.warn('createQuest (Supabase) error, saved locally:', err);
      }
    }

    // 必ずローカルストレージにも保存
    const idx = localData.quests.findIndex(q => q.id === newQuest.id);
    if (idx >= 0) {
      localData.quests[idx] = newQuest;
    } else {
      localData.quests.push(newQuest);
    }
    saveLocalData(localData);

    // グローバルストアも即座に同期
    const currentQuests = store.get('quests') || [];
    const sIdx = currentQuests.findIndex(q => q.id === newQuest.id);
    if (sIdx >= 0) {
      currentQuests[sIdx] = newQuest;
      store.set('quests', [...currentQuests]);
    } else {
      store.set('quests', [newQuest, ...currentQuests]);
    }

    return newQuest;
  },

  async updateQuest(questId: string, updates: Partial<Quest>): Promise<Quest> {
    const localData = getLocalData();
    if (!Array.isArray(localData.quests)) localData.quests = [];

    const idx = localData.quests.findIndex(q => q.id === questId);
    let targetQuest = idx >= 0 ? { ...localData.quests[idx], ...updates } : ({ id: questId, ...updates } as Quest);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('quests')
          .update(updates)
          .eq('id', questId)
          .select()
          .single();
        if (!error && data) {
          targetQuest = data as Quest;
        }
      } catch (err) {
        console.warn('updateQuest (Supabase) error, updated locally:', err);
      }
    }

    if (idx >= 0) {
      localData.quests[idx] = targetQuest;
    } else {
      localData.quests.push(targetQuest);
    }
    saveLocalData(localData);

    // グローバルストアも即座に同期
    const currentQuests = store.get('quests') || [];
    const sIdx = currentQuests.findIndex(q => q.id === questId);
    if (sIdx >= 0) {
      currentQuests[sIdx] = targetQuest;
      store.set('quests', [...currentQuests]);
    } else {
      store.set('quests', [...currentQuests, targetQuest]);
    }

    return targetQuest;
  },

  async deactivateQuest(questId: string): Promise<void> {
    await this.updateQuest(questId, { is_active: false });
  },

  async deleteQuest(questId: string): Promise<void> {
    const localData = getLocalData();
    if (Array.isArray(localData.quests)) {
      localData.quests = localData.quests.filter(q => q.id !== questId);
    }
    if (Array.isArray(localData.submissions)) {
      localData.submissions = localData.submissions.filter(s => s.quest_id !== questId);
    }
    saveLocalData(localData);

    // グローバルストアも即座に同期
    const currentQuests = store.get('quests') || [];
    store.set('quests', currentQuests.filter(q => q.id !== questId));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('quests').delete().eq('id', questId);
        if (error) {
          console.warn('deleteQuest (Supabase) error:', error.message);
        }
      } catch (err) {
        console.warn('deleteQuest (Supabase) exception, deleted locally:', err);
      }
    }
  },

  async submitQuest(questId: string, childId: string, photoUrl?: string): Promise<QuestSubmission> {
    const localData = getLocalData();
    if (!Array.isArray(localData.quests)) localData.quests = [];
    if (!Array.isArray(localData.submissions)) localData.submissions = [];

    const q = localData.quests.find((q: any) => q.id === questId);
    const child = (localData.users || []).find((u: any) => u.id === childId) || store.get('currentUser');
    const familyId = q?.family_id || child?.family_id || store.get('family')?.id || '';

    const newSubmission: QuestSubmission = {
      id: generateId(),
      quest_id: questId,
      family_id: familyId,
      child_id: childId,
      photo_url: photoUrl,
      status: 'PENDING',
      submitted_at: new Date().toISOString(),
      ...(q?.reward_amount !== undefined ? { reward_amount: q.reward_amount } : {}),
      ...(q?.title ? { quest_title: q.title } : {})
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('quest_submissions')
          .insert([{ quest_id: questId, family_id: familyId, child_id: childId, photo_url: photoUrl, status: 'PENDING' }])
          .select()
          .single();
        if (!error && data) {
          Object.assign(newSubmission, data);
        }
      } catch (err) {
        console.warn('submitQuest (Supabase) error, saved locally:', err);
      }
    }

    localData.submissions.push(newSubmission);
    saveLocalData(localData);

    // グローバルストアも即座に同期
    const currentSubs = store.get('submissions') || [];
    const subIdx = currentSubs.findIndex(s => s.id === newSubmission.id);
    if (subIdx >= 0) {
      currentSubs[subIdx] = newSubmission;
      store.set('submissions', [...currentSubs]);
    } else {
      store.set('submissions', [newSubmission, ...currentSubs]);
    }

    return newSubmission;
  },

  async getSubmissions(familyId: string, status?: string): Promise<QuestSubmission[]> {
    const data = getLocalData();
    const deletedIds = new Set(data.deletedChildIds || []);
    const quests = Array.isArray(data.quests) ? data.quests : [];
    const subs = Array.isArray(data.submissions) ? data.submissions : [];
    const users = Array.isArray(data.users) ? data.users : [];
    const familyChildIds = new Set(
      users.filter((u: any) => u.family_id === familyId || u.role === 'CHILD').map((u: any) => u.id)
    );
    const familyQuestIds = new Set(quests.filter(q => q.family_id === familyId).map(q => q.id));

    let localSubmissions = subs.filter(s =>
      !deletedIds.has(s.child_id) &&
      (familyChildIds.has(s.child_id) || s.family_id === familyId || !s.family_id || familyQuestIds.has(s.quest_id))
    );
    if (status) {
      localSubmissions = localSubmissions.filter(s => s.status === status);
    }

    // ストア内の提出データも統合（APPROVED/REJECTED ステータスを優先）
    const storeSubs = (store.get('submissions') || []).filter(s =>
      !deletedIds.has(s.child_id) &&
      (familyChildIds.has(s.child_id) || s.family_id === familyId || !s.family_id || familyQuestIds.has(s.quest_id))
    );
    const subMap = new Map<string, QuestSubmission>();
    localSubmissions.forEach(s => {
      if (!status || s.status === status) subMap.set(s.id, s);
    });
    storeSubs.forEach(s => {
      if (!status || s.status === status) {
        const existing = subMap.get(s.id);
        if (!existing) {
          subMap.set(s.id, s);
        } else {
          const finalStatus = (s.status === 'APPROVED' || s.status === 'REJECTED') ? s.status
            : (existing.status === 'APPROVED' || existing.status === 'REJECTED') ? existing.status
            : s.status;
          subMap.set(s.id, { ...existing, ...s, status: finalStatus as any });
        }
      }
    });
    localSubmissions = Array.from(subMap.values());

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('quest_submissions')
          .select('*, quests(*)');
        if (familyId) {
          query = query.eq('family_id', familyId);
        }
        if (status) query = query.eq('status', status);
        const { data: remoteData, error } = await query;
        if (!error && remoteData) {
          const validData = (remoteData as any[]).filter(s => !deletedIds.has(s.child_id));

          // ローカルキャッシュにも最新の提出ステータスを同期
          let localModified = false;
          validData.forEach((rem: any) => {
            const idx = data.submissions.findIndex(ls => ls.id === rem.id);
            if (idx >= 0) {
              if (data.submissions[idx].status !== rem.status || data.submissions[idx].parent_comment !== rem.parent_comment) {
                data.submissions[idx] = { ...data.submissions[idx], ...rem };
                localModified = true;
              }
            } else {
              data.submissions.push(rem);
              localModified = true;
            }
          });
          if (localModified) {
            saveLocalData(data, false);
          }

          const remoteIds = new Set(validData.map((s: any) => s.id));
          const localOnly = localSubmissions.filter(s => !remoteIds.has(s.id));
          const merged = [...validData, ...localOnly];
          return merged.map(s => {
            const joinedQuest = Array.isArray(s.quests) ? s.quests[0] : s.quests;
            const q = quests.find(quest => quest.id === s.quest_id);
            return {
              ...s,
              quest: joinedQuest || s.quest || q,
              reward_amount: s.reward_amount ?? joinedQuest?.reward_amount ?? q?.reward_amount,
              quest_title: s.quest_title ?? joinedQuest?.title ?? q?.title
            };
          });
        }
      } catch (err) {
        console.warn('getSubmissions (Supabase) error, fallback to local:', err);
      }
    }
    return localSubmissions.map(s => {
      const q = quests.find(quest => quest.id === s.quest_id);
      return {
        ...s,
        quest: s.quest || q,
        reward_amount: s.reward_amount ?? q?.reward_amount,
        quest_title: s.quest_title ?? q?.title
      };
    });
  },

  async getSubmissionsForChild(childId: string): Promise<QuestSubmission[]> {
    const data = getLocalData();
    const subs = Array.isArray(data.submissions) ? data.submissions : [];
    const quests = Array.isArray(data.quests) ? data.quests : [];
    const localSubs = subs.filter(s => s.child_id === childId);

    if (isSupabaseConfigured) {
      try {
        const { data: remoteData, error } = await supabase
          .from('quest_submissions')
          .select('*, quests(*)')
          .eq('child_id', childId);
        if (!error && remoteData) {
          const remoteIds = new Set((remoteData as any[]).map(s => s.id));
          const localOnly = localSubs.filter(s => !remoteIds.has(s.id));
          const merged = [...(remoteData as any[]), ...localOnly];
          return merged.map(s => {
            const joinedQuest = Array.isArray(s.quests) ? s.quests[0] : s.quests;
            const q = quests.find(quest => quest.id === s.quest_id);
            return {
              ...s,
              quest: joinedQuest || s.quest || q,
              reward_amount: s.reward_amount ?? joinedQuest?.reward_amount ?? q?.reward_amount,
              quest_title: s.quest_title ?? joinedQuest?.title ?? q?.title
            };
          });
        }
      } catch (err) {
        console.warn('getSubmissionsForChild (Supabase) error, fallback to local:', err);
      }
    }
    return localSubs.map(s => {
      const q = quests.find(quest => quest.id === s.quest_id);
      return {
        ...s,
        quest: s.quest || q,
        reward_amount: s.reward_amount ?? q?.reward_amount,
        quest_title: s.quest_title ?? q?.title
      };
    });
  },

  async approveSubmission(submissionId: string, comment?: string): Promise<void> {
    const data = getLocalData();
    if (!Array.isArray(data.quests)) data.quests = [];
    if (!Array.isArray(data.submissions)) data.submissions = [];
    if (!Array.isArray(data.accounts)) data.accounts = [];
    if (!Array.isArray(data.transactions)) data.transactions = [];

    // 1. 提出データの特定（ローカルになければSupabaseから取得）
    let submission = data.submissions.find(s => s.id === submissionId);
    if (!submission && isSupabaseConfigured) {
      try {
        const { data: remoteSub } = await supabase
          .from('quest_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();
        if (remoteSub) {
          submission = remoteSub as QuestSubmission;
          data.submissions.push(submission);
        }
      } catch (e) {
        console.warn('approveSubmission: fetch submission error', e);
      }
    }

    // 2. クエストデータの特定（ローカルになければSupabaseから取得）
    let quest = data.quests.find(q => q.id === submission?.quest_id);
    if ((!quest || quest.reward_amount === undefined) && submission?.quest_id && isSupabaseConfigured) {
      try {
        const { data: remoteQuest } = await supabase
          .from('quests')
          .select('*')
          .eq('id', submission.quest_id)
          .single();
        if (remoteQuest) {
          quest = remoteQuest as Quest;
          const qIdx = data.quests.findIndex(q => q.id === quest!.id);
          if (qIdx >= 0) data.quests[qIdx] = quest;
          else data.quests.push(quest);
        }
      } catch (e) {
        console.warn('approveSubmission: fetch quest error', e);
      }
    }

    // 3. 子どもの口座データの特定（Supabaseが設定されている場合は最新残高を取得）
    let account = data.accounts.find(a => a.child_id === submission?.child_id);
    if (isSupabaseConfigured && submission?.child_id) {
      try {
        const { data: remoteAcc } = await supabase
          .from('accounts')
          .select('*')
          .eq('child_id', submission.child_id)
          .single();
        if (remoteAcc) {
          account = remoteAcc as Account;
          const aIdx = data.accounts.findIndex(a => a.child_id === submission!.child_id);
          if (aIdx >= 0) data.accounts[aIdx] = account;
          else data.accounts.push(account);
        }
      } catch (e) {
        console.warn('approveSubmission: fetch account error', e);
      }
    }

    const reward = quest?.reward_amount || 0;
    const savingsPercent = quest?.savings_percent !== undefined ? quest.savings_percent : 0;
    const spendingPercent = quest?.spending_percent !== undefined ? quest.spending_percent : (100 - savingsPercent);

    const savingsAmount = Math.floor(reward * (savingsPercent / 100));
    const spendingAmount = reward - savingsAmount;
    const now = new Date().toISOString();

    // 4. 提出ステータスを承認済みに更新
    if (submission) {
      submission.status = 'APPROVED';
      submission.reviewed_at = now;
      submission.parent_comment = comment;
      if (quest?.reward_amount !== undefined) {
        submission.reward_amount = quest.reward_amount;
      }
      if (quest?.title) {
        submission.quest_title = quest.title;
      }
    }

    // 5. 子どもの残高を加算
    if (account) {
      account.spending_balance = (account.spending_balance || 0) + spendingAmount;
      account.savings_balance = (account.savings_balance || 0) + savingsAmount;
    }

    // 6. クエストを自動で無効化 (要件: クエスト完了の承認をするとクエストを自動で無効になるように変更)
    if (quest) {
      quest.is_active = false;
    }
    if (submission?.quest_id) {
      const qIdx = data.quests.findIndex(q => q.id === submission.quest_id);
      if (qIdx >= 0) {
        data.quests[qIdx].is_active = false;
      }
    }

    // 7. 取引履歴の作成（要件: 入金が分散せず4桁以上でも正しく1件で記録されるように）
    const transactionsToInsert: Transaction[] = [];
    if (spendingAmount > 0) {
      transactionsToInsert.push({
        id: generateId(),
        child_id: submission?.child_id || '',
        family_id: submission?.family_id || quest?.family_id || '',
        amount: spendingAmount,
        type: 'QUEST_REWARD',
        target_account: 'SPENDING',
        title: savingsAmount > 0 ? `クエスト達成 (つかえる分): ${quest?.title || 'クエスト'}` : `クエスト達成: ${quest?.title || 'クエスト'}`,
        created_at: now
      });
    }
    if (savingsAmount > 0) {
      transactionsToInsert.push({
        id: generateId(),
        child_id: submission?.child_id || '',
        family_id: submission?.family_id || quest?.family_id || '',
        amount: savingsAmount,
        type: 'QUEST_REWARD',
        target_account: 'SAVINGS',
        title: `クエスト達成 (ちょきん分): ${quest?.title || 'クエスト'}`,
        created_at: now
      });
    }
    data.transactions.push(...transactionsToInsert);
    saveLocalData(data);

    // グローバルストアのaccounts, quests, submissionsも即座に同期
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

    const storeQuests = store.get('quests');
    if (Array.isArray(storeQuests) && submission?.quest_id) {
      store.set('quests', storeQuests.map(q => q.id === submission.quest_id ? { ...q, is_active: false } : q));
    }

    const storeSubs = store.get('submissions');
    if (Array.isArray(storeSubs)) {
      store.set('submissions', storeSubs.map(s => s.id === submissionId ? { ...s, status: 'APPROVED' as const, reviewed_at: now, parent_comment: comment } : s));
    }

    // 取引履歴もグローバルストアへ即座に同期
    if (transactionsToInsert.length > 0) {
      const currentTxs = store.get('transactions') || [];
      store.set('transactions', [...transactionsToInsert, ...currentTxs]);
    }

    // 8. Supabaseへの反映（提出・クエスト無効化・口座残高・取引履歴）
    if (isSupabaseConfigured) {
      try {
        await supabase.from('quest_submissions').update({
          status: 'APPROVED',
          reviewed_at: now,
          parent_comment: comment
        }).eq('id', submissionId);

        // クエストを自動で無効化
        if (submission?.quest_id) {
          await supabase.from('quests').update({
            is_active: false
          }).eq('id', submission.quest_id);
        }

        if (account) {
          const { error: accErr } = await supabase.from('accounts').update({
            spending_balance: account.spending_balance,
            savings_balance: account.savings_balance
          }).eq('id', account.id);

          if (accErr && account.child_id) {
            await supabase.from('accounts').update({
              spending_balance: account.spending_balance,
              savings_balance: account.savings_balance
            }).eq('child_id', account.child_id);
          }
        }

        if (submission?.child_id && transactionsToInsert.length > 0) {
          await supabase.from('transactions').insert(
            transactionsToInsert.map(t => ({
              child_id: t.child_id,
              family_id: t.family_id,
              amount: t.amount,
              type: t.type,
              target_account: t.target_account,
              title: t.title,
              created_at: now
            }))
          );
        }
      } catch (err) {
        console.warn('approveSubmission (Supabase) error, completed locally:', err);
      }
    }
  },

  async rejectSubmission(submissionId: string, comment: string): Promise<void> {
    const data = getLocalData();
    if (!Array.isArray(data.submissions)) data.submissions = [];

    let submission = data.submissions.find(s => s.id === submissionId);
    const now = new Date().toISOString();

    if (!submission && isSupabaseConfigured) {
      try {
        const { data: remoteSub } = await supabase
          .from('quest_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();
        if (remoteSub) {
          submission = remoteSub as QuestSubmission;
          data.submissions.push(submission);
        }
      } catch (e) {
        console.warn('rejectSubmission: fetch submission error', e);
      }
    }

    if (submission) {
      submission.status = 'REJECTED';
      submission.reviewed_at = now;
      submission.parent_comment = comment;
      saveLocalData(data);
    }

    const currentSubs = store.get('submissions');
    if (Array.isArray(currentSubs)) {
      store.set('submissions', currentSubs.map(s => s.id === submissionId ? { ...s, status: 'REJECTED' as const, reviewed_at: now, parent_comment: comment } : s));
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('quest_submissions').update({
          status: 'REJECTED',
          reviewed_at: now,
          parent_comment: comment
        }).eq('id', submissionId);
      } catch (err) {
        console.warn('rejectSubmission (Supabase) error, completed locally:', err);
      }
    }
  },

  subscribeToSubmissions(_familyId: string, callback: () => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    try {
      const channel = supabase.channel(`submissions_changes_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_submissions' }, callback)
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

  subscribeToQuests(_familyId: string, callback: () => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    try {
      const channel = supabase.channel(`quests_changes_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, callback)
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
