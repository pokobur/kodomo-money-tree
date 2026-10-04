// ============================================================
// マネーツリー - アプリケーション エントリーポイント
// ============================================================

import './styles/global.css';
import './styles/components.css';
import './styles/child.css';
import './styles/parent.css';
import { initApp } from './app';

// アプリ起動
initApp().catch(err => {
  console.error('App initialization failed:', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #EF5350;">
        <h2>⚠️ エラー</h2>
        <p>アプリの起動に失敗しました。ページをリロードしてください。</p>
        <button onclick="location.reload()" style="padding: 0.8rem 2rem; border-radius: 12px; border: none; background: #4CAF50; color: white; font-size: 1rem; cursor: pointer;">
          リロード
        </button>
      </div>
    `;
  }
});
