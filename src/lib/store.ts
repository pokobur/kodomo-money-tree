// ============================================================
// グローバル状態管理 (EventEmitter パターン)
// ============================================================

import { AppState, initialAppState } from '../types/models';

type Listener<K extends keyof AppState> = (value: AppState[K], oldValue: AppState[K]) => void;

class Store {
  private state: AppState = { ...initialAppState };
  private listeners: Map<string, Set<Function>> = new Map();

  /** 状態の取得 */
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.state[key];
  }

  /** 状態の更新（イベント発火） */
  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    const oldValue = this.state[key];
    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return;
    }
    this.state[key] = value;
    this.emit(key, value, oldValue);
  }

  /** 複数キーの一括更新 */
  update(partial: Partial<AppState>): void {
    for (const [key, value] of Object.entries(partial)) {
      const k = key as keyof AppState;
      const oldValue = this.state[k];
      (this.state as any)[k] = value;
      this.emit(k, value, oldValue);
    }
  }

  /** 特定キーの変更を監視 */
  on<K extends keyof AppState>(key: K, listener: Listener<K>): () => void {
    const keyStr = key as string;
    if (!this.listeners.has(keyStr)) {
      this.listeners.set(keyStr, new Set());
    }
    this.listeners.get(keyStr)!.add(listener);

    // unsubscribe関数を返す
    return () => {
      this.listeners.get(keyStr)?.delete(listener);
    };
  }

  /** すべての変更を監視 */
  onAny(listener: (key: keyof AppState, value: unknown) => void): () => void {
    const keyStr = '__any__';
    if (!this.listeners.has(keyStr)) {
      this.listeners.set(keyStr, new Set());
    }
    this.listeners.get(keyStr)!.add(listener);
    return () => {
      this.listeners.get(keyStr)?.delete(listener);
    };
  }

  /** イベント発火 */
  private emit(key: keyof AppState, value: unknown, oldValue: unknown): void {
    const keyStr = key as string;
    this.listeners.get(keyStr)?.forEach(fn => {
      try { fn(value, oldValue); } catch (e) { console.error('Store listener error:', e); }
    });
    this.listeners.get('__any__')?.forEach(fn => {
      try { fn(key, value); } catch (e) { console.error('Store listener error:', e); }
    });
  }

  /** 全状態を取得 */
  getState(): Readonly<AppState> {
    return { ...this.state };
  }

  /** 状態をリセット */
  reset(): void {
    this.state = { ...initialAppState };
  }
}

export const store = new Store();
