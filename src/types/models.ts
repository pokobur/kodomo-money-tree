// ============================================================
// マネーツリー - データモデル型定義
// 要件定義書のTypeScript Typesをそのまま採用
// ============================================================

/** ファミリー情報 */
export interface Family {
  id: string;
  name: string;
  family_code: string;
  weekly_interest_rate: number;
  max_weekly_reward_limit: number;
  interest_schedule_type?: 'WEEKLY' | 'MONTHLY'; // 曜日指定 (毎週◯曜日) or 日付指定 (毎月◯日)
  interest_schedule_day?: number; // 0=日曜〜6=土曜 (WEEKLY) または 1〜31 (MONTHLY)
  created_at: string;
}

/** ユーザー情報 */
export interface User {
  id: string;
  family_id: string;
  role: 'PARENT' | 'CHILD';
  display_name: string;
  pin_code_hash?: string;
  avatar_url?: string;
  auth_uid?: string;
  auth_email?: string;
  created_at: string;
  weekly_interest_rate?: number;
  max_weekly_reward_limit?: number;
  interest_schedule_type?: 'WEEKLY' | 'MONTHLY';
  interest_schedule_day?: number;
}

/** クエスト（お手伝い） */
export interface Quest {
  id: string;
  family_id: string;
  title: string;
  description?: string;
  reward_amount: number;
  spending_percent: number;
  savings_percent: number;
  repeat_type: 'ONCE' | 'DAILY' | 'WEEKLY';
  requires_photo: boolean;
  is_active: boolean;
  assigned_child_id?: string;
  created_at: string;
}

/** クエスト提出・進行ログ */
export interface QuestSubmission {
  id: string;
  quest_id: string;
  family_id: string;
  child_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  photo_url?: string;
  submitted_at: string;
  reviewed_at?: string;
  parent_comment?: string;
  reward_amount?: number;
  quest_title?: string;
  quest?: Quest;
  quests?: Quest;
}

/** 口座情報（子ども1人に対して1レコード） */
export interface Account {
  id: string;
  child_id: string;
  family_id: string;
  spending_balance: number;
  savings_balance: number;
  last_interest_calculated_at: string;
  unclaimed_interest: number;
  weekly_interest_rate?: number;
  max_weekly_reward_limit?: number;
  interest_schedule_type?: 'WEEKLY' | 'MONTHLY';
  interest_schedule_day?: number;
}

/** 取引履歴 */
export interface Transaction {
  id: string;
  child_id: string;
  family_id: string;
  target_account: 'SPENDING' | 'SAVINGS';
  type: 'QUEST_REWARD' | 'INTEREST' | 'WITHDRAW' | 'ADJUSTMENT';
  amount: number;
  title: string;
  created_at: string;
}

/** ウィッシュリスト（計画購買） */
export interface WishItem {
  id: string;
  child_id: string;
  family_id: string;
  title: string;
  target_price: number;
  image_url?: string;
  is_purchased: boolean;
  matching_bonus_percent?: number;
  created_at: string;
}

/** 出金リクエスト */
export interface WithdrawalRequest {
  id: string;
  child_id: string;
  family_id: string;
  amount: number;
  purpose: string;
  source_account: 'SPENDING' | 'SAVINGS';
  status: 'COOLDOWN' | 'PENDING' | 'APPROVED' | 'REJECTED';
  cooldown_expires_at?: string;
  parent_comment?: string;
  created_at: string;
}

// ============================================================
// ツリー成長レベル定義
// ============================================================

export interface TreeLevel {
  level: number;
  name: string;
  nameEn: string;
  minBalance: number;
  maxBalance: number;
  description: string;
}

export const TREE_LEVELS: TreeLevel[] = [
  { level: 1, name: 'たね・ふたば', nameEn: 'seed',       minBalance: 0,    maxBalance: 499,    description: 'ちいさな ふたばが めを だしたよ！' },
  { level: 2, name: 'わかぎ',       nameEn: 'sapling',    minBalance: 500,  maxBalance: 1499,   description: 'わかぎが すくすく そだっているよ！' },
  { level: 3, name: 'りっぱな木',   nameEn: 'tree',       minBalance: 1500, maxBalance: 2999,   description: 'とりの すが できて、はなが さいたよ！' },
  { level: 4, name: 'だいじゅ',     nameEn: 'great_tree', minBalance: 3000, maxBalance: 4999,   description: 'リスや フクロウが あそびに きたよ！' },
  { level: 5, name: 'せかいじゅ',   nameEn: 'world_tree', minBalance: 5000, maxBalance: Infinity, description: 'きんいろの オーラ！ようせいの もり！' },
];

export function getTreeLevel(savingsBalance: number): TreeLevel {
  for (let i = TREE_LEVELS.length - 1; i >= 0; i--) {
    if (savingsBalance >= TREE_LEVELS[i].minBalance) {
      return TREE_LEVELS[i];
    }
  }
  return TREE_LEVELS[0];
}

/** ツリーレベル内の進捗率 (0.0 ~ 1.0) */
export function getTreeProgress(savingsBalance: number): number {
  const level = getTreeLevel(savingsBalance);
  if (level.maxBalance === Infinity) return 1.0;
  const range = level.maxBalance - level.minBalance + 1;
  const progress = (savingsBalance - level.minBalance) / range;
  return Math.min(1.0, Math.max(0.0, progress));
}

// ============================================================
// アプリ状態型
// ============================================================

export interface AppState {
  currentUser: User | null;
  family: Family | null;
  account: Account | null;
  accounts: Account[];
  quests: Quest[];
  submissions: QuestSubmission[];
  transactions: Transaction[];
  wishItems: WishItem[];
  withdrawals: WithdrawalRequest[];
  children: User[];
  isLoading: boolean;
  currentRoute: string;
}

export const initialAppState: AppState = {
  currentUser: null,
  family: null,
  account: null,
  accounts: [],
  quests: [],
  submissions: [],
  transactions: [],
  wishItems: [],
  withdrawals: [],
  children: [],
  isLoading: true,
  currentRoute: '#/',
};
