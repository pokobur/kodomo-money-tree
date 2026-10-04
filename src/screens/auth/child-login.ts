import { router } from '../../lib/router';
import { loginChild, getChildrenByFamilyCode, getAvailableLocalFamilies, normalizeFamilyCode } from '../../lib/auth';
import { showToast } from '../../components/toast';

export function createChildLoginScreen(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'child-auth-container child-theme';
  
  let currentStep = 1;
  let familyCode = '';
  let selectedChildId = '';
  let childrenList: { id: string; display_name: string }[] = [];
  const localFamilies = getAvailableLocalFamilies();

  const quickFamilyHtml = localFamilies.length > 0 ? `
    <div id="quick-family-container" class="mt-3" style="text-align: center; border-top: 1px dashed #C8E6C9; padding-top: 12px;">
      <p style="font-size: 0.85rem; color: #2E7D32; font-weight: bold; margin-bottom: 6px;">
        💡 この端末で登録されたファミリー
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
        ${localFamilies.map(f => `
          <button type="button" class="btn btn-outline quick-code-btn" data-code="${f.family_code}" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 20px; border-color: #4CAF50; color: #2E7D32; background: #E8F5E9; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            🏠 ${f.name || 'ファミリー'} (<strong>${f.family_code}</strong>)
          </button>
        `).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="auth-card child-card">
      <div class="auth-header">
        <div class="logo">🌳</div>
        <h1>こんにちは！</h1>
      </div>

      <div class="error-message" id="child-error" style="display: none;"></div>

      <!-- Step 1: Family Code -->
      <div id="step1-container" class="step-container active">
        <h2 style="font-size: 1.25rem; text-align: center; color: #2E7D32;">ファミリーコードを いれてね</h2>
        <div class="pin-input-group family-code-input" id="family-code-inputs">
          <input type="text" maxlength="1" class="pin-box pin-input" autofocus>
          <input type="text" maxlength="1" class="pin-box pin-input">
          <input type="text" maxlength="1" class="pin-box pin-input">
          <input type="text" maxlength="1" class="pin-box pin-input">
          <input type="text" maxlength="1" class="pin-box pin-input">
          <input type="text" maxlength="1" class="pin-box pin-input">
        </div>
        <button id="btn-next-step1" class="btn btn-primary btn-block btn-large mt-4" disabled>つぎへ</button>
        ${quickFamilyHtml}
      </div>

      <!-- Step 2: Select Child -->
      <div id="step2-container" class="step-container" style="display: none;">
        <h2 style="font-size: 1.25rem; text-align: center; color: #2E7D32;">だれかな？</h2>
        <div id="children-list" class="children-grid">
          <!-- Children buttons will be injected here -->
        </div>
        <button class="btn btn-outline btn-block mt-4 btn-back" data-step="1">もどる</button>
      </div>

      <!-- Step 3: PIN Code -->
      <div id="step3-container" class="step-container" style="display: none;">
        <h2 id="pin-prompt" style="font-size: 1.25rem; text-align: center; color: #2E7D32;">PINコードを いれてね</h2>
        <div class="pin-input-group" id="pin-inputs">
          <input type="tel" maxlength="1" class="pin-box pin-input" inputmode="numeric">
          <input type="tel" maxlength="1" class="pin-box pin-input" inputmode="numeric">
          <input type="tel" maxlength="1" class="pin-box pin-input" inputmode="numeric">
          <input type="tel" maxlength="1" class="pin-box pin-input" inputmode="numeric">
        </div>
        <button id="btn-submit-pin" class="btn btn-primary btn-block btn-large mt-4" disabled>けってい ✨</button>
        <button class="btn btn-outline btn-block mt-4 btn-back" data-step="2">もどる</button>
      </div>

      <div class="auth-links mt-4">
        <a href="#/login" class="link">おとなのひとはこちら</a>
      </div>
    </div>
  `;

  const errorDiv = container.querySelector('#child-error') as HTMLDivElement;
  
  // Logic for Family Code (Step 1)
  const familyCodeInputs = Array.from(container.querySelectorAll('#family-code-inputs .pin-input')) as HTMLInputElement[];
  const btnNextStep1 = container.querySelector('#btn-next-step1') as HTMLButtonElement;
  const familyCodeGroup = container.querySelector('#family-code-inputs') as HTMLElement;

  // ペースト（貼り付け）対応: コピーした6桁コードを全ボックスに自動展開
  familyCodeGroup.addEventListener('paste', (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = normalizeFamilyCode(e.clipboardData?.getData('text') || '');
    if (pasted) {
      for (let i = 0; i < familyCodeInputs.length; i++) {
        familyCodeInputs[i].value = pasted[i] || '';
      }
      checkFamilyCodeComplete();
      const lastFilledIndex = Math.min(pasted.length, familyCodeInputs.length - 1);
      familyCodeInputs[lastFilledIndex]?.focus();
    }
  });

  // クイック入力ボタン（この端末で作成されたファミリーがある場合）
  container.querySelectorAll('.quick-code-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.currentTarget as HTMLElement;
      const code = targetBtn.getAttribute('data-code') || '';
      const clean = normalizeFamilyCode(code);
      if (clean) {
        for (let i = 0; i < familyCodeInputs.length; i++) {
          familyCodeInputs[i].value = clean[i] || '';
        }
        checkFamilyCodeComplete();
        if (!btnNextStep1.disabled) {
          btnNextStep1.click();
        }
      }
    });
  });

  familyCodeInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      // 全角英数字を半角大文字に正規化
      input.value = normalizeFamilyCode(input.value);
      if (input.value && index < familyCodeInputs.length - 1) {
        familyCodeInputs[index + 1].focus();
      }
      checkFamilyCodeComplete();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        familyCodeInputs[index - 1].focus();
      } else if (e.key === 'Enter') {
        checkFamilyCodeComplete();
        if (!btnNextStep1.disabled) {
          btnNextStep1.click();
        }
      }
    });
  });

  function checkFamilyCodeComplete() {
    familyCode = normalizeFamilyCode(familyCodeInputs.map(i => i.value).join(''));
    btnNextStep1.disabled = familyCode.length !== 6;
  }

  btnNextStep1.addEventListener('click', async () => {
    try {
      btnNextStep1.disabled = true;
      btnNextStep1.textContent = 'さがし中...';
      errorDiv.style.display = 'none';

      const result = await getChildrenByFamilyCode(familyCode);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      childrenList = result.children;
      
      if (childrenList.length === 0) {
        throw new Error('このファミリーには、まだ おともだちが とうろくされていないよ！\nおとなのひとに「こども管理」から とうろくしてもらってね。');
      }

      renderChildren();
      goToStep(2);
    } catch (err: any) {
      errorDiv.textContent = err.message || 'エラーがおきたよ';
      errorDiv.style.display = 'block';
    } finally {
      btnNextStep1.textContent = 'つぎへ';
      btnNextStep1.disabled = false;
    }
  });

  // Logic for Select Child (Step 2)
  const childrenListDiv = container.querySelector('#children-list') as HTMLDivElement;
  
  function renderChildren() {
    childrenListDiv.innerHTML = '';
    childrenList.forEach(child => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'child-select-btn';
      const initial = child.display_name.charAt(0) || '🧒';

      btn.innerHTML = `
        <span class="child-btn-avatar">${initial}</span>
        <span class="child-btn-name">${child.display_name}</span>
        <span class="child-btn-arrow">➔</span>
      `;
      
      btn.addEventListener('click', () => {
        selectedChildId = child.id;
        const prompt = container.querySelector('#pin-prompt') as HTMLHeadingElement;
        prompt.textContent = `${child.display_name}の PINコードを いれてね`;
        goToStep(3);
        const firstPin = container.querySelector('#pin-inputs .pin-input') as HTMLInputElement;
        setTimeout(() => firstPin?.focus(), 100);
      });
      childrenListDiv.appendChild(btn);
    });
  }

  // Logic for PIN Code (Step 3)
  const pinInputs = Array.from(container.querySelectorAll('#pin-inputs .pin-input')) as HTMLInputElement[];
  const btnSubmitPin = container.querySelector('#btn-submit-pin') as HTMLButtonElement;

  function updatePinSubmitState() {
    const pinCode = pinInputs.map(i => i.value).join('');
    btnSubmitPin.disabled = pinCode.length !== 4;
  }
  
  pinInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, ''); // Numbers only
      if (input.value && index < pinInputs.length - 1) {
        pinInputs[index + 1].focus();
      }
      updatePinSubmitState();
    });
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        pinInputs[index - 1].focus();
      } else if (e.key === 'Enter') {
        const pinCode = pinInputs.map(i => i.value).join('');
        if (pinCode.length === 4) {
          await attemptLogin(pinCode);
        }
      }
    });
  });

  btnSubmitPin.addEventListener('click', async () => {
    const pinCode = pinInputs.map(i => i.value).join('');
    if (pinCode.length === 4) {
      await attemptLogin(pinCode);
    }
  });

  async function attemptLogin(pin: string) {
    try {
      pinInputs.forEach(i => i.disabled = true);
      btnSubmitPin.disabled = true;
      btnSubmitPin.textContent = 'ログイン中...';
      errorDiv.style.display = 'none';

      const result = await loginChild(familyCode, selectedChildId, pin);
      if (!result.success) {
        throw new Error(result.error || 'PINコードが ちがうよ');
      }
      showToast('ログインしたよ！', 'success');
      router.navigate('/child/home');
    } catch (err: any) {
      errorDiv.textContent = err.message || 'PINコードが ちがうよ';
      errorDiv.style.display = 'block';
      pinInputs.forEach(i => {
        i.value = '';
        i.disabled = false;
      });
      btnSubmitPin.textContent = 'けってい ✨';
      btnSubmitPin.disabled = true;
      pinInputs[0]?.focus();
    } finally {
      if (pinInputs[0] && !pinInputs[0].disabled) {
        btnSubmitPin.textContent = 'けってい ✨';
        updatePinSubmitState();
      }
    }
  }

  // Navigation between steps
  function goToStep(step: number) {
    container.querySelectorAll('.step-container').forEach(el => (el as HTMLElement).style.display = 'none');
    const stepContainer = container.querySelector('#step' + step + '-container') as HTMLElement;
    if (stepContainer) stepContainer.style.display = 'block';
    
    currentStep = step;
    errorDiv.style.display = 'none';

    if (step === 3) {
      pinInputs.forEach(i => {
        i.value = '';
        i.disabled = false;
      });
      btnSubmitPin.disabled = true;
      btnSubmitPin.textContent = 'けってい ✨';
    }
  }

  // Back buttons
  container.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetStep = parseInt((e.currentTarget as HTMLElement).getAttribute('data-step') || '1', 10);
      goToStep(targetStep);
    });
  });

  return container;
}
