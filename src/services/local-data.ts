import type { Quest, QuestSubmission, Account, Transaction, WishItem, WithdrawalRequest, Family } from '../types/models';

export const LOCAL_DATA_KEY = 'moneytree_data';

export interface LocalData {
  families: Family[];
  users: any[];
  accounts: Account[];
  quests: Quest[];
  submissions: QuestSubmission[];
  transactions: Transaction[];
  wishItems: WishItem[];
  withdrawals: WithdrawalRequest[];
  deletedChildIds?: string[];
}

export function getLocalData(): LocalData {
  const data = localStorage.getItem(LOCAL_DATA_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      return {
        families: Array.isArray(parsed.families) ? parsed.families : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        quests: Array.isArray(parsed.quests) ? parsed.quests : [],
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        wishItems: Array.isArray(parsed.wishItems) ? parsed.wishItems : [],
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
        deletedChildIds: Array.isArray(parsed.deletedChildIds) ? parsed.deletedChildIds : []
      };
    } catch (e) {
      console.error('Error parsing local data', e);
    }
  }
  return {
    families: [],
    users: [],
    accounts: [],
    quests: [],
    submissions: [],
    transactions: [],
    wishItems: [],
    withdrawals: [],
    deletedChildIds: []
  };
}

export function saveLocalData(data: LocalData, emitEvent: boolean = true): void {
  const normalized: LocalData = {
    families: Array.isArray(data.families) ? data.families : [],
    users: Array.isArray(data.users) ? data.users : [],
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    quests: Array.isArray(data.quests) ? data.quests : [],
    submissions: Array.isArray(data.submissions) ? data.submissions : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    wishItems: Array.isArray(data.wishItems) ? data.wishItems : [],
    withdrawals: Array.isArray(data.withdrawals) ? data.withdrawals : [],
    deletedChildIds: Array.isArray(data.deletedChildIds) ? data.deletedChildIds : []
  };
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(normalized));
  if (emitEvent) {
    try {
      window.dispatchEvent(new CustomEvent('moneytree_local_change', { detail: normalized }));
    } catch {}
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
