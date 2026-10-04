import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { store } from '../lib/store';
import type { Account, Transaction } from '../types/models';
import { getLocalData, saveLocalData, generateId } from './local-data';

export const interestService = {
  calculatePendingInterest(account: Account, weeklyRate: number): number {
    return Math.ceil(account.savings_balance * (weeklyRate / 100));
  },

  async harvestInterest(childId: string): Promise<number> {
    const localData = getLocalData();
    const account = localData.accounts.find(a => a.child_id === childId);

    if (!account) throw new Error('Account not found');
    if (!account.unclaimed_interest || account.unclaimed_interest <= 0) return 0;

    const amount = account.unclaimed_interest;
    const now = new Date().toISOString();

    account.savings_balance += amount;
    account.unclaimed_interest = 0;

    localData.transactions.push({
      id: generateId(),
      child_id: account.child_id,
      family_id: account.family_id,
      amount,
      type: 'INTEREST',
      target_account: 'SAVINGS',
      title: '利息ゲット！',
      created_at: now
    } as Transaction);

    saveLocalData(localData);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('accounts').update({
          savings_balance: account.savings_balance,
          unclaimed_interest: 0
        }).eq('id', account.id);

        await supabase.from('transactions').insert([{
          child_id: account.child_id,
          family_id: account.family_id,
          amount,
          type: 'INTEREST',
          target_account: 'SAVINGS',
          title: '利息ゲット！',
          created_at: now
        }]);
      } catch (err) {
        console.warn('harvestInterest (Supabase) error, completed locally:', err);
      }
    }

    return amount;
  },

  async checkAndCalculateInterest(account: Account, weeklyRate: number): Promise<void> {
    const lastCalculated = new Date(account.last_interest_calculated_at || new Date().toISOString());
    const now = new Date();
    
    const diffTime = Math.abs(now.getTime() - lastCalculated.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const schedType = account.interest_schedule_type || 'WEEKLY';
    const schedDay = account.interest_schedule_day ?? 0;
    let shouldCalculate = false;
    let intervals = 1;

    if (schedType === 'MONTHLY') {
      const isDayMatch = now.getDate() === schedDay || (schedDay > 28 && now.getDate() >= 28 && new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate());
      const hasMonthPassed = (now.getFullYear() > lastCalculated.getFullYear()) || (now.getMonth() > lastCalculated.getMonth());
      if (isDayMatch && hasMonthPassed && diffDays >= 20) {
        shouldCalculate = true;
        intervals = 1;
      }
    } else {
      // WEEKLY
      if (diffDays >= 7) {
        intervals = Math.floor(diffDays / 7);
        shouldCalculate = true;
      } else if (now.getDay() === schedDay && diffDays >= 6) {
        shouldCalculate = true;
        intervals = 1;
      }
    }
    
    if (shouldCalculate) {
      let savings = account.savings_balance;
      let newUnclaimed = account.unclaimed_interest || 0;
      
      for (let i = 0; i < intervals; i++) {
        newUnclaimed += Math.ceil(savings * (weeklyRate / 100));
      }
      
      const newCalcDate = now.toISOString();
      
      const data = getLocalData();
      const localAccount = data.accounts.find(a => a.id === account.id || a.child_id === account.child_id);
      if (localAccount) {
        localAccount.unclaimed_interest = newUnclaimed;
        localAccount.last_interest_calculated_at = newCalcDate;
        saveLocalData(data);
      }

      if (isSupabaseConfigured) {
        try {
          await supabase.from('accounts').update({
            unclaimed_interest: newUnclaimed,
            last_interest_calculated_at: newCalcDate
          }).eq('id', account.id);
        } catch (err) {
          console.warn('checkAndCalculateInterest (Supabase) error, updated locally:', err);
        }
      }
    }
  },

  async getInterestHistory(childId: string): Promise<Transaction[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('child_id', childId)
          .eq('type', 'INTEREST')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data as Transaction[];
        }
      } catch (err) {
        console.warn('getInterestHistory (Supabase) error, fallback to local:', err);
      }
    }
    const data = getLocalData();
    return data.transactions
      .filter((t: any) => t.child_id === childId && t.type === 'INTEREST')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
};
