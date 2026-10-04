import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { store } from '../lib/store';
import type { WishItem } from '../types/models';
import { getLocalData, saveLocalData, generateId } from './local-data';

export const wishService = {
  async getWishItems(childId: string): Promise<WishItem[]> {
    const localData = getLocalData();
    const localWishes = (localData.wishItems || [])
      .filter(w => w.child_id === childId && !w.is_purchased);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('wish_items')
          .select('*')
          .eq('child_id', childId)
          .eq('is_purchased', false)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const remoteIds = new Set(data.map((w: any) => w.id));
          const localOnly = localWishes.filter(w => !remoteIds.has(w.id));
          const merged = [...(data as WishItem[]), ...localOnly];

          const otherWishes = (localData.wishItems || []).filter(w => w.child_id !== childId);
          localData.wishItems = [...otherWishes, ...merged];
          saveLocalData(localData, false);

          return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        // Supabase の戻り値が 0 件（RLS で空など）で、ローカルにウィッシュがある場合は消さずにローカルを返す
        if (!error && data && data.length === 0 && localWishes.length > 0) {
          return localWishes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (err) {
        console.warn('getWishItems (Supabase) error, fallback to local:', err);
      }
    }

    return localWishes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createWishItem(item: Partial<WishItem>): Promise<WishItem> {
    const localData = getLocalData();
    const newItem: WishItem = {
      ...(item as any),
      id: item.id || generateId(),
      is_purchased: false,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('wish_items')
          .insert([{ ...newItem }])
          .select()
          .single();
        if (!error && data) {
          Object.assign(newItem, data);
        }
      } catch (err) {
        console.warn('createWishItem (Supabase) error, saved locally:', err);
      }
    }

    const existingIdx = (localData.wishItems || []).findIndex(w => w.id === newItem.id);
    if (existingIdx >= 0) {
      localData.wishItems[existingIdx] = newItem;
    } else {
      localData.wishItems.push(newItem);
    }
    saveLocalData(localData);

    // グローバルストアの wishItems も即座に更新
    const currentWishes = store.get('wishItems') || [];
    if (!currentWishes.some(w => w.id === newItem.id)) {
      store.set('wishItems', [newItem, ...currentWishes]);
    }

    return newItem;
  },

  async updateWishItem(itemId: string, updates: Partial<WishItem>): Promise<WishItem> {
    const localData = getLocalData();
    const index = localData.wishItems.findIndex(w => w.id === itemId);
    let target = index >= 0 ? { ...localData.wishItems[index], ...updates } : ({ id: itemId, ...updates } as WishItem);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('wish_items')
          .update(updates)
          .eq('id', itemId)
          .select()
          .single();
        if (!error && data) {
          target = data as WishItem;
        }
      } catch (err) {
        console.warn('updateWishItem (Supabase) error, updated locally:', err);
      }
    }

    if (index >= 0) {
      localData.wishItems[index] = target;
    } else {
      localData.wishItems.push(target);
    }
    saveLocalData(localData);

    const currentWishes = store.get('wishItems') || [];
    const storeIdx = currentWishes.findIndex(w => w.id === itemId);
    if (storeIdx >= 0) {
      const copy = [...currentWishes];
      copy[storeIdx] = target;
      store.set('wishItems', copy);
    }

    return target;
  },

  async markAsPurchased(itemId: string): Promise<void> {
    await this.updateWishItem(itemId, { is_purchased: true });
  },

  async deleteWishItem(itemId: string): Promise<void> {
    const data = getLocalData();
    data.wishItems = (data.wishItems || []).filter(w => w.id !== itemId);
    saveLocalData(data);

    const currentWishes = store.get('wishItems') || [];
    store.set('wishItems', currentWishes.filter(w => w.id !== itemId));

    if (isSupabaseConfigured) {
      try {
        // 親の更新ポリシーで is_purchased を true に設定
        await supabase.from('wish_items').update({ is_purchased: true }).eq('id', itemId);
        // 子どもの削除ポリシーまたは親権限で delete も試行
        await supabase.from('wish_items').delete().eq('id', itemId);
      } catch (err) {
        console.warn('deleteWishItem (Supabase) error, deleted locally:', err);
      }
    }
  },

  calculateProgress(wishItem: WishItem, savingsBalance: number) {
    const percent = Math.min(100, Math.floor((savingsBalance / wishItem.target_price) * 100));
    const remaining = Math.max(0, wishItem.target_price - savingsBalance);
    const isAchievable = savingsBalance >= wishItem.target_price;
    return { percent, remaining, isAchievable };
  },

  subscribeToWishItems(childId: string, callback: () => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    try {
      const channel = supabase.channel(`wish_changes_${childId}_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wish_items', filter: `child_id=eq.${childId}` }, () => {
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
  }
};
