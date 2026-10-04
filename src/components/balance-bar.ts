import { store } from '../lib/store';

export function createBalanceBar(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'balance-bar';
  
  container.innerHTML = `
    <div class="balance-section spending">
      <span class="balance-label">💰 つかえる</span>
      <span class="balance-amount" id="spending-amount">0</span>
    </div>
    <div class="balance-section savings">
      <span class="balance-label">🌱 ためる</span>
      <span class="balance-amount" id="savings-amount">0</span>
    </div>
  `;
  
  const spendingEl = container.querySelector('#spending-amount') as HTMLElement;
  const savingsEl = container.querySelector('#savings-amount') as HTMLElement;
  
  const initialAccount = store.getState()?.account;
  let currentSpending = initialAccount?.spending_balance || 0;
  let currentSavings = initialAccount?.savings_balance || 0;
  spendingEl.innerHTML = currentSpending.toLocaleString();
  savingsEl.innerHTML = currentSavings.toLocaleString();
  
  function animateValue(obj: HTMLElement, start: number, end: number, duration: number) {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      obj.innerHTML = current.toLocaleString();
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerHTML = end.toLocaleString();
      }
    };
    window.requestAnimationFrame(step);
  }

  const updateBalances = () => {
    const state = store.getState();
    const account = state?.account;
    if (account) {
      const newSpending = account.spending_balance || 0;
      const newSavings = account.savings_balance || 0;
      if (currentSpending !== newSpending) {
        animateValue(spendingEl, currentSpending, newSpending, 400);
        currentSpending = newSpending;
      } else {
        spendingEl.innerHTML = newSpending.toLocaleString();
      }
      if (currentSavings !== newSavings) {
        animateValue(savingsEl, currentSavings, newSavings, 400);
        currentSavings = newSavings;
      } else {
        savingsEl.innerHTML = newSavings.toLocaleString();
      }
    }
  };

  // Subscribe to store changes
  const unsubscribe = store.onAny(() => {
    updateBalances();
  });
  
  // Cleanup when element is removed (MutationObserver trick or manual if framework)
  // For vanilla, we can just let it update if in DOM, or provide a destroy method.
  
  return container;
}
