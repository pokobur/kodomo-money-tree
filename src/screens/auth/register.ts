import { router } from '../../lib/router';
import { registerParent } from '../../lib/auth';
import { showToast } from '../../components/toast';

export function createRegisterScreen(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo">🌳</div>
        <h1>アカウントを つくる</h1>
      </div>

      <div class="error-message" id="register-error" style="display: none;"></div>

      <form id="register-form">
        <div class="form-group">
          <label for="display-name">おなまえ</label>
          <input type="text" id="display-name" class="input" required>
        </div>

        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" class="input" required autocomplete="email">
        </div>
        
        <div class="form-group">
          <label for="password">パスワード (6文字以上)</label>
          <input type="password" id="password" class="input" required autocomplete="new-password">
        </div>

        <div class="form-group">
          <label for="password-confirm">パスワード(かくにん)</label>
          <input type="password" id="password-confirm" class="input" required autocomplete="new-password">
        </div>

        <button type="submit" class="btn btn-primary btn-block">登録する</button>
      </form>

      <div class="auth-links">
        <a href="#/login" class="link">ログインはこちら</a>
      </div>
    </div>
  `;

  const form = container.querySelector('#register-form') as HTMLFormElement;
  const errorDiv = container.querySelector('#register-error') as HTMLDivElement;
  const nameInput = container.querySelector('#display-name') as HTMLInputElement;
  const emailInput = container.querySelector('#email') as HTMLInputElement;
  const passwordInput = container.querySelector('#password') as HTMLInputElement;
  const passwordConfirmInput = container.querySelector('#password-confirm') as HTMLInputElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';

    if (passwordInput.value.length < 6) {
      errorDiv.textContent = 'パスワードは6文字以上にしてください';
      errorDiv.style.display = 'block';
      return;
    }

    if (passwordInput.value !== passwordConfirmInput.value) {
      errorDiv.textContent = 'パスワードが一致しません';
      errorDiv.style.display = 'block';
      return;
    }

    try {
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = '登録中...';

      const res = await registerParent(
        emailInput.value,
        passwordInput.value,
        nameInput.value
      );
      if (!res.success) {
        throw new Error(res.error || '登録に失敗しました');
      }
      
      showToast('アカウントを作成しました', 'success');
      router.navigate('/parent/dashboard');
    } catch (error: any) {
      errorDiv.textContent = error.message || '登録に失敗しました';
      errorDiv.style.display = 'block';
      
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitBtn.disabled = false;
      submitBtn.textContent = '登録する';
    }
  });

  return container;
}
