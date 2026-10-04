import{s as v,h as A,i as D,j as oe,m as ae,r as se}from"./index-DVKodEt2.js";import{c as le}from"./nav-BNXpAq-h.js";import{s as y}from"./toast-C4kZiukH.js";import{s as de}from"./modal-Ds6dQjwb.js";import{a as M}from"./account.service-DOlo53QK.js";import{cleanupService as Q}from"./cleanup.service-CWm8_26C.js";import{f as X}from"./format-whnyl9xB.js";const Z={async getFamilyByCode(s){const r=s.toUpperCase();try{const{data:n,error:i}=await A.from("families").select("*").eq("family_code",r).single();if(!i&&n)return n}catch(n){console.warn("getFamilyByCode (Supabase) error, fallback to local:",n)}return D().families.find(n=>n.family_code===r)||null},async updateFamilySettings(s,r){const o=D();Array.isArray(o.families)||(o.families=[]);const n=o.families.findIndex(d=>d.id===s);let i=null;if(n!==-1)o.families[n]={...o.families[n],...r},i=o.families[n];else{const _={...v.get("family")||{id:s,name:"ファミリー",family_code:"------"},...r,id:s};o.families.push(_),i=_}oe(o),v.set("family",{...v.get("family")||{},...i});try{const{data:d,error:_}=await A.from("families").update(r).eq("id",s).select().maybeSingle();if(_)await A.from("families").update({weekly_interest_rate:r.weekly_interest_rate,max_weekly_reward_limit:r.max_weekly_reward_limit}).eq("id",s);else if(d)return{...i,...d,weekly_interest_rate:d.weekly_interest_rate??(i==null?void 0:i.weekly_interest_rate),max_weekly_reward_limit:d.max_weekly_reward_limit??(i==null?void 0:i.max_weekly_reward_limit),interest_schedule_type:d.interest_schedule_type||(i==null?void 0:i.interest_schedule_type),interest_schedule_day:d.interest_schedule_day??(i==null?void 0:i.interest_schedule_day)}}catch(d){console.warn("updateFamilySettings (Supabase) error, updated locally:",d)}return i},async getFamilyCode(s){try{const{data:n,error:i}=await A.from("families").select("family_code").eq("id",s).single();if(!i&&n)return n.family_code}catch(n){console.warn("getFamilyCode (Supabase) error, fallback to local:",n)}const o=D().families.find(n=>n.id===s);return o?o.family_code:null},async generateNewFamilyCode(s){const r=Math.floor(1e5+Math.random()*9e5).toString(),o=await this.updateFamilySettings(s,{family_code:r});return o?(v.set("family",o),r):null}};function fe(){const s=document.createElement("div");s.className="screen-container parent-theme",s.style.display="flex",s.style.flexDirection="column",s.style.height="100vh";const r=document.createElement("div");r.className="parent-settings",r.style.flexGrow="1",r.style.overflowY="auto",r.style.padding="1.25rem",r.style.paddingBottom="5rem";const o=document.createElement("h1");o.innerText="ファミリー設定",o.style.color="#3F51B5",o.style.fontSize="1.75rem",o.style.marginBottom="1.5rem",r.appendChild(o);const n=document.createElement("div");n.className="card",n.style.marginBottom="1.5rem",r.appendChild(n);const i=document.createElement("div");r.appendChild(i);const d=document.createElement("div");r.appendChild(d);const _=document.createElement("div");r.appendChild(_);const g=document.createElement("button");g.innerText="ログアウト",g.className="btn",g.style.width="100%",g.style.minHeight="48px",g.style.marginTop="2rem",g.style.border="2px solid #EF5350",g.style.color="#EF5350",g.style.background="white",g.style.fontWeight="bold",g.onclick=async()=>{await ae(),se.navigate("/")},r.appendChild(g),s.appendChild(r),s.appendChild(le("PARENT"));const W=()=>{var V;const k=v.getState();if(!k)return;const a=k.family,H=D(),N=new Set(H.deletedChildIds||[]),z=(k.children||[]).filter(e=>!N.has(e.id)),I=(H.accounts||[]).filter(e=>!N.has(e.child_id)),ee=(k.accounts||I).filter(e=>!N.has(e.child_id)),T=Math.round(((a==null?void 0:a.weekly_interest_rate)??.05)*100),K=(a==null?void 0:a.max_weekly_reward_limit)??5e3;let j="";z.length===0?j=`
                <div style="background: #F1F8E9; border-radius: 10px; padding: 1rem; color: #555; text-align: center; margin-bottom: 1rem;">
                    こどもが登録されていません。<br>
                    「こども管理」画面からこどもを追加すると、こどもごとに個別の金利ルールを設定できます。
                </div>
            `:j=z.map(e=>{const t=ee.find(b=>b.child_id===e.id),l=(t==null?void 0:t.weekly_interest_rate)!=null?Math.round(t.weekly_interest_rate*100):e.weekly_interest_rate!=null?Math.round(e.weekly_interest_rate*100):T,c=(t==null?void 0:t.max_weekly_reward_limit)!=null?t.max_weekly_reward_limit:e.max_weekly_reward_limit!=null?e.max_weekly_reward_limit:K,h=(t==null?void 0:t.interest_schedule_type)||e.interest_schedule_type||(a==null?void 0:a.interest_schedule_type)||"WEEKLY",m=(t==null?void 0:t.interest_schedule_day)!=null?t.interest_schedule_day:e.interest_schedule_day!=null?e.interest_schedule_day:(a==null?void 0:a.interest_schedule_day)??0,p=e.display_name||(e==null?void 0:e.nickname)||"こども",x=["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"].map((b,u)=>`<option value="${u}" ${m===u?"selected":""}>毎週 ${b}</option>`).join(""),f=Array.from({length:31},(b,u)=>u+1).map(b=>`<option value="${b}" ${m===b?"selected":""}>毎月 ${b}日</option>`).join("");return`
                    <div class="child-rule-box card" data-child-id="${e.id}" style="background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 12px; padding: 1.1rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 38px; height: 38px; border-radius: 19px; background: #81C784; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold;">
                                    ${p[0]||"🧒"}
                                </div>
                                <h3 style="margin: 0; font-size: 1.15rem; color: #2E7D32;">${p}</h3>
                            </div>
                            <span style="background: #E8F5E9; color: #2E7D32; font-size: 0.75rem; font-weight: bold; padding: 3px 8px; border-radius: 6px;">
                                個別設定
                            </span>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="font-weight: bold; font-size: 0.88em; display: block; margin-bottom: 4px;">利息率 (1〜10%)</label>
                            <input type="range" class="child-rate-slider" min="1" max="10" value="${l}" style="width: 100%;">
                            <div class="child-rate-label" style="text-align: right; color: #4CAF50; font-weight: bold; margin-top: 3px; font-size: 0.88rem;">現在: ${l}%</div>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="font-weight: bold; font-size: 0.88em; display: block; margin-bottom: 4px;">報酬上限（コイン）</label>
                            <input type="number" class="child-limit-input" value="${c}" min="100" step="100" style="width: 100%; min-height: 42px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem;">
                        </div>
                        <div style="margin-bottom: 1.1rem; background: #F9FBE7; border: 1px solid #DCE775; border-radius: 8px; padding: 0.75rem;">
                            <label style="font-weight: bold; font-size: 0.88em; display: block; margin-bottom: 6px; color: #33691E;">📅 お小遣い（金利）の付与タイミング</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <select class="child-sched-type" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; background: white;">
                                    <option value="WEEKLY" ${h==="WEEKLY"?"selected":""}>毎週（曜日指定）</option>
                                    <option value="MONTHLY" ${h==="MONTHLY"?"selected":""}>毎月（日にち指定）</option>
                                </select>
                                <select class="child-sched-day-weekly" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; background: white; ${h==="WEEKLY"?"":"display: none;"}">
                                    ${x}
                                </select>
                                <select class="child-sched-day-monthly" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; background: white; ${h==="MONTHLY"?"":"display: none;"}">
                                    ${f}
                                </select>
                            </div>
                        </div>
                        <button class="child-save-btn primary-btn btn-primary" style="width: 100%; min-height: 44px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: white; font-size: 0.95rem;">
                            💾 ${p}の金利ルールを保存
                        </button>
                    </div>
                `}).join("");const te=["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"],L=(a==null?void 0:a.interest_schedule_type)||"WEEKLY",O=(a==null?void 0:a.interest_schedule_day)??0,ne=te.map((e,t)=>`<option value="${t}" ${O===t?"selected":""}>毎週 ${e}</option>`).join(""),ie=Array.from({length:31},(e,t)=>t+1).map(e=>`<option value="${e}" ${O===e?"selected":""}>毎月 ${e}日</option>`).join("");n.innerHTML=`
            <h2 style="font-size: 1.25rem; margin-top: 0; color: #2E7D32;">金利ルール設定（固定こづかい）</h2>
            <p style="font-size: 0.85rem; color: #666; margin-top: -6px; margin-bottom: 1.25rem;">
                お子さまごとに、お小遣い（金利）の割合や報酬上限、付与日（毎週お好きな曜日、または毎月お好きな日）を個別に設定できます。
            </p>
            ${j}
            <div class="card" style="background: #FAFAFA; border: 1px dashed #BDBDBD; border-radius: 12px; padding: 1rem; margin-top: 1rem;">
                <h3 style="margin-top: 0; font-size: 0.95rem; color: #555;">⚙️ ファミリー全体のデフォルト設定</h3>
                <p style="font-size: 0.8rem; color: #777; margin-top: -4px; margin-bottom: 0.75rem;">個別設定がない場合の基準値として使用されます。</p>
                <div style="margin-bottom: 0.75rem;">
                    <label style="font-weight: bold; font-size: 0.85em; display: block; margin-bottom: 4px;">利息率 (1〜10%)</label>
                    <input type="range" id="rate-slider" min="1" max="10" value="${T}" style="width: 100%;">
                    <div id="rate-label" style="text-align: right; color: #4CAF50; font-weight: bold; margin-top: 2px; font-size: 0.85rem;">現在: ${T}%</div>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label style="font-weight: bold; font-size: 0.85em; display: block; margin-bottom: 4px;">報酬上限（コイン）</label>
                    <input type="number" id="limit-input" value="${K}" min="100" step="100" style="width: 100%; min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc;">
                </div>
                <div style="margin-bottom: 1rem; background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 0.6rem;">
                    <label style="font-weight: bold; font-size: 0.85em; display: block; margin-bottom: 6px; color: #555;">📅 デフォルトの付与タイミング</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <select id="default-sched-type" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem;">
                            <option value="WEEKLY" ${L==="WEEKLY"?"selected":""}>毎週（曜日指定）</option>
                            <option value="MONTHLY" ${L==="MONTHLY"?"selected":""}>毎月（日にち指定）</option>
                        </select>
                        <select id="default-sched-day-weekly" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; ${L==="WEEKLY"?"":"display: none;"}">
                            ${ne}
                        </select>
                        <select id="default-sched-day-monthly" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; ${L==="MONTHLY"?"":"display: none;"}">
                            ${ie}
                        </select>
                    </div>
                </div>
                <button id="save-finance-btn" style="width: 100%; min-height: 42px; border: 1px solid #4CAF50; background: white; color: #2E7D32; border-radius: 8px; font-weight: bold; cursor: pointer;">
                    デフォルト設定を保存する
                </button>
            </div>
        `,n.querySelectorAll(".child-rule-box").forEach(e=>{const t=e.getAttribute("data-child-id"),l=e.querySelector(".child-rate-slider"),c=e.querySelector(".child-rate-label"),h=e.querySelector(".child-limit-input"),m=e.querySelector(".child-sched-type"),p=e.querySelector(".child-sched-day-weekly"),w=e.querySelector(".child-sched-day-monthly"),x=e.querySelector(".child-save-btn"),f=z.find(u=>u.id===t),b=(f==null?void 0:f.display_name)||(f==null?void 0:f.nickname)||"こども";l&&c&&(l.oninput=()=>{c.textContent=`現在: ${l.value}%`}),m&&p&&w&&(m.onchange=()=>{m.value==="WEEKLY"?(p.style.display="block",w.style.display="none"):(p.style.display="none",w.style.display="block")}),x&&t&&(x.onclick=async()=>{try{x.disabled=!0,x.textContent="保存中...";const u=parseInt(l.value,10)/100,Y=parseInt(h.value,10)||5e3,J=(m==null?void 0:m.value)||"WEEKLY",re=J==="WEEKLY"?parseInt(p==null?void 0:p.value,10)||0:parseInt(w==null?void 0:w.value,10)||1;await M.updateChildAccountSettings(t,{weekly_interest_rate:u,max_weekly_reward_limit:Y,interest_schedule_type:J,interest_schedule_day:re}),y(`「${b}」の金利ルールを保存しました！`,"success")}catch(u){y(u.message||"保存に失敗しました","error")}finally{x.disabled=!1,x.textContent=`💾 ${b}の設定を保存`}})});const B=n.querySelector("#rate-slider"),R=n.querySelector("#rate-label"),E=n.querySelector("#default-sched-type"),F=n.querySelector("#default-sched-day-weekly"),C=n.querySelector("#default-sched-day-monthly");B&&R&&(B.oninput=()=>{R.textContent=`現在: ${B.value}%`}),E&&F&&C&&(E.onchange=()=>{E.value==="WEEKLY"?(F.style.display="block",C.style.display="none"):(F.style.display="none",C.style.display="block")});const S=n.querySelector("#save-finance-btn");S&&(S.onclick=async()=>{if(a)try{S.disabled=!0,S.textContent="保存中...";const e=parseInt(B.value,10)/100,t=n.querySelector("#limit-input"),l=parseInt(t.value,10)||5e3,c=(E==null?void 0:E.value)||"WEEKLY",h=c==="WEEKLY"?parseInt(F==null?void 0:F.value,10)||0:parseInt(C==null?void 0:C.value,10)||1,m=await Z.updateFamilySettings(a.id,{weekly_interest_rate:e,max_weekly_reward_limit:l,interest_schedule_type:c,interest_schedule_day:h});m&&(v.set("family",{...a,...m}),y("ファミリー全体のデフォルト設定を保存しました！","success"))}catch(e){y(e.message||"保存に失敗しました","error")}finally{S.disabled=!1,S.textContent="デフォルト設定を保存する"}}),i.innerHTML='<h2 style="font-size: 1.2rem; margin: 1.5rem 0 0.75rem;">残高調整（手動補正）</h2>',z.length===0?i.innerHTML+='<div class="card" style="padding: 1rem; color: #888;">こどもが登録されていません</div>':z.forEach(e=>{const t=document.createElement("div");t.className="card",t.style.marginBottom="1rem";const l=(k.accounts||[]).find(p=>p.child_id===e.id)||I.find(p=>p.child_id===e.id),c=(l==null?void 0:l.spending_balance)??0,h=(l==null?void 0:l.savings_balance)??0;t.innerHTML=`
                    <h3 style="margin-top: 0;">${e.display_name}</h3>
                    <div style="font-size: 0.85em; color: #666; margin-bottom: 10px;">
                        つかう残高: <strong style="color: #FF7043;">${X(c)}</strong> | 貯金残高: <strong style="color: #4CAF50;">${X(h)}</strong>
                    </div>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <select class="adj-account" style="flex: 1; min-height: 44px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
                            <option value="SPENDING">つかう口座</option>
                            <option value="SAVINGS">ためる（貯金）口座</option>
                        </select>
                        <input type="number" class="adj-amount" placeholder="金額 (例: 50 または -50)" style="flex: 1; min-height: 44px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
                    </div>
                    <input type="text" class="adj-reason" placeholder="調整の理由 (例: おこづかい、ペナルティ等)" style="width: 100%; min-height: 44px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 10px;">
                    <button class="adj-submit-btn" style="width: 100%; min-height: 44px; border-radius: 8px; border: none; background: #5C6BC0; color: white; font-weight: bold; cursor: pointer;">残高を調整する</button>
                `;const m=t.querySelector(".adj-submit-btn");m.onclick=async()=>{const p=t.querySelector(".adj-account"),w=t.querySelector(".adj-amount"),x=t.querySelector(".adj-reason"),f=parseInt(w.value,10),b=x.value.trim()||"保護者による調整";if(isNaN(f)||f===0){y("0以外の調整金額を入力してください","error");return}try{m.disabled=!0,await M.adjustBalance(e.id,p.value,f,b);const u=v.get("family");if(u){const Y=await M.getAccountsForFamily(u.id);v.set("accounts",Y)}y(`${e.display_name}の残高を調整しました！`,"success"),w.value="",x.value=""}catch(u){y(u.message||"調整に失敗しました","error")}finally{m.disabled=!1}},i.appendChild(t)});const G=((V=k.family)==null?void 0:V.family_code)||"------";d.innerHTML=`
            <h2 style="font-size: 1.2rem; margin: 1.5rem 0 0.75rem;">ファミリーコード</h2>
            <div class="card" style="text-align: center; background: linear-gradient(135deg, #E8EAF6, #C5CAE9); border: 1px solid #9FA8DA;">
                <p style="margin: 0; color: #3F51B5; font-size: 0.9em; font-weight: bold;">お子さまのログイン時に必要です（数字6桁）</p>
                <h2 style="letter-spacing: 4px; font-size: 2.2rem; margin: 0.75rem 0; font-family: monospace; color: #1A237E;">${G}</h2>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <button id="copy-code-settings" style="min-height: 42px; padding: 0 1.25rem; border-radius: 21px; border: none; background: #3F51B5; color: white; font-weight: bold; cursor: pointer;">コードをコピー</button>
                    <button id="regen-code-settings" style="min-height: 42px; padding: 0 1rem; border-radius: 21px; border: 1px solid #3F51B5; background: white; color: #3F51B5; font-weight: bold; cursor: pointer;">数字コードを再発行</button>
                </div>
            </div>
        `;const P=d.querySelector("#copy-code-settings");P&&(P.onclick=()=>{navigator.clipboard.writeText(G),y("ファミリーコードをコピーしました！","info")});const q=d.querySelector("#regen-code-settings");q&&(q.onclick=async()=>{var e;if(confirm(`新しい6桁の数字ファミリーコードを発行しますか？
（お子さまがログインする際のコードが変わります）`))try{if(q.disabled=!0,(e=k.family)!=null&&e.id){const t=await Z.generateNewFamilyCode(k.family.id);y(`新しいファミリーコード(${t})を発行しました`,"success")}}catch(t){y(t.message||"コードの再発行に失敗しました","error"),q.disabled=!1}}),_.innerHTML=`
            <h2 style="font-size: 1.2rem; margin: 1.5rem 0 0.75rem;">データ管理・容量最適化</h2>
            <div class="card" style="padding: 1.25rem;">
                <p style="margin: 0 0 0.75rem 0; font-size: 0.9em; color: #555; line-height: 1.5;">
                    30日以上前の承認・却下済みのお手伝い履歴や古い出金申請など、不要になった履歴データを削除して容量を節約します。<br>
                    <span style="font-size: 0.85em; color: #888;">※未承認データや現在の口座残高はそのまま保持されます。</span>
                </p>
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; margin-bottom: 0.75rem; border-top: 1px solid #eee; border-bottom: 1px solid #eee; font-size: 0.85em; color: #2E7D32;">
                    <span>⚡ 24時間ごとの自動クリーンアップ: <strong>有効</strong></span>
                </div>
                <button id="manual-cleanup-btn" style="width: 100%; min-height: 44px; border-radius: 8px; border: 1px solid #4CAF50; background: #E8F5E9; color: #2E7D32; font-weight: bold; cursor: pointer;">
                    🧹 不要なデータを今すぐ整理する
                </button>

                <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px dashed #EF5350;">
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.9em; color: #D32F2F; font-weight: bold;">
                        ⚠️ データベース初期化（全データリセット）
                    </p>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.8em; color: #777; line-height: 1.4;">
                        登録した子ども、口座残高、クエスト、取引履歴などの全データを消去し、アプリを初期状態に戻します。
                    </p>
                    <button id="reset-all-data-btn" style="width: 100%; min-height: 44px; border-radius: 8px; border: 1px solid #EF5350; background: #FFEBEE; color: #D32F2F; font-weight: bold; cursor: pointer;">
                        🗑️ データベースを初期化する
                    </button>
                </div>
            </div>
        `;const $=_.querySelector("#manual-cleanup-btn");$&&($.onclick=async()=>{try{$.disabled=!0,$.textContent="整理中...";const e=await Q.checkAndCleanup(!0);e?e.submissionsCleaned+e.withdrawalsCleaned+e.transactionsCleaned+e.wishItemsCleaned>0?y(`不要データを整理しました（お手伝い: ${e.submissionsCleaned}件, 出金: ${e.withdrawalsCleaned}件, 履歴: ${e.transactionsCleaned}件）`,"success"):y("削除対象の古い不要データはありませんでした（データは最新です）","info"):y("データの最適化が完了しました","info")}catch(e){y(e.message||"クリーンアップに失敗しました","error")}finally{$.disabled=!1,$.textContent="🧹 不要なデータを今すぐ整理する"}});const U=_.querySelector("#reset-all-data-btn");U&&(U.onclick=()=>{const e=document.createElement("div");e.innerHTML=`
                    <p style="margin-bottom: 1rem; color: #333; line-height: 1.5;">
                        <strong style="color: #D32F2F;">本当にデータベース・全データを初期化しますか？</strong><br><br>
                        登録中のこども、口座残高、クエスト、取引明細、出金申請などのすべてのデータが完全に削除され、初期状態に戻ります。<br>
                        <span style="font-size: 0.85em; color: #888;">※この操作は取り消せません。</span>
                    </p>
                    <div style="display: flex; gap: 10px; margin-top: 1.5rem;">
                        <button id="cancel-reset-modal-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">キャンセル</button>
                        <button id="exec-reset-modal-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #D32F2F; color: white; font-weight: bold; cursor: pointer;">完全に初期化する</button>
                    </div>
                `;const t=de({title:"⚠️ データベース初期化の確認",content:e}),l=e.querySelector("#cancel-reset-modal-btn");l&&(l.onclick=()=>t.close());const c=e.querySelector("#exec-reset-modal-btn");c&&(c.onclick=async()=>{try{c.disabled=!0,c.textContent="初期化中...",await Q.resetAllData(),t.close(),y("データベースを初期化しました","success"),setTimeout(()=>{window.location.href="#/",window.location.reload()},500)}catch(h){y(h.message||"初期化に失敗しました","error"),c.disabled=!1,c.textContent="完全に初期化する"}})})};return v.onAny(W),W(),s}export{fe as createFamilySettings};
