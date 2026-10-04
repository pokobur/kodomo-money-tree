import{l as b,r as l,a as m}from"./index-DVKodEt2.js";import{s as i}from"./toast-C4kZiukH.js";function g(){const e=document.createElement("div");e.className="auth-container",e.innerHTML=`
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
  `;const o=e.querySelector("#login-form"),s=e.querySelector("#login-error"),a=e.querySelector("#btn-google"),c=e.querySelector("#email"),d=e.querySelector("#password");return o.addEventListener("submit",async r=>{r.preventDefault(),s.style.display="none";const u=c.value,p=d.value;try{const t=o.querySelector('button[type="submit"]');t.disabled=!0,t.textContent="ログイン中...";const n=await b(u,p);if(!n.success)throw new Error(n.error);i("ログインしました","success"),l.navigate("/parent/dashboard")}catch(t){s.textContent=t.message||"ログインに失敗しました",s.style.display="block"}finally{const t=o.querySelector('button[type="submit"]');t.disabled=!1,t.textContent="ログイン"}}),a.addEventListener("click",async()=>{try{a.disabled=!0,await m(),i("ログインしました","success"),l.navigate("/parent/dashboard")}catch(r){s.textContent=r.message||"Googleログインに失敗しました",s.style.display="block",a.disabled=!1}}),e}export{g as createLoginScreen};
