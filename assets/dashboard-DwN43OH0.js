import{m as Fe,r as ge,s as m,i as V,o as Se,h as $e}from"./index-DVKodEt2.js";import{c as ze}from"./nav-BNXpAq-h.js";import{s as w}from"./toast-C4kZiukH.js";import{s as ue}from"./modal-Ds6dQjwb.js";import{q as j}from"./quest.service-eSl7xuyr.js";import{w as P}from"./withdrawal.service-CTx2i8xT.js";import{a as fe}from"./account.service-DOlo53QK.js";import{f as k,a as ke}from"./format-whnyl9xB.js";function Ie(){const v=document.createElement("div");v.className="screen-container parent-theme",v.style.display="flex",v.style.flexDirection="column",v.style.height="100vh";const p=document.createElement("div");p.className="parent-dashboard",p.style.flexGrow="1",p.style.overflowY="auto",p.style.padding="1.25rem",p.style.paddingBottom="5rem";const E=document.createElement("div");E.style.display="flex",E.style.justifyContent="space-between",E.style.alignItems="center",E.style.marginBottom="1.5rem";const A=document.createElement("h1");A.innerText="ダッシュボード",A.style.margin="0",A.style.fontSize="1.75rem",A.style.color="#3F51B5";const _=document.createElement("button");_.innerText="ログアウト",_.className="btn btn-outline",_.style.padding="0.4rem 1rem",_.style.minHeight="36px",_.style.fontSize="0.85rem",_.onclick=async()=>{await Fe(),ge.navigate("/")},E.appendChild(A),E.appendChild(_),p.appendChild(E);const X=document.createElement("div");p.appendChild(X);const I=document.createElement("div");p.appendChild(I);const H=document.createElement("div");p.appendChild(H);const q=document.createElement("div");p.appendChild(q);const G=document.createElement("div");p.appendChild(G),v.appendChild(p),v.appendChild(ze("PARENT"));const Z=()=>{var de,ce,me,pe;const n=m.getState();if(!n)return;const u=V(),a=new Set(u.deletedChildIds||[]),C=new Map;(u.users||[]).filter(e=>e.role==="CHILD"&&!a.has(e.id)).forEach(e=>C.set(e.id,e)),(n.children||[]).filter(e=>!a.has(e.id)).forEach(e=>C.set(e.id,{...C.get(e.id),...e}));const l=Array.from(C.values()),F=new Set(l.map(e=>e.id)),O=((de=n.family)==null?void 0:de.id)||((me=(ce=u.families)==null?void 0:ce[0])==null?void 0:me.id),Q=(u.submissions||[]).filter(e=>!a.has(e.child_id)),R=(n.submissions||[]).filter(e=>!a.has(e.child_id)),S=new Map;R.forEach(e=>S.set(e.id,e)),Q.forEach(e=>S.set(e.id,e));const U=Array.from(S.values()),Y=(u.withdrawals||[]).filter(e=>!a.has(e.child_id)),L=(n.withdrawals||[]).filter(e=>!a.has(e.child_id)),M=new Map;L.forEach(e=>M.set(e.id,e)),Y.forEach(e=>M.set(e.id,e));const J=Array.from(M.values()),T=u.quests||[],B=new Map;(n.quests||[]).forEach(e=>B.set(e.id,e)),T.forEach(e=>B.set(e.id,e));const t=Array.from(B.values()),D=(u.accounts||[]).filter(e=>!a.has(e.child_id)),ne=e=>{const o=(n.accounts||[]).find(r=>r.child_id===e),s=(D||[]).find(r=>r.child_id===e);if(!o)return s;if(!s)return o;const h=(s.spending_balance||0)+(s.savings_balance||0),i=(o.spending_balance||0)+(o.savings_balance||0);return s._local_transfer_at||h>0&&i===0?s:o};let ie=0,re=0;l.forEach(e=>{const o=ne(e.id);ie+=(o==null?void 0:o.spending_balance)??e.spending_balance??0,re+=(o==null?void 0:o.savings_balance)??e.savings_balance??0});const $=U.filter(e=>e.status==="PENDING"&&(F.has(e.child_id)||e.family_id===O||!e.family_id)),z=J.filter(e=>(e.status==="PENDING"||e.status==="COOLDOWN")&&(F.has(e.child_id)||e.family_id===O||!e.family_id)),se=$.length+z.length,ve=se>0?`
            <div class="card" style="background: linear-gradient(135deg, #FFF8E1, #FFECB3); border: 2px solid #FFA000; border-radius: 12px; padding: 12px 16px; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(255,160,0,0.18);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.8rem;">🔔</span>
                    <div>
                        <div style="font-weight: 800; color: #E65100; font-size: 1.05rem;">承認待ちのリクエストが ${se}件 あります！</div>
                        <div style="font-size: 0.85rem; color: #6D4C41; margin-top: 2px;">
                            ${$.length>0?`クエスト報告: <strong>${$.length}件</strong> `:""}
                            ${z.length>0?`出金・購入: <strong>${z.length}件</strong>`:""}
                        </div>
                    </div>
                </div>
            </div>
        `:"";X.innerHTML=`
            ${ve}
            <div class="summary-cards" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="card" style="padding: 1rem; text-align: center; border-left: 4px solid #FF7043; background: #FFF8E1;">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">💳 つかえるお金（合計）</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #E65100; margin-top: 4px;">${k(ie)}</div>
                </div>
                <div class="card" style="padding: 1rem; text-align: center; border-left: 4px solid #4CAF50; background: #F1F8E9;">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">🏦 貯金額（合計）</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #2E7D32; margin-top: 4px;">${k(re)}</div>
                </div>
                <div class="card" style="padding: 1rem; text-align: center; border-left: 4px solid #42A5F5;">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">登録中のこども</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #1976D2; margin-top: 4px;">${l.length}人</div>
                </div>
                <div class="card" style="padding: 1rem; text-align: center; border-left: 4px solid #FFD700;">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">有効なクエスト</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #F57F17; margin-top: 4px;">${t.filter(e=>e.is_active).length}件</div>
                </div>
            </div>
        `;const Ee=$.length>0?`<span style="background: #E65100; color: white; font-size: 0.8rem; font-weight: bold; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">${$.length}</span>`:"";I.innerHTML=`<h2 style="font-size: 1.25rem; margin-bottom: 0.75rem; color: #333; display: flex; align-items: center;">承認待ちのクエスト ${Ee}</h2>`,$.length===0?I.innerHTML+='<div class="card" style="padding: 1rem; text-align: center; color: #888; margin-bottom: 1.5rem;">現在、承認待ちのクエスト報告はありません</div>':$.forEach(e=>{const o=t.find(c=>c.id===e.quest_id),s=l.find(c=>c.id===e.child_id),h=(s==null?void 0:s.display_name)||"こども",i=(o==null?void 0:o.title)||e.quest_title||"クエスト",r=document.createElement("div");r.className="card approval-card",r.style.marginBottom="1rem",r.style.borderLeft="4px solid #FFA726",r.innerHTML=`
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 1.1rem;">${h}</h3>
                        <span style="color: #666; font-size: 0.8em;">${ke(e.submitted_at)}</span>
                    </div>
                    <p style="margin: 6px 0; font-weight: bold; color: #333;">クエスト: ${i}</p>
                    ${o!=null&&o.reward_amount||e.reward_amount?`<p style="margin: 4px 0; color: #F57F17; font-weight: bold;">報酬: ${k((o==null?void 0:o.reward_amount)??e.reward_amount)}</p>`:""}
                    ${e.photo_url?`<img src="${e.photo_url}" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin: 8px 0;" alt="提出写真" />`:""}
                    <div style="display: flex; gap: 10px; margin-top: 12px;">
                        <button class="approve-btn btn-primary" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #4CAF50; color: white; font-weight: bold; cursor: pointer;">承認する</button>
                        <button class="reject-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #EF5350; background: white; color: #EF5350; font-weight: bold; cursor: pointer;">差し戻し</button>
                    </div>
                `;const b=r.querySelector(".approve-btn");b.onclick=async()=>{try{b.disabled=!0,b.textContent="承認中...",await j.approveSubmission(e.id),await d(),w(`${h}のクエストを承認しました！報酬を付与しました`,"success")}catch(c){w(c.message||"承認に失敗しました","error"),b.disabled=!1,b.textContent="承認する"}};const f=r.querySelector(".reject-btn");f.onclick=()=>{const c=document.createElement("div");c.innerHTML=`
                        <p style="margin-bottom: 0.75rem; color: #333; line-height: 1.5;">
                            <strong>${h}</strong> の「<strong>${i}</strong>」を差し戻します。<br>
                            お子さまに伝えたい理由やアドバイスを入力してください。
                        </p>
                        <label style="display: block; font-weight: bold; font-size: 0.9rem; color: #555; margin-bottom: 6px;">差し戻しの理由・コメント</label>
                        <textarea id="reject-comment-input" rows="3" placeholder="例: もう少しきれいに片付けてみてね！" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.95rem; box-sizing: border-box; resize: vertical; margin-bottom: 1.25rem; font-family: inherit;"></textarea>
                        <div style="display: flex; gap: 10px;">
                            <button id="cancel-reject-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">キャンセル</button>
                            <button id="submit-reject-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #EF5350; color: white; font-weight: bold; cursor: pointer;">差し戻す</button>
                        </div>
                    `;const N=ue({title:"クエストの差し戻し",content:c}),y=c.querySelector("#cancel-reject-btn");y&&(y.onclick=()=>N.close());const x=c.querySelector("#submit-reject-btn"),W=c.querySelector("#reject-comment-input");x&&W&&(x.onclick=async()=>{const K=W.value.trim()||"もう一度がんばってみよう！";try{x.disabled=!0,x.textContent="処理中...",await j.rejectSubmission(e.id,K),await d(),N.close(),w("クエストを差し戻しました","info")}catch(Ce){w(Ce.message||"処理に失敗しました","error"),x.disabled=!1,x.textContent="差し戻す"}})},I.appendChild(r)});const _e=z.length>0?`<span style="background: #1976D2; color: white; font-size: 0.8rem; font-weight: bold; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">${z.length}</span>`:"";H.innerHTML=`<h2 style="font-size: 1.25rem; margin-bottom: 0.75rem; color: #333; display: flex; align-items: center;">出金リクエスト ${_e}</h2>`,z.length===0?H.innerHTML+='<div class="card" style="padding: 1rem; text-align: center; color: #888; margin-bottom: 1.5rem;">出金リクエストはありません</div>':z.forEach(e=>{const o=l.find(f=>f.id===e.child_id),s=(o==null?void 0:o.display_name)||"こども",h=(e.purpose||"記載なし").replace(/\[[^\]]+\]/,"").trim(),i=document.createElement("div");i.className="card",i.style.marginBottom="1rem",i.style.borderLeft="4px solid #42A5F5",i.innerHTML=`
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 1.1rem;">${s}</h3>
                        <span style="background: ${e.source_account==="SPENDING"?"#E3F2FD":"#E8F5E9"}; color: ${e.source_account==="SPENDING"?"#1565C0":"#2E7D32"}; font-size: 0.8rem; font-weight: bold; padding: 2px 8px; border-radius: 6px;">${e.source_account==="SPENDING"?"💳 つかえるお金から":"🏦 貯金から"}</span>
                    </div>
                    <p style="font-size: 1.2rem; font-weight: bold; color: #E65100; margin: 6px 0;">${k(e.amount)}</p>
                    <p style="margin: 4px 0; color: #555;">つかいみち: ${h}</p>
                    <div style="display: flex; gap: 10px; margin-top: 12px;">
                        <button class="approve-w-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #4CAF50; color: white; font-weight: bold; cursor: pointer;">承認</button>
                        <button class="reject-w-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #EF5350; background: white; color: #EF5350; font-weight: bold; cursor: pointer;">差し戻し</button>
                    </div>
                `;const r=i.querySelector(".approve-w-btn");r.onclick=async()=>{try{r.disabled=!0,r.textContent="承認中...",await P.approveWithdrawal(e.id),await d(),w(`${s}の出金を承認しました`,"success")}catch(f){w(f.message||"失敗しました","error"),r.disabled=!1,r.textContent="承認"}};const b=i.querySelector(".reject-w-btn");b.onclick=()=>{const f=document.createElement("div");f.innerHTML=`
                        <p style="margin-bottom: 0.75rem; color: #333; line-height: 1.5;">
                            <strong>${s}</strong> の出金リクエスト「<strong>${k(e.amount)} (${h})</strong>」を差し戻します。<br>
                            お子さまに伝えたい理由やアドバイスを入力してください。
                        </p>
                        <label style="display: block; font-weight: bold; font-size: 0.9rem; color: #555; margin-bottom: 6px;">差し戻しの理由・コメント</label>
                        <textarea id="reject-withdrawal-comment-input" rows="3" placeholder="例: 今月は使いすぎだから、また来月考えようね" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.95rem; box-sizing: border-box; resize: vertical; margin-bottom: 1.25rem; font-family: inherit;"></textarea>
                        <div style="display: flex; gap: 10px;">
                            <button id="cancel-reject-w-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">キャンセル</button>
                            <button id="submit-reject-w-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #EF5350; color: white; font-weight: bold; cursor: pointer;">差し戻す</button>
                        </div>
                    `;const c=ue({title:"出金リクエストの差し戻し",content:f}),N=f.querySelector("#cancel-reject-w-btn");N&&(N.onclick=()=>c.close());const y=f.querySelector("#submit-reject-w-btn"),x=f.querySelector("#reject-withdrawal-comment-input");y&&x&&(y.onclick=async()=>{const W=x.value.trim()||"また今度考えようね！";try{y.disabled=!0,y.textContent="処理中...",await P.rejectWithdrawal(e.id,W),await d(),c.close(),w("出金リクエストを差し戻しました","info")}catch(K){w(K.message||"失敗しました","error"),y.disabled=!1,y.textContent="差し戻す"}})},H.appendChild(i)}),q.innerHTML='<h2 style="font-size: 1.25rem; margin-bottom: 0.75rem; color: #333;">こどもたち</h2>',l.length===0?q.innerHTML+='<div class="card" style="padding: 1rem; text-align: center; color: #888; margin-bottom: 1.5rem;">登録されているこどもがいません</div>':l.forEach(e=>{const o=document.createElement("div");o.className="card",o.style.marginBottom="0.75rem",o.style.display="flex",o.style.alignItems="center",o.style.gap="12px";const s=e.display_name||e.nickname||"こども",h=s[0],i=ne(e.id),r=(i==null?void 0:i.spending_balance)??e.spending_balance??0,b=(i==null?void 0:i.savings_balance)??e.savings_balance??0;o.innerHTML=`
                    <div style="width: 44px; height: 44px; border-radius: 22px; background: #5C6BC0; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; flex-shrink: 0;">
                        ${h}
                    </div>
                    <div style="flex-grow: 1;">
                        <h3 style="margin: 0; font-size: 1.05rem;">${s}</h3>
                        <div style="font-size: 0.85em; color: #666; margin-top: 2px;">
                            つかえる: <strong style="color: #FF7043; font-size: 1.05em;">${k(r)}</strong> | 貯金: <strong style="color: #4CAF50; font-size: 1.05em;">${k(b)}</strong>
                        </div>
                    </div>
                `,q.appendChild(o)});const ae=((pe=n.family)==null?void 0:pe.family_code)||"------";G.innerHTML=`
            <div class="card" style="margin-top: 1.5rem; text-align: center; background: linear-gradient(135deg, #E8EAF6, #C5CAE9); border: 1px solid #9FA8DA;">
                <p style="margin: 0; color: #3F51B5; font-weight: bold; font-size: 0.9rem;">ファミリーコード</p>
                <h2 style="margin: 8px 0; letter-spacing: 4px; font-size: 2rem; color: #1A237E; font-family: monospace;">${ae}</h2>
                <button id="copy-code-btn" style="min-height: 40px; padding: 0 1.5rem; border-radius: 20px; border: none; background: #3F51B5; color: white; font-weight: bold; cursor: pointer;">コードをコピー</button>
            </div>
        `;const le=G.querySelector("#copy-code-btn");le&&(le.onclick=()=>{navigator.clipboard.writeText(ae),w("ファミリーコードをコピーしました！","info")})};m.onAny(Z),Z();const d=async()=>{var C;const n=V(),u=m.get("family")||n.families[0],a=(u==null?void 0:u.id)||((C=m.get("currentUser"))==null?void 0:C.family_id);if(a)try{const l=new Set(n.deletedChildIds||[]);let F=[];if(Se){const{data:t}=await $e.from("users").select("*").eq("family_id",a).eq("role","CHILD");t&&(F=t.filter(D=>!l.has(D.id)))}n.users.filter(t=>t.family_id===a&&t.role==="CHILD"&&!l.has(t.id)).forEach(t=>{F.some(D=>D.id===t.id)||F.push(t)}),m.set("children",F);const Q=await j.getSubmissions(a),R=(n.submissions||[]).filter(t=>(t.family_id===a||!t.family_id)&&!l.has(t.child_id)),S=new Map;Q.forEach(t=>S.set(t.id,t)),R.forEach(t=>S.set(t.id,t)),m.set("submissions",Array.from(S.values()));const U=await P.getWithdrawals(a),Y=(n.withdrawals||[]).filter(t=>(t.family_id===a||!t.family_id)&&!l.has(t.child_id)),L=new Map;U.forEach(t=>L.set(t.id,t)),Y.forEach(t=>L.set(t.id,t)),m.set("withdrawals",Array.from(L.values()));const M=await j.getAllQuests(a),J=n.quests||[],T=new Map;M.forEach(t=>T.set(t.id,t)),J.forEach(t=>T.set(t.id,t)),m.set("quests",Array.from(T.values()));const B=await fe.getAccountsForFamily(a);m.set("accounts",B.filter(t=>!l.has(t.child_id)))}catch(l){console.warn("Failed to refresh dashboard data:",l)}};d();const ee=()=>{const n=V();n.accounts&&n.accounts.length>0&&m.set("accounts",n.accounts),n.quests&&n.quests.length>0&&m.set("quests",n.quests),n.submissions&&m.set("submissions",n.submissions),n.withdrawals&&m.set("withdrawals",n.withdrawals)},te=n=>{n.key==="moneytree_data"&&(ee(),d())},oe=()=>{ee(),d()};window.addEventListener("storage",te),window.addEventListener("moneytree_local_change",oe),window.addEventListener("focus",d);const g=m.get("family"),he=j.subscribeToSubmissions((g==null?void 0:g.id)||"",()=>d()),be=j.subscribeToQuests((g==null?void 0:g.id)||"",()=>d()),ye=P.subscribeToWithdrawals((g==null?void 0:g.id)||"",()=>d()),xe=fe.subscribeToFamilyAccounts((g==null?void 0:g.id)||"",()=>d()),we=window.setInterval(d,3e3);return ge.onCleanup(()=>{window.clearInterval(we),he.unsubscribe(),be.unsubscribe(),ye.unsubscribe(),xe.unsubscribe(),window.removeEventListener("storage",te),window.removeEventListener("moneytree_local_change",oe),window.removeEventListener("focus",d)}),v}export{Ie as createParentDashboard};
