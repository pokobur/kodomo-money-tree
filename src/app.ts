// ============================================================
// マネーツリー アプリケーション ルーティング & 初期化
// ============================================================

import { router } from './lib/router';
import { store } from './lib/store';
import { restoreSession } from './lib/auth';

// 画面の遅延インポート
async function loadScreen(screenModule: string) {
  switch (screenModule) {
    case 'login':
      return (await import('./screens/auth/login')).createLoginScreen();
    case 'register':
      return (await import('./screens/auth/register')).createRegisterScreen();
    case 'child-login':
      return (await import('./screens/auth/child-login')).createChildLoginScreen();
    case 'child-home':
      return (await import('./screens/child/home')).createChildHome();
    case 'child-quests':
      return (await import('./screens/child/quests')).createChildQuests();
    case 'child-savings':
      return (await import('./screens/child/savings')).createChildSavings();
    case 'child-wishlist':
      return (await import('./screens/child/wishlist')).createChildWishlist();
    case 'child-logout':
      return (await import('./screens/child/logout')).createChildLogout();
    case 'parent-dashboard':
      return (await import('./screens/parent/dashboard')).createParentDashboard();
    case 'parent-quests':
      return (await import('./screens/parent/quest-manage')).createQuestManage();
    case 'parent-settings':
      return (await import('./screens/parent/family-settings')).createFamilySettings();
    case 'parent-children':
      return (await import('./screens/parent/child-manage')).createChildManage();
    default:
      return (await import('./screens/auth/login')).createLoginScreen();
  }
}

/** ルーターの初期化 */
export function setupRoutes(): void {
  // === 認証画面 ===
  router.addRoute('/', async () => {
    const user = store.get('currentUser');
    if (user) {
      // ログイン済み → ロールに応じたホームにリダイレクト
      if (user.role === 'CHILD') {
        router.navigate('/child/home');
      } else {
        router.navigate('/parent/dashboard');
      }
      // リダイレクト中の仮表示
      const el = document.createElement('div');
      el.className = 'loading-screen';
      el.innerHTML = '<div class="spinner"></div>';
      return el;
    }
    return loadScreen('login');
  });

  router.addRoute('/login', () => loadScreen('login'));
  router.addRoute('/register', () => loadScreen('register'));
  router.addRoute('/child-login', () => loadScreen('child-login'));

  // === 子ども画面 ===
  router.addRoute('/child/home', async () => {
    if (!requireRole('CHILD')) return createRedirectElement();
    return loadScreen('child-home');
  });
  router.addRoute('/child/quests', async () => {
    if (!requireRole('CHILD')) return createRedirectElement();
    return loadScreen('child-quests');
  });
  router.addRoute('/child/savings', async () => {
    if (!requireRole('CHILD')) return createRedirectElement();
    return loadScreen('child-savings');
  });
  router.addRoute('/child/wishlist', async () => {
    if (!requireRole('CHILD')) return createRedirectElement();
    return loadScreen('child-wishlist');
  });
  router.addRoute('/child/logout', async () => {
    if (!requireRole('CHILD')) return createRedirectElement();
    return loadScreen('child-logout');
  });

  // === 保護者画面 ===
  router.addRoute('/parent/dashboard', async () => {
    if (!requireRole('PARENT')) return createRedirectElement();
    return loadScreen('parent-dashboard');
  });
  router.addRoute('/parent/quests', async () => {
    if (!requireRole('PARENT')) return createRedirectElement();
    return loadScreen('parent-quests');
  });
  router.addRoute('/parent/settings', async () => {
    if (!requireRole('PARENT')) return createRedirectElement();
    return loadScreen('parent-settings');
  });
  router.addRoute('/parent/children', async () => {
    if (!requireRole('PARENT')) return createRedirectElement();
    return loadScreen('parent-children');
  });
}

/** ロールチェック */
function requireRole(role: 'PARENT' | 'CHILD'): boolean {
  const user = store.get('currentUser');
  if (!user) {
    router.navigate('/');
    return false;
  }
  if (user.role !== role) {
    router.navigate(user.role === 'CHILD' ? '/child/home' : '/parent/dashboard');
    return false;
  }
  return true;
}

/** リダイレクト中の仮要素 */
function createRedirectElement(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'loading-screen';
  el.innerHTML = '<div class="spinner"></div>';
  return el;
}

/** アプリ起動 */
export async function initApp(): Promise<void> {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  // ローディング画面表示
  appEl.innerHTML = `
    <div class="loading-screen">
      <div class="app-logo">🌳</div>
      <div class="spinner"></div>
    </div>
  `;

  // セッション復元
  const hasSession = await restoreSession();

  // ルート設定
  setupRoutes();

  // 初期ルーティング
  if (hasSession) {
    const user = store.get('currentUser');
    if (user) {
      if (!window.location.hash || window.location.hash === '#/') {
        window.location.hash = user.role === 'CHILD' ? '#/child/home' : '#/parent/dashboard';
      }
    }
  }

  // ルーター開始
  router.start(appEl);

  store.set('isLoading', false);

  // 定期データクリーンアップ（24時間に1回バックグラウンド自動実行）
  import('./services/cleanup.service').then(({ cleanupService }) => {
    cleanupService.checkAndCleanup();
  }).catch(() => {});
}
