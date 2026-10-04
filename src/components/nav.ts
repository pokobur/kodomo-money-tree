import { store } from '../lib/store';
import { getLocalData } from '../services/local-data';

export function createNavBar(role: 'PARENT' | 'CHILD'): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'nav-footer';

  const childItems = [
    { label: 'ホーム', icon: '🏠', hash: '#/child/home' },
    { label: 'クエスト', icon: '📋', hash: '#/child/quests' },
    { label: 'ちょきん', icon: '🏦', hash: '#/child/savings' },
    { label: 'ほしいもの', icon: '⭐', hash: '#/child/wishlist' },
    { label: 'おわる', icon: '🚪', hash: '#/child/logout' },
  ];

  const parentItems = [
    { label: 'ダッシュボード', icon: '📊', hash: '#/parent/dashboard' },
    { label: 'クエスト管理', icon: '📋', hash: '#/parent/quests' },
    { label: 'こども', icon: '👤', hash: '#/parent/children' },
    { label: '設定', icon: '⚙️', hash: '#/parent/settings' },
  ];

  const items = role === 'CHILD' ? childItems : parentItems;

  function getParentPendingCount(): number {
    const local = getLocalData();
    const deletedIds = new Set(local.deletedChildIds || []);
    const localSubs = (local.submissions || []).filter((s: any) => s.status === 'PENDING' && !deletedIds.has(s.child_id));
    const storeSubs = (store.getState()?.submissions || []).filter((s: any) => s.status === 'PENDING' && !deletedIds.has(s.child_id));
    const subIds = new Set([...localSubs.map(s => s.id), ...storeSubs.map(s => s.id)]);

    const localWds = (local.withdrawals || []).filter((w: any) => (w.status === 'PENDING' || w.status === 'COOLDOWN') && !deletedIds.has(w.child_id));
    const storeWds = (store.getState()?.withdrawals || []).filter((w: any) => (w.status === 'PENDING' || w.status === 'COOLDOWN') && !deletedIds.has(w.child_id));
    const wdIds = new Set([...localWds.map(w => w.id), ...storeWds.map(w => w.id)]);

    return subIds.size + wdIds.size;
  }

  function renderNavItems() {
    const pendingCount = role === 'PARENT' ? getParentPendingCount() : 0;

    nav.innerHTML = items.map(item => {
      const showBadge = role === 'PARENT' && item.hash === '#/parent/dashboard' && pendingCount > 0;
      const badgeHtml = showBadge ? `
        <span class="nav-badge" style="position: absolute; top: -6px; right: -10px; background: #FF3D00; color: white; border-radius: 10px; font-size: 0.7rem; font-weight: bold; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.25); border: 2px solid white;">
          ${pendingCount}
        </span>
      ` : '';

      return `
        <a href="${item.hash}" class="nav-item" data-hash="${item.hash}" style="position: relative;">
          <span class="nav-icon" style="position: relative; display: inline-block;">
            ${item.icon}
            ${badgeHtml}
          </span>
          <span class="nav-label">${item.label}</span>
        </a>
      `;
    }).join('');

    updateActiveState();
  }

  function updateActiveState() {
    const currentHash = window.location.hash || '#/';
    nav.querySelectorAll('.nav-item').forEach(el => {
      const href = el.getAttribute('data-hash');
      if (currentHash.startsWith(href!)) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  renderNavItems();

  window.addEventListener('hashchange', updateActiveState);
  if (role === 'PARENT') {
    const onDataChange = () => renderNavItems();
    window.addEventListener('storage', onDataChange);
    window.addEventListener('moneytree_local_change', onDataChange);
    store.on('submissions', onDataChange);
    store.on('withdrawals', onDataChange);
  }

  return nav;
}
