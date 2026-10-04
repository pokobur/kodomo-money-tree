import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { store } from '../lib/store';
import type { Family } from '../types/models';
import { getLocalData, saveLocalData } from './local-data';

export const familyService = {
  async getFamilyByCode(code: string): Promise<Family | null> {
    const upper = code.toUpperCase();
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('families')
          .select('*')
          .eq('family_code', upper)
          .single();
        if (!error && data) {
          return data as Family;
        }
      } catch (err) {
        console.warn('getFamilyByCode (Supabase) error, fallback to local:', err);
      }
    }
    const data = getLocalData();
    return data.families.find((f: any) => f.family_code === upper) || null;
  },

  async updateFamilySettings(familyId: string, settings: Partial<Family>): Promise<Family | null> {
    const data = getLocalData();
    if (!Array.isArray(data.families)) data.families = [];
    const index = data.families.findIndex((f: any) => f.id === familyId);
    let updated: Family | null = null;
    if (index !== -1) {
      data.families[index] = { ...data.families[index], ...settings };
      updated = data.families[index];
    } else {
      const currentFam = store.get('family') || { id: familyId, name: 'ファミリー', family_code: '------' };
      const newFam = { ...currentFam, ...settings, id: familyId } as Family;
      data.families.push(newFam);
      updated = newFam;
    }
    saveLocalData(data);
    store.set('family', { ...(store.get('family') || {}), ...updated });

    if (isSupabaseConfigured) {
      try {
        const { data: remoteData, error } = await supabase
          .from('families')
          .update(settings)
          .eq('id', familyId)
          .select()
          .maybeSingle();
        if (error) {
          // カラム未追加（interest_schedule_type等）の場合は基本カラムのみ更新
          await supabase
            .from('families')
            .update({
              weekly_interest_rate: settings.weekly_interest_rate,
              max_weekly_reward_limit: settings.max_weekly_reward_limit,
            })
            .eq('id', familyId);
        } else if (remoteData) {
          const merged: Family = {
            ...updated,
            ...remoteData,
            weekly_interest_rate: remoteData.weekly_interest_rate ?? updated?.weekly_interest_rate,
            max_weekly_reward_limit: remoteData.max_weekly_reward_limit ?? updated?.max_weekly_reward_limit,
            interest_schedule_type: remoteData.interest_schedule_type || updated?.interest_schedule_type,
            interest_schedule_day: remoteData.interest_schedule_day ?? updated?.interest_schedule_day,
          };
          return merged;
        }
      } catch (err) {
        console.warn('updateFamilySettings (Supabase) error, updated locally:', err);
      }
    }

    return updated;
  },

  async getFamilyCode(familyId: string): Promise<string | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('families')
          .select('family_code')
          .eq('id', familyId)
          .single();
        if (!error && data) {
          return data.family_code;
        }
      } catch (err) {
        console.warn('getFamilyCode (Supabase) error, fallback to local:', err);
      }
    }
    const data = getLocalData();
    const family = data.families.find((f: any) => f.id === familyId);
    return family ? family.family_code : null;
  },

  /** 6桁の数字コードを再生成して更新 */
  async generateNewFamilyCode(familyId: string): Promise<string | null> {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const updated = await this.updateFamilySettings(familyId, { family_code: newCode });
    if (updated) {
      store.set('family', updated);
      return newCode;
    }
    return null;
  }
};
