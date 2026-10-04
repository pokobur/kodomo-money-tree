// ============================================================
// 認証ロジック
// 親: Email/Password or Google OAuth (Supabase Auth)
// 子: ファミリーコード + PIN (Synthetic Email方式)
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { store } from './store';
import { getLocalData, saveLocalData } from '../services/local-data';
import type { User, Family, Account } from '../types/models';

// ============================================================
// ローカルモード用セッション管理
// ============================================================

const LOCAL_STORAGE_KEY = 'moneytree_session';

interface LocalSession {
  userId: string;
  role: 'PARENT' | 'CHILD';
  familyId: string;
}

function getLocalSession(): LocalSession | null {
  // タブ単位のセッションを優先（同一ブラウザでの親子マルチタブテストに対応）
  const tabRaw = sessionStorage.getItem(LOCAL_STORAGE_KEY);
  if (tabRaw) {
    try { return JSON.parse(tabRaw); } catch {}
  }
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return null;
}

function saveLocalSession(session: LocalSession | null): void {
  if (session) {
    sessionStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

/** ランダムID生成 */
function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/** ランダムファミリーコード生成（数字6桁） */
function generateFamilyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** SHA-256ハッシュ */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// 認証API
// ============================================================

/** ファミリーコードの正規化（全角→半角、大文字化、ハイフン・空白除去） */
export function normalizeFamilyCode(code: string): string {
  if (!code) return '';
  return code
    .trim()
    .replace(/[ー−\s-]/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .toUpperCase();
}

/** この端末（ローカルストレージ）に保存されているファミリー一覧を取得 */
export function getAvailableLocalFamilies(): Pick<Family, 'id' | 'name' | 'family_code'>[] {
  const localData = getLocalData();
  return (localData.families || []).map(f => ({
    id: f.id,
    name: f.name,
    family_code: f.family_code,
  }));
}

/** 親アカウント新規登録 */
export async function registerParent(email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, role: 'parent' } },
      });
      if (error) {
        console.warn('registerParent (Supabase auth) error, fallback to local:', error.message);
      }
      if (!error && data.user) {
        const familyId = generateId();
        const familyCode = generateFamilyCode();
        const familyObj = {
          id: familyId,
          name: `${displayName}のファミリー`,
          family_code: familyCode,
          weekly_interest_rate: 0.05,
          max_weekly_reward_limit: 5000,
        };

        // ファミリー作成（クライアント生成UUIDを使用）
        const { error: famErr } = await supabase.from('families').insert(familyObj);
        if (famErr) {
          console.warn('families.insert (Supabase) error:', famErr.message);
        }

        // ユーザープロファイル作成
        const userProfileId = generateId();
        const userProfileObj = {
          id: userProfileId,
          family_id: familyId,
          role: 'PARENT' as const,
          display_name: displayName,
          auth_uid: data.user.id,
        };
        const { error: userErr } = await supabase.from('users').insert(userProfileObj);
        if (userErr) {
          console.warn('users.insert (Supabase) error:', userErr.message);
        }

        // ローカルストレージにも同期保存
        const localData = getLocalData();
        const fIdx = localData.families.findIndex(f => f.id === familyId);
        if (fIdx >= 0) localData.families[fIdx] = familyObj as any;
        else localData.families.push(familyObj as any);

        const uIdx = localData.users.findIndex(u => u.id === userProfileId);
        if (uIdx >= 0) localData.users[uIdx] = userProfileObj as any;
        else localData.users.push(userProfileObj as any);

        saveLocalData(localData);
        saveLocalSession({ userId: userProfileId, role: 'PARENT', familyId });
        await loadUserData(userProfileId);

        return { success: true };
      }
    } catch (err) {
      console.warn('registerParent (Supabase) failed, falling back to local mode:', err);
    }
  }

  // ローカルモード
  const localData = getLocalData();
  const existing = localData.users.find(u => u.display_name === email && u.role === 'PARENT');
  if (existing) return { success: false, error: 'すでに登録されています' };

  const familyId = generateId();
  const userId = generateId();
  const familyCode = generateFamilyCode();

  localData.families.push({
    id: familyId,
    name: `${displayName}のファミリー`,
    family_code: familyCode,
    weekly_interest_rate: 0.05,
    max_weekly_reward_limit: 5000,
    created_at: new Date().toISOString(),
  });

  localData.users.push({
    id: userId,
    family_id: familyId,
    role: 'PARENT',
    display_name: displayName,
    auth_uid: userId,
    created_at: new Date().toISOString(),
  });

  saveLocalData(localData);
  saveLocalSession({ userId, role: 'PARENT', familyId });

  await loadUserData(userId);
  return { success: true };
}

/** 親ログイン（Email/Password） */
export async function loginParent(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        // ユーザープロファイルを取得
        let { data: user } = await supabase.from('users')
          .select('*')
          .eq('auth_uid', data.user.id)
          .maybeSingle();

        // プロファイルがまだない場合、自動で作成
        if (!user) {
          const displayName = data.user.user_metadata?.display_name || email.split('@')[0] || '親';
          const familyCode = generateFamilyCode();
          const { data: family, error: famErr } = await supabase.from('families').insert({
            name: `${displayName}のファミリー`,
            family_code: familyCode,
            weekly_interest_rate: 0.05,
            max_weekly_reward_limit: 5000,
          }).select().single();
          
          if (!famErr && family) {
            const { data: newUser } = await supabase.from('users').insert({
              family_id: family.id,
              role: 'PARENT',
              display_name: displayName,
              auth_uid: data.user.id,
            }).select().single();
            user = newUser;
          }
        }

        if (user) {
          const localData = getLocalData();
          const uIdx = localData.users.findIndex(u => u.id === user.id);
          if (uIdx >= 0) localData.users[uIdx] = user;
          else localData.users.push(user);

          const { data: familyData } = await supabase.from('families').select('*').eq('id', user.family_id).single();
          if (familyData) {
            const fIdx = localData.families.findIndex(f => f.id === familyData.id);
            if (fIdx >= 0) localData.families[fIdx] = familyData;
            else localData.families.push(familyData);
          }
          saveLocalData(localData);
          saveLocalSession({ userId: user.id, role: 'PARENT', familyId: user.family_id });
          await loadUserData(user.id);
        }
        return { success: true };
      }
    } catch (err) {
      console.warn('loginParent (Supabase) failed, falling back to local mode:', err);
    }
  }

  // ローカルモード（emailをdisplayNameとして検索）
  const localData = getLocalData();
  const user = localData.users.find(u => u.display_name === email && u.role === 'PARENT');
  if (!user) return { success: false, error: 'ユーザーが見つかりません' };

  saveLocalSession({ userId: user.id, role: 'PARENT', familyId: user.family_id });
  await loadUserData(user.id);
  return { success: true };
}

/** Google OAuthログイン */
export async function loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase未設定です' };
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 子プロファイル作成（親が実行） */
export async function createChildProfile(displayName: string, pin: string): Promise<{ success: boolean; error?: string; childId?: string }> {
  const family = store.get('family');
  if (!family) return { success: false, error: 'ファミリー未設定' };

  const pinHash = await hashPin(pin);
  const childId = generateId();

  // 1. ローカルストレージに保存
  const localData = getLocalData();
  if (localData.deletedChildIds) {
    localData.deletedChildIds = localData.deletedChildIds.filter(id => id !== childId);
  }

  const newChild: User = {
    id: childId,
    family_id: family.id,
    role: 'CHILD',
    display_name: displayName,
    pin_code_hash: pinHash,
    created_at: new Date().toISOString(),
  };
  localData.users.push(newChild);

  const newAccount = {
    id: generateId(),
    child_id: childId,
    family_id: family.id,
    spending_balance: 0,
    savings_balance: 0,
    last_interest_calculated_at: new Date().toISOString(),
    unclaimed_interest: 0,
  };
  localData.accounts.push(newAccount);

  if (!localData.families.find(f => f.id === family.id)) {
    localData.families.push(family);
  }
  saveLocalData(localData);

  // 2. ストアの即時更新
  const existingChildren = (store.get('children') || []).filter((c: any) => c.id !== childId);
  store.set('children', [...existingChildren, newChild]);
  const existingAccounts = (store.get('accounts') || []).filter((a: any) => a.child_id !== childId);
  store.set('accounts', [...existingAccounts, newAccount]);

  // 3. Supabaseに同期保存
  if (isSupabaseConfigured) {
    try {
      const { data: dbChild, error: childErr } = await supabase.from('users').insert({
        id: childId,
        family_id: family.id,
        role: 'CHILD',
        display_name: displayName,
        pin_code_hash: pinHash,
      }).select().single();

      if (childErr) {
        console.warn('createChildProfile: users.insert error:', childErr.message);
      } else {
        // 口座作成（トリガーで自動作成されていない場合に対応）
        const { error: accErr } = await supabase.from('accounts').insert({
          child_id: childId,
          family_id: family.id,
          spending_balance: 0,
          savings_balance: 0,
          unclaimed_interest: 0,
        });
        if (accErr) {
          console.warn('createChildProfile: accounts.insert error:', accErr.message);
        }
      }
    } catch (err) {
      console.warn('createChildProfile (Supabase) exception:', err);
    }
  }

  return { success: true, childId };
}

/** 子どもプロファイルの削除 */
export async function deleteChildProfile(childId: string): Promise<{ success: boolean; error?: string }> {
  const family = store.get('family');
  const familyId = family?.id;

  // 1. ローカルストレージから削除 & deletedChildIds に記録
  const localData = getLocalData();
  localData.users = (localData.users || []).filter(u => u.id !== childId);
  localData.accounts = (localData.accounts || []).filter(a => a.child_id !== childId);
  localData.transactions = (localData.transactions || []).filter(t => t.child_id !== childId);
  localData.submissions = (localData.submissions || []).filter(s => s.child_id !== childId);
  localData.wishItems = (localData.wishItems || []).filter(w => w.child_id !== childId);
  localData.withdrawals = (localData.withdrawals || []).filter(w => w.child_id !== childId);
  if (Array.isArray(localData.quests)) {
    localData.quests.forEach(q => {
      if (q.assigned_child_id === childId) {
        delete q.assigned_child_id;
      }
    });
  }

  if (!Array.isArray(localData.deletedChildIds)) {
    localData.deletedChildIds = [];
  }
  if (!localData.deletedChildIds.includes(childId)) {
    localData.deletedChildIds.push(childId);
  }
  saveLocalData(localData);

  // 2. グローバルストアの即時更新
  const currentChildren = (store.get('children') || []).filter((c: any) => c.id !== childId);
  store.set('children', currentChildren);
  const currentAccounts = (store.get('accounts') || []).filter((a: any) => a.child_id !== childId);
  store.set('accounts', currentAccounts);
  store.set('submissions', (store.get('submissions') || []).filter((s: any) => s.child_id !== childId));
  store.set('withdrawals', (store.get('withdrawals') || []).filter((w: any) => w.child_id !== childId));
  store.set('transactions', (store.get('transactions') || []).filter((t: any) => t.child_id !== childId));
  store.set('wishItems', (store.get('wishItems') || []).filter((w: any) => w.child_id !== childId));

  // 3. Supabase上のデータを削除
  if (isSupabaseConfigured) {
    try {
      await supabase.from('quests').update({ assigned_child_id: null }).eq('assigned_child_id', childId);
      await supabase.from('wish_items').delete().eq('child_id', childId);
      await supabase.from('withdrawal_requests').delete().eq('child_id', childId);
      await supabase.from('quest_submissions').delete().eq('child_id', childId);
      await supabase.from('transactions').delete().eq('child_id', childId);
      await supabase.from('accounts').delete().eq('child_id', childId);
      const { error: userErr } = await supabase.from('users').delete().eq('id', childId);
      if (userErr) {
        console.warn('deleteChildProfile (Supabase) error:', userErr.message);
      }
      if (familyId) {
        const { data: remoteChildren } = await supabase.from('users')
          .select('*')
          .eq('family_id', familyId)
          .eq('role', 'CHILD');
        if (remoteChildren) {
          const deletedIds = new Set(localData.deletedChildIds || []);
          deletedIds.add(childId);
          const validChildren = remoteChildren.filter((c: any) => !deletedIds.has(c.id));
          store.set('children', validChildren);
        }
      }
    } catch (err) {
      console.warn('deleteChildProfile (Supabase) exception:', err);
    }
  }

  return { success: true };
}

/** 子どものPINコードを変更 */
export async function updateChildPin(childId: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    return { success: false, error: 'PINコードは4桁の数字を入力してください' };
  }
  const pinHash = await hashPin(newPin);

  // ローカルデータ更新
  const localData = getLocalData();
  const child = localData.users.find(u => u.id === childId);
  if (child) {
    child.pin_code_hash = pinHash;
    saveLocalData(localData);
  }

  // Supabase更新
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('users').update({
        pin_code_hash: pinHash
      }).eq('id', childId);
      if (error) {
        console.warn('updateChildPin (Supabase) error:', error.message);
      }
    } catch (err) {
      console.warn('updateChildPin (Supabase) exception:', err);
    }
  }

  return { success: true };
}

/** 子どもログイン（ファミリーコード + PIN） */
export async function loginChild(familyCode: string, childId: string, pin: string): Promise<{ success: boolean; error?: string }> {
  const pinHash = await hashPin(pin);
  const upperCode = normalizeFamilyCode(familyCode);
  const localData = getLocalData();
  const deletedIds = new Set(localData.deletedChildIds || []);

  if (deletedIds.has(childId)) {
    return { success: false, error: 'この おともだちは さくじょされています' };
  }

  let matchedChild: any = null;
  let matchedFamily: any = null;

  if (isSupabaseConfigured) {
    try {
      // ファミリーコードで検索
      const { data: family, error: famErr } = await supabase.from('families')
        .select('*')
        .eq('family_code', upperCode)
        .maybeSingle();

      if (famErr) {
        console.warn('loginChild (Supabase) family query error:', famErr);
      }

      if (family) {
        matchedFamily = family;
        const { data: child, error: chErr } = await supabase.from('users')
          .select('*')
          .eq('id', childId)
          .eq('family_id', family.id)
          .eq('role', 'CHILD')
          .maybeSingle();

        if (chErr) {
          console.warn('loginChild (Supabase) child query error:', chErr);
        }
        if (child) {
          matchedChild = child;
        }
      }
    } catch (err) {
      console.warn('loginChild (Supabase) error, fallback to local:', err);
    }
  }

  // ローカルデータからフォールバック
  if (!matchedChild) {
    const localFamily = localData.families.find(f => normalizeFamilyCode(f.family_code) === upperCode) || matchedFamily;
    if (localFamily) {
      matchedFamily = matchedFamily || localFamily;
      matchedChild = localData.users.find(u => u.id === childId && (u.family_id === localFamily.id || !u.family_id) && u.role === 'CHILD');
    }
  }

  if (!matchedFamily) {
    return { success: false, error: `ファミリーコード「${upperCode}」が みつかりません` };
  }

  if (!matchedChild) {
    return { success: false, error: 'おともだちが みつかりません' };
  }

  // PINコードの検証 (ローカルに保存されているPINハッシュ、またはSupabaseのPINハッシュ)
  const localChild = localData.users.find(u => u.id === childId);
  const validHash = matchedChild.pin_code_hash || localChild?.pin_code_hash;

  if (validHash && validHash !== pinHash) {
    return { success: false, error: 'PINコードが ちがうよ' };
  }

  // セッションを保存
  saveLocalSession({ userId: matchedChild.id, role: 'CHILD', familyId: matchedFamily.id });

  // ローカルデータに family や child や account が欠けていれば補完保存
  if (!localData.families.some(f => f.id === matchedFamily.id)) {
    localData.families.push(matchedFamily);
  }
  if (!localData.users.some(u => u.id === matchedChild.id)) {
    localData.users.push(matchedChild);
  }
  if (!localData.accounts.some(a => a.child_id === matchedChild.id)) {
    localData.accounts.push({
      id: generateId(),
      child_id: matchedChild.id,
      family_id: matchedFamily.id,
      spending_balance: 0,
      savings_balance: 0,
      last_interest_calculated_at: new Date().toISOString(),
      unclaimed_interest: 0,
    });
  }
  saveLocalData(localData, false);

  await loadUserData(matchedChild.id);
  return { success: true };
}

/** ファミリーコードから子ども一覧を取得（ログイン画面用） */
export async function getChildrenByFamilyCode(familyCode: string): Promise<{ children: Pick<User, 'id' | 'display_name'>[]; familyFound?: boolean; error?: string }> {
  const upperCode = normalizeFamilyCode(familyCode);
  const localData = getLocalData();
  const deletedIds = new Set(localData.deletedChildIds || []);

  let remoteFamily: any = null;
  let remoteChildren: any[] = [];

  console.log('[auth] getChildrenByFamilyCode searching:', upperCode);

  if (isSupabaseConfigured) {
    try {
      const { data: family, error: famErr } = await supabase.from('families')
        .select('*')
        .eq('family_code', upperCode)
        .maybeSingle();

      if (famErr) {
        console.warn('[auth] Supabase families lookup error:', famErr);
      }

      if (!famErr && family) {
        remoteFamily = family;
        console.log('[auth] Found Supabase family:', family);
        const { data: children, error: chErr } = await supabase.from('users')
          .select('id, display_name, family_id, role')
          .eq('family_id', family.id)
          .eq('role', 'CHILD');
        if (chErr) {
          console.warn('[auth] Supabase users lookup error:', chErr);
        }
        if (!chErr && children) {
          remoteChildren = children.filter(c => !deletedIds.has(c.id));
        }
      }
    } catch (err) {
      console.warn('getChildrenByFamilyCode (Supabase) failed, falling back to local:', err);
    }
  }

  // ローカルデータからも該当ファミリーを探す（正規化して照合）
  const localFamily = localData.families.find(f => normalizeFamilyCode(f.family_code) === upperCode);
  const targetFamilyId = remoteFamily?.id || localFamily?.id;

  console.log('[auth] Family match result: remote =', remoteFamily?.id, 'local =', localFamily?.id);

  if (!remoteFamily && !localFamily) {
    console.warn('[auth] Family not found. Registered local codes:', (localData.families || []).map(f => f.family_code));
    return {
      children: [],
      familyFound: false,
      error: `ファミリーコード「${upperCode}」が みつからないよ。コードを かくにんしてね`
    };
  }

  // リモートとローカルの子どもを統合（重複除外）
  const childMap = new Map<string, { id: string; display_name: string }>();
  remoteChildren.forEach(c => childMap.set(c.id, { id: c.id, display_name: c.display_name }));

  if (targetFamilyId) {
    localData.users
      .filter(u => u.family_id === targetFamilyId && u.role === 'CHILD' && !deletedIds.has(u.id))
      .forEach(u => {
        if (!childMap.has(u.id)) {
          childMap.set(u.id, { id: u.id, display_name: u.display_name });
        }
      });
  }

  const allChildren = Array.from(childMap.values());
  if (allChildren.length === 0) {
    return {
      children: [],
      familyFound: true,
      error: 'このファミリーには、まだ おともだちが とうろくされていないよ！\nおとなのひとに「こども管理」から とうろくしてもらってね。'
    };
  }

  return { children: allChildren, familyFound: true };
}

/** ユーザーデータをストアにロード */
async function loadUserData(userId: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: user, error: userErr } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (user) {
        store.set('currentUser', user);

        const { data: family } = await supabase.from('families').select('*').eq('id', user.family_id).maybeSingle();
        const localData = getLocalData();
        const localFam = localData.families.find(f => f.id === user.family_id);
        const mergedFamily = family ? {
          ...localFam,
          ...family,
          interest_schedule_type: family.interest_schedule_type || localFam?.interest_schedule_type || 'WEEKLY',
          interest_schedule_day: family.interest_schedule_day ?? localFam?.interest_schedule_day ?? 0,
          weekly_interest_rate: family.weekly_interest_rate ?? localFam?.weekly_interest_rate ?? 0.05,
          max_weekly_reward_limit: family.max_weekly_reward_limit ?? localFam?.max_weekly_reward_limit ?? 5000,
        } : localFam;
        if (mergedFamily) store.set('family', mergedFamily);

        if (user.role === 'CHILD') {
          const { data: account } = await supabase.from('accounts').select('*').eq('child_id', userId).maybeSingle();
          const localAccount = localData.accounts.find(a => a.child_id === userId) || null;
          const mergedAcc = account ? {
            ...localAccount,
            ...account,
            weekly_interest_rate: account.weekly_interest_rate ?? localAccount?.weekly_interest_rate,
            max_weekly_reward_limit: account.max_weekly_reward_limit ?? localAccount?.max_weekly_reward_limit,
            interest_schedule_type: account.interest_schedule_type || localAccount?.interest_schedule_type,
            interest_schedule_day: account.interest_schedule_day ?? localAccount?.interest_schedule_day,
          } : localAccount;
          store.set('account', mergedAcc);
        } else {
          const { data: accounts } = await supabase.from('accounts').select('*').eq('family_id', user.family_id);
          const localAccounts = (localData.accounts || []).filter(a => a.family_id === user.family_id);
          const accMap = new Map<string, any>();
          localAccounts.forEach(la => accMap.set(la.child_id, la));
          (accounts || []).forEach(ra => {
            const la = accMap.get(ra.child_id);
            accMap.set(ra.child_id, {
              ...la,
              ...ra,
              weekly_interest_rate: ra.weekly_interest_rate ?? la?.weekly_interest_rate,
              max_weekly_reward_limit: ra.max_weekly_reward_limit ?? la?.max_weekly_reward_limit,
              interest_schedule_type: ra.interest_schedule_type || la?.interest_schedule_type,
              interest_schedule_day: ra.interest_schedule_day ?? la?.interest_schedule_day,
            });
          });
          store.set('accounts', Array.from(accMap.values()));
        }

        const { data: children } = await supabase.from('users')
          .select('*').eq('family_id', user.family_id).eq('role', 'CHILD');
        const localChildren = localData.users.filter(u => u.family_id === user.family_id && u.role === 'CHILD');
        store.set('children', (children && children.length > 0) ? children : localChildren);

        const localQuests = (localData.quests || []).filter(q => q.family_id === user.family_id);
        const { data: quests } = await supabase.from('quests')
          .select('*').eq('family_id', user.family_id).order('created_at', { ascending: false });
        store.set('quests', (quests && quests.length > 0) ? quests : localQuests);

        const localSubs = (localData.submissions || []).filter(s => s.family_id === user.family_id);
        const { data: submissions } = await supabase.from('quest_submissions')
          .select('*').eq('family_id', user.family_id).order('submitted_at', { ascending: false });
        
        // 提出データのステータス（APPROVED/REJECTED優先）をマージ
        const subMap = new Map<string, any>();
        localSubs.forEach((ls: any) => subMap.set(ls.id, ls));
        (submissions || []).forEach((rem: any) => {
          const ex = subMap.get(rem.id);
          if (!ex) {
            subMap.set(rem.id, rem);
          } else {
            const finalSt = (rem.status === 'APPROVED' || rem.status === 'REJECTED') ? rem.status
              : (ex.status === 'APPROVED' || ex.status === 'REJECTED') ? ex.status
              : rem.status;
            subMap.set(rem.id, { ...ex, ...rem, status: finalSt });
          }
        });
        store.set('submissions', Array.from(subMap.values()));

        const localWds = (localData.withdrawals || []).filter(w => w.family_id === user.family_id);
        const { data: withdrawals } = await supabase.from('withdrawal_requests')
          .select('*').eq('family_id', user.family_id).order('created_at', { ascending: false });
        store.set('withdrawals', (withdrawals && withdrawals.length > 0) ? withdrawals : localWds);

        const { data: transactions } = await supabase.from('transactions')
          .select('*').eq(user.role === 'CHILD' ? 'child_id' : 'family_id', user.role === 'CHILD' ? userId : user.family_id).order('created_at', { ascending: false });
        const localTxs = user.role === 'CHILD'
          ? (localData.transactions || []).filter(t => t.child_id === userId)
          : (localData.transactions || []).filter(t => t.family_id === user.family_id);
        const txMap = new Map<string, any>();
        localTxs.forEach((t: any) => txMap.set(t.id, t));
        (transactions || []).forEach((t: any) => txMap.set(t.id, t));
        store.set('transactions', Array.from(txMap.values()).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

        const { data: wishItems } = await supabase.from('wish_items')
          .select('*').eq(user.role === 'CHILD' ? 'child_id' : 'family_id', user.role === 'CHILD' ? userId : user.family_id).order('created_at', { ascending: false });
        const localWishes = user.role === 'CHILD'
          ? (localData.wishItems || []).filter(w => w.child_id === userId)
          : (localData.wishItems || []).filter(w => w.family_id === user.family_id);
        store.set('wishItems', (wishItems && wishItems.length > 0) ? wishItems : localWishes);

        return;
      }
    } catch (err) {
      console.warn('loadUserData: Supabase エラー, ローカルにフォールバック', err);
    }
  }

  // ローカルモード（または Supabase にデータがない場合のフォールバック）
  loadUserDataFromLocal(userId);
}

/** ローカルデータからストアにロード */
function loadUserDataFromLocal(userId: string): void {
  const localData = getLocalData();
  const user = localData.users.find(u => u.id === userId);
  if (!user) return;

  store.set('currentUser', user);
  store.set('family', localData.families.find(f => f.id === user.family_id) || null);
  
  if (user.role === 'CHILD') {
    let acc = localData.accounts.find(a => a.child_id === userId);
    if (!acc) {
      acc = {
        id: generateId(),
        child_id: userId,
        family_id: user.family_id,
        spending_balance: 0,
        savings_balance: 0,
        last_interest_calculated_at: new Date().toISOString(),
        unclaimed_interest: 0,
      };
      localData.accounts.push(acc);
      saveLocalData(localData, false);
    }
    store.set('account', acc);
  } else {
    store.set('accounts', (localData.accounts || []).filter(a => a.family_id === user.family_id));
  }

  const children = localData.users.filter(u => u.family_id === user.family_id && u.role === 'CHILD');
  store.set('children', children);

  // クエスト・提出・取引・ウィッシュ・引き出しをロード
  const familyId = user.family_id;
  store.set('quests', (localData.quests || []).filter(q => q.family_id === familyId));
  store.set('submissions', (localData.submissions || []).filter(s => s.family_id === familyId));
  store.set('withdrawals', (localData.withdrawals || []).filter(w => w.family_id === familyId));

  if (user.role === 'CHILD') {
    store.set('transactions', (localData.transactions || []).filter(t => t.child_id === userId));
    store.set('wishItems', (localData.wishItems || []).filter(w => w.child_id === userId));
  } else {
    store.set('transactions', (localData.transactions || []).filter(t => t.family_id === familyId));
    store.set('wishItems', (localData.wishItems || []).filter(w => w.family_id === familyId));
  }
}

/** セッション復元（起動時） */
export async function restoreSession(): Promise<boolean> {
  // 1. タブ単位のセッションを最優先で確認（同一ブラウザでの親子マルチタブテスト用）
  const localSession = getLocalSession();
  if (localSession) {
    await loadUserData(localSession.userId);
    return true;
  }

  // 2. Supabase Auth のセッションを確認
  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: user } = await supabase.from('users')
          .select('*')
          .eq('auth_uid', session.user.id)
          .single();
        if (user) {
          saveLocalSession({ userId: user.id, role: user.role as any, familyId: user.family_id });
          await loadUserData(user.id);
          return true;
        }
      }
    } catch (err) {
      console.warn('restoreSession (Supabase) failed, trying local session:', err);
    }
  }

  return false;
}

/** ログアウト */
export async function logout(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  saveLocalSession(null);
  store.reset();
}
