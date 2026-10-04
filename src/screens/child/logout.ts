// ============================================================
// 子ども用ログアウト・終了画面
// ============================================================

import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { logout } from '../../lib/auth';
import { createNavBar } from '../../components/nav';
import { showToast } from '../../components/toast';
import { getTreeLevel } from '../../types/models';

export function createChildLogout(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'screen-container child-theme child-logout-container';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.minHeight = '100vh';
  container.style.paddingBottom = '5.5rem';
  container.style.overflowY = 'auto';

  const contentArea = document.createElement('div');
  contentArea.className = 'child-logout-screen';
  contentArea.style.padding = '1.5rem 1rem';
  contentArea.style.display = 'flex';
  contentArea.style.flexDirection = 'column';
  contentArea.style.alignItems = 'center';
  contentArea.style.flexGrow = '1';

  const state = store.getState();
  const child = state?.currentUser;
  const account = state?.account;
  const savings = account?.savings_balance || 0;
  const spending = account?.spending_balance || 0;
  const level = getTreeLevel(savings);
  const childName = child?.display_name || 'おともだち';
  const avatar = child?.avatar_url || '🧒';

  // Title Header
  const title = document.createElement('h1');
  title.innerText = 'おわる（ログアウト）🚪';
  title.style.fontSize = '1.75rem';
  title.style.color = '#2E7D32';
  title.style.textAlign = 'center';
  title.style.margin = '0.5rem 0 1rem';
  contentArea.appendChild(title);

  // Character & Greeting Card
  const profileCard = document.createElement('div');
  profileCard.className = 'card child-logout-card';
  profileCard.style.width = '100%';
  profileCard.style.maxWidth = '420px';
  profileCard.style.textAlign = 'center';
  profileCard.style.background = 'rgba(255, 255, 255, 0.95)';
  profileCard.style.borderRadius = '24px';
  profileCard.style.padding = '1.5rem 1rem';
  profileCard.style.marginBottom = '1.25rem';
  profileCard.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.12)';

  profileCard.innerHTML = `
    <div style="font-size: 3.5rem; margin-bottom: 0.5rem; line-height: 1;">${avatar}</div>
    <h2 style="font-size: 1.4rem; color: #2E7D32; margin-bottom: 0.25rem;">${childName}</h2>
    <p style="color: #666; font-size: 0.95rem; font-weight: 700; margin-bottom: 1.25rem;">きょうも たくさん がんばったね！🌟</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
      <div style="background: rgba(255, 112, 67, 0.08); border-left: 3px solid #FF7043; padding: 0.75rem; border-radius: 12px; text-align: center;">
        <div style="font-size: 0.8rem; font-weight: 700; color: #666;">💰 つかえる</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #FF7043;">${spending.toLocaleString()} コイン</div>
      </div>
      <div style="background: rgba(102, 187, 106, 0.08); border-left: 3px solid #66BB6A; padding: 0.75rem; border-radius: 12px; text-align: center;">
        <div style="font-size: 0.8rem; font-weight: 700; color: #666;">🌱 ためた</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #2E7D32;">${savings.toLocaleString()} コイン</div>
      </div>
    </div>
    
    <div style="background: #E8F5E9; padding: 0.6rem 1rem; border-radius: 16px; display: inline-flex; align-items: center; gap: 0.5rem;">
      <span style="font-size: 1.2rem;">🌳</span>
      <span style="font-weight: 800; color: #2E7D32; font-size: 0.9rem;">き の レベル: Lv.${level.level} ${level.name}</span>
    </div>
  `;
  contentArea.appendChild(profileCard);

  // Actions Container
  const actionsContainer = document.createElement('div');
  actionsContainer.style.width = '100%';
  actionsContainer.style.maxWidth = '420px';
  actionsContainer.style.display = 'flex';
  actionsContainer.style.flexDirection = 'column';
  actionsContainer.style.gap = '0.75rem';

  // Button 1: Logout
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'btn';
  logoutBtn.style.background = 'linear-gradient(135deg, #FF7043, #EF5350)';
  logoutBtn.style.color = '#fff';
  logoutBtn.style.fontSize = '1.05rem';
  logoutBtn.style.padding = '0.9rem 1.5rem';
  logoutBtn.style.borderRadius = '9999px';
  logoutBtn.style.boxShadow = '0 4px 14px rgba(239, 83, 80, 0.3)';
  logoutBtn.innerHTML = '<span>🚪 おわる（ログアウトする）</span>';
  logoutBtn.onclick = async () => {
    try {
      await logout();
      showToast('またあそぼうね！バイバイ👋', 'success');
      router.navigate('/');
    } catch (e: any) {
      showToast('ログアウトに しっぱいしました', 'error');
    }
  };
  actionsContainer.appendChild(logoutBtn);

  // Button 2: Switch child account
  const switchBtn = document.createElement('button');
  switchBtn.className = 'btn';
  switchBtn.style.background = '#FFFFFF';
  switchBtn.style.color = '#2E7D32';
  switchBtn.style.border = '2px solid #81C784';
  switchBtn.style.fontSize = '0.95rem';
  switchBtn.style.padding = '0.8rem 1.5rem';
  switchBtn.style.borderRadius = '9999px';
  switchBtn.innerHTML = '<span>🔄 べつの こども に きりかえる</span>';
  switchBtn.onclick = async () => {
    try {
      await logout();
      router.navigate('/child-login');
    } catch (e: any) {
      router.navigate('/child-login');
    }
  };
  actionsContainer.appendChild(switchBtn);

  // Button 3: Stay & Play (Back to child home)
  const backBtn = document.createElement('button');
  backBtn.className = 'btn';
  backBtn.style.background = 'linear-gradient(135deg, #81C784, #4CAF50)';
  backBtn.style.color = '#fff';
  backBtn.style.fontSize = '0.95rem';
  backBtn.style.padding = '0.8rem 1.5rem';
  backBtn.style.borderRadius = '9999px';
  backBtn.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.25)';
  backBtn.innerHTML = '<span>🏠 まだ あそぶ（ホームへもどる）</span>';
  backBtn.onclick = () => {
    router.navigate('/child/home');
  };
  actionsContainer.appendChild(backBtn);

  contentArea.appendChild(actionsContainer);
  container.appendChild(contentArea);

  // Fixed Bottom Nav
  container.appendChild(createNavBar('CHILD'));

  return container;
}
