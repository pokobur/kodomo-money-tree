import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { loginParent, loginWithGoogle } from '../../lib/auth';
import { showToast } from '../../components/toast';

export function createLoginScreen(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo">🌳</div>
        <h1>ログイン</h1>
        <p class="subtitle">こどもマネーツリー</p>
      </div>

      <div class="error-message" id="login-error" style="display: none;"></div>

      <form id="login-form">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" class="input" required autocomplete="email">
        </div>
        
        <div class="form-group">
          <label for="password">パスワード</label>
          <input type="password" id="password" class="input" required autocomplete="current-password">
        </div>

        <button type="submit" class="btn btn-primary btn-block">ログイン</button>
      </form>

      <div class="divider">
        <span>または</span>
      </div>

      <button id="btn-google" class="btn btn-outline btn-block">
        <span class="icon">G</span> Googleでログイン
      </button>

      <div class="auth-links">
        <a href="#/register" class="link">はじめてのかたはこちら</a>
        <a href="#/child-login" class="link child-link">おこさまログインはこちら</a>
      </div>
    </div>
  `;

  // Attach event listeners
  const form = container.querySelector('#login-form') as HTMLFormElement;
  const errorDiv = container.querySelector('#login-error') as HTMLDivElement;
  const btnGoogle = container.querySelector('#btn-google') as HTMLButtonElement;
  const emailInput = container.querySelector('#email') as HTMLInputElement;
  const passwordInput = container.querySelector('#password') as HTMLInputElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    try {
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = 'ログイン中...';
      
      const res = await loginParent(email, password);
      if (!res.success) throw new Error(res.error);
      showToast('ログインしました', 'success');
      router.navigate('/parent/dashboard');
    } catch (error: any) {
      errorDiv.textContent = error.message || 'ログインに失敗しました';
      errorDiv.style.display = 'block';
    } finally {
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitBtn.disabled = false;
      submitBtn.textContent = 'ログイン';
    }
  });

  btnGoogle.addEventListener('click', async () => {
    try {
      btnGoogle.disabled = true;
      await loginWithGoogle();
      // On success, redirect will be handled by auth listener typically,
      // but if popup succeeds:
      showToast('ログインしました', 'success');
      router.navigate('/parent/dashboard');
    } catch (error: any) {
      errorDiv.textContent = error.message || 'Googleログインに失敗しました';
      errorDiv.style.display = 'block';
      btnGoogle.disabled = false;
    }
  });

  return container;
}
