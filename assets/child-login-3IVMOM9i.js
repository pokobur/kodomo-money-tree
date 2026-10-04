import{g as S,n as y,c as w,d as L,r as q}from"./index-DVKodEt2.js";import{s as A}from"./toast-C4kZiukH.js";function N(){const i=document.createElement("div");i.className="child-auth-container child-theme";let u="",f="",m=[];const g=S(),E=g.length>0?`
    <div id="quick-family-container" class="mt-3" style="text-align: center; border-top: 1px dashed #C8E6C9; padding-top: 12px;">
      <p style="font-size: 0.85rem; color: #2E7D32; font-weight: bold; margin-bottom: 6px;">
        💡 この端末で登録されたファミリー
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
        ${g.map(t=>`
          <button type="button" class="btn btn-outline quick-code-btn" data-code="${t.family_code}" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 20px; border-color: #4CAF50; color: #2E7D32; background: #E8F5E9; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            🏠 ${t.name||"ファミリー"} (<strong>${t.family_code}</strong>)
          </button>
        `).join("")}
      </div>
    </div>
  `:"";i.innerHTML=`
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
        ${E}
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
  `;const p=i.querySelector("#child-error"),s=Array.from(i.querySelectorAll("#family-code-inputs .pin-input")),o=i.querySelector("#btn-next-step1");i.querySelector("#family-code-inputs").addEventListener("paste",t=>{var n,a;t.preventDefault();const e=y(((n=t.clipboardData)==null?void 0:n.getData("text"))||"");if(e){for(let d=0;d<s.length;d++)s[d].value=e[d]||"";b();const c=Math.min(e.length,s.length-1);(a=s[c])==null||a.focus()}}),i.querySelectorAll(".quick-code-btn").forEach(t=>{t.addEventListener("click",e=>{const a=e.currentTarget.getAttribute("data-code")||"",c=y(a);if(c){for(let d=0;d<s.length;d++)s[d].value=c[d]||"";b(),o.disabled||o.click()}})}),s.forEach((t,e)=>{t.addEventListener("input",()=>{t.value=y(t.value),t.value&&e<s.length-1&&s[e+1].focus(),b()}),t.addEventListener("keydown",n=>{n.key==="Backspace"&&!t.value&&e>0?s[e-1].focus():n.key==="Enter"&&(b(),o.disabled||o.click())})});function b(){u=y(s.map(t=>t.value).join("")),o.disabled=u.length!==6}o.addEventListener("click",async()=>{try{o.disabled=!0,o.textContent="さがし中...",p.style.display="none";const t=await w(u);if(t.error)throw new Error(t.error);if(m=t.children,m.length===0)throw new Error(`このファミリーには、まだ おともだちが とうろくされていないよ！
おとなのひとに「こども管理」から とうろくしてもらってね。`);k(),h(2)}catch(t){p.textContent=t.message||"エラーがおきたよ",p.style.display="block"}finally{o.textContent="つぎへ",o.disabled=!1}});const v=i.querySelector("#children-list");function k(){v.innerHTML="",m.forEach(t=>{const e=document.createElement("button");e.type="button",e.className="child-select-btn";const n=t.display_name.charAt(0)||"🧒";e.innerHTML=`
        <span class="child-btn-avatar">${n}</span>
        <span class="child-btn-name">${t.display_name}</span>
        <span class="child-btn-arrow">➔</span>
      `,e.addEventListener("click",()=>{f=t.id;const a=i.querySelector("#pin-prompt");a.textContent=`${t.display_name}の PINコードを いれてね`,h(3);const c=i.querySelector("#pin-inputs .pin-input");setTimeout(()=>c==null?void 0:c.focus(),100)}),v.appendChild(e)})}const l=Array.from(i.querySelectorAll("#pin-inputs .pin-input")),r=i.querySelector("#btn-submit-pin");function x(){const t=l.map(e=>e.value).join("");r.disabled=t.length!==4}l.forEach((t,e)=>{t.addEventListener("input",()=>{t.value=t.value.replace(/[^0-9]/g,""),t.value&&e<l.length-1&&l[e+1].focus(),x()}),t.addEventListener("keydown",async n=>{if(n.key==="Backspace"&&!t.value&&e>0)l[e-1].focus();else if(n.key==="Enter"){const a=l.map(c=>c.value).join("");a.length===4&&await C(a)}})}),r.addEventListener("click",async()=>{const t=l.map(e=>e.value).join("");t.length===4&&await C(t)});async function C(t){var e;try{l.forEach(a=>a.disabled=!0),r.disabled=!0,r.textContent="ログイン中...",p.style.display="none";const n=await L(u,f,t);if(!n.success)throw new Error(n.error||"PINコードが ちがうよ");A("ログインしたよ！","success"),q.navigate("/child/home")}catch(n){p.textContent=n.message||"PINコードが ちがうよ",p.style.display="block",l.forEach(a=>{a.value="",a.disabled=!1}),r.textContent="けってい ✨",r.disabled=!0,(e=l[0])==null||e.focus()}finally{l[0]&&!l[0].disabled&&(r.textContent="けってい ✨",x())}}function h(t){i.querySelectorAll(".step-container").forEach(n=>n.style.display="none");const e=i.querySelector("#step"+t+"-container");e&&(e.style.display="block"),p.style.display="none",t===3&&(l.forEach(n=>{n.value="",n.disabled=!1}),r.disabled=!0,r.textContent="けってい ✨")}return i.querySelectorAll(".btn-back").forEach(t=>{t.addEventListener("click",e=>{const n=parseInt(e.currentTarget.getAttribute("data-step")||"1",10);h(n)})}),i}export{N as createChildLoginScreen};
