import{b as d,r as c}from"./index-DVKodEt2.js";import{s as p}from"./toast-C4kZiukH.js";function b(){const e=document.createElement("div");e.className="auth-container",e.innerHTML=`
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
  `;const a=e.querySelector("#register-form"),t=e.querySelector("#register-error"),i=e.querySelector("#display-name"),l=e.querySelector("#email"),o=e.querySelector("#password"),n=e.querySelector("#password-confirm");return a.addEventListener("submit",async u=>{if(u.preventDefault(),t.style.display="none",o.value.length<6){t.textContent="パスワードは6文字以上にしてください",t.style.display="block";return}if(o.value!==n.value){t.textContent="パスワードが一致しません",t.style.display="block";return}try{const s=a.querySelector('button[type="submit"]');s.disabled=!0,s.textContent="登録中...";const r=await d(l.value,o.value,i.value);if(!r.success)throw new Error(r.error||"登録に失敗しました");p("アカウントを作成しました","success"),c.navigate("/parent/dashboard")}catch(s){t.textContent=s.message||"登録に失敗しました",t.style.display="block";const r=a.querySelector('button[type="submit"]');r.disabled=!1,r.textContent="登録する"}}),e}export{b as createRegisterScreen};
