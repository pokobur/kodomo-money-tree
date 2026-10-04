import{s as l,i as E,r as G}from"./index-DVKodEt2.js";import{c as O}from"./nav-BNXpAq-h.js";import{s as H}from"./modal-Ds6dQjwb.js";import{s as f}from"./toast-C4kZiukH.js";import{q as y}from"./quest.service-eSl7xuyr.js";import{f as R}from"./format-whnyl9xB.js";function te(){const u=document.createElement("div");u.className="screen-container parent-theme",u.style.display="flex",u.style.flexDirection="column",u.style.height="100vh";const b=document.createElement("div");b.style.flexGrow="1",b.style.overflowY="auto",b.style.padding="1rem";const Q=document.createElement("h1");Q.innerText="クエスト管理",b.appendChild(Q);const h=document.createElement("button");h.innerText="+ 新しいクエスト",h.className="primary-btn",h.style.minHeight="48px",h.style.width="100%",h.style.marginBottom="1rem",h.onclick=()=>T(),b.appendChild(h);const _=document.createElement("div");b.appendChild(_),u.appendChild(b),u.appendChild(O("PARENT"));const z=()=>{const e=l.getState();if(!e)return;_.innerHTML="";const d=E().quests||[],p=new Map;(e.quests||[]).forEach(n=>p.set(n.id,n)),d.forEach(n=>p.set(n.id,n));const a=Array.from(p.values());if(a.length===0)_.innerHTML='<p style="text-align: center; color: #666; margin-top: 2rem;">クエストがありません。<br>「＋ 新しいクエスト」から作成してみましょう！</p>';else{const n=e.children||[];a.forEach(t=>{const w=t.assigned_child_id?n.find(g=>g.id===t.assigned_child_id):null,r=w?`<span style="background: #E3F2FD; color: #1565C0; padding: 3px 8px; border-radius: 8px; font-size: 0.8em; font-weight: bold;">🧒 ${w.display_name||"こども"} 専用</span>`:'<span style="background: #FFF8E1; color: #F57F17; padding: 3px 8px; border-radius: 8px; font-size: 0.8em; font-weight: bold;">🌟 全員</span>',c=document.createElement("div");c.className="card",c.style.marginBottom="1rem",c.innerHTML=`
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">${t.title}</h3>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${r}
                            <span style="background: #E8F5E9; color: #2E7D32; padding: 3px 8px; border-radius: 8px; font-size: 0.8em; font-weight: bold;">
                                ${t.repeat_type==="DAILY"?"毎日":t.repeat_type==="WEEKLY"?"毎週":"1回のみ"}
                            </span>
                        </div>
                    </div>
                    ${t.description?`<p style="color: #666; font-size: 0.9em; margin: 6px 0;">${t.description}</p>`:""}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <p style="color: #F57F17; font-weight: bold; font-size: 1.1em; margin: 0;">${R(t.reward_amount)}</p>
                        <span style="font-size: 0.8em; color: #888;">配分: つかう ${t.spending_percent}% / 貯金 ${t.savings_percent}%</span>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <button class="edit-btn" style="flex: 1; min-height: 40px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">編集</button>
                        <button class="toggle-btn" style="flex: 1; min-height: 40px; border-radius: 8px; border: none; background: ${t.is_active?"#EF5350":"#4CAF50"}; color: white; cursor: pointer;">
                            ${t.is_active?"無効にする":"有効にする"}
                        </button>
                        <button class="delete-btn" style="min-height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid #EF5350; background: #FFEBEE; color: #D32F2F; cursor: pointer; font-size: 0.9em;" title="削除">
                            🗑️ 削除
                        </button>
                    </div>
                `;const k=c.querySelector(".edit-btn");k&&(k.onclick=()=>T(t));const i=c.querySelector(".toggle-btn");i&&(i.onclick=async()=>{try{i.disabled=!0,await y.updateQuest(t.id,{is_active:!t.is_active});const g=l.get("family");if(g){const o=await y.getAllQuests(g.id);l.set("quests",o)}f(`クエストを${t.is_active?"無効":"有効"}にしました`,"info")}catch(g){f(g.message||"更新に失敗しました","error"),i.disabled=!1}});const m=c.querySelector(".delete-btn");m&&(m.onclick=()=>D(t)),_.appendChild(c)})}},D=(e,s)=>{const d=document.createElement("div");d.innerHTML=`
            <p style="margin-bottom: 1rem; color: #333; line-height: 1.5;">
                お手伝い「<strong>${e.title}</strong>」を完全に削除しますか？<br>
                <span style="font-size: 0.85em; color: #888;">※この操作は取り消せません。</span>
            </p>
            <div style="display: flex; gap: 10px; margin-top: 1.5rem;">
                <button id="cancel-delete-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">キャンセル</button>
                <button id="exec-delete-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #EF5350; color: white; font-weight: bold; cursor: pointer;">削除する</button>
            </div>
        `;const p=H({title:"クエストの削除",content:d}),a=d.querySelector("#cancel-delete-btn");a&&(a.onclick=()=>p.close());const n=d.querySelector("#exec-delete-btn");n&&(n.onclick=async()=>{try{n.disabled=!0,n.textContent="削除中...",await y.deleteQuest(e.id);const t=l.get("family");if(t){const w=await y.getAllQuests(t.id);l.set("quests",w)}p.close(),s&&s(),f("クエストを削除しました","success")}catch(t){f(t.message||"削除に失敗しました","error"),n.disabled=!1,n.textContent="削除する"}})},T=e=>{var g;const s=l.get("family");if(!s){f("ファミリー情報が取得できません","error");return}const d=(e==null?void 0:e.spending_percent)??100,p=(e==null?void 0:e.savings_percent)??0,a=E(),n=new Set(a.deletedChildIds||[]),w=(((g=l.getState())==null?void 0:g.children)||[]).filter(o=>!n.has(o.id)).map(o=>`
            <option value="${o.id}" ${(e==null?void 0:e.assigned_child_id)===o.id?"selected":""}>
                🧒 ${o.display_name||o.nickname||"こども"} 専用
            </option>
        `).join(""),r=document.createElement("div");r.innerHTML=`
            <div id="quest-modal-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>
            <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">お手伝いのタイトル</label>
            <input type="text" id="quest-title" placeholder="例: おさらあらい" value="${(e==null?void 0:e.title)||""}" style="width: 100%; min-height: 48px; margin-bottom: 12px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">

            <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">くわしい説明（任意）</label>
            <textarea id="quest-desc" placeholder="例: ごはんのあとのおさらを ピカピカにあらおう" style="width: 100%; min-height: 70px; margin-bottom: 12px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">${(e==null?void 0:e.description)||""}</textarea>

            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">対象のお子さま</label>
                <select id="quest-child" style="width: 100%; min-height: 48px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.95rem;">
                    <option value="" ${e!=null&&e.assigned_child_id?"":"selected"}>🌟 ぜんいん（すべてのお子さま）</option>
                    ${w}
                </select>
            </div>

            <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">ごほうびのコイン数</label>
            <input type="number" id="quest-reward" placeholder="例: 50" min="1" value="${(e==null?void 0:e.reward_amount)||"50"}" style="width: 100%; min-height: 48px; margin-bottom: 12px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">くりかえし</label>
                <select id="quest-repeat" style="width: 100%; min-height: 48px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
                    <option value="DAILY" ${(e==null?void 0:e.repeat_type)==="DAILY"?"selected":""}>まいにち（毎日）</option>
                    <option value="WEEKLY" ${(e==null?void 0:e.repeat_type)==="WEEKLY"?"selected":""}>まいしゅう（毎週）</option>
                    <option value="ONCE" ${(e==null?void 0:e.repeat_type)==="ONCE"?"selected":""}>1回だけ</option>
                </select>
            </div>
            
            <label style="display: flex; align-items: center; margin-bottom: 14px; cursor: pointer;">
                <input type="checkbox" id="quest-photo" ${e!=null&&e.requires_photo?"checked":""} style="width: 22px; height: 22px; margin-right: 10px;">
                <span>写真の提出を必須にする</span>
            </label>

            <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">報酬の配分（合計100%）</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="range" id="quest-spending-slider" min="0" max="100" step="5" value="${d}" style="flex-grow: 1;">
                    <span id="quest-ratio-text" style="font-size: 0.9em; min-width: 150px; font-weight: bold; color: #4CAF50;">
                        使う: ${d}% / 貯金: ${p}%
                    </span>
                </div>
            </div>
        `;const c=r.querySelector("#quest-spending-slider"),k=r.querySelector("#quest-ratio-text");c.oninput=()=>{const o=parseInt(c.value,10),S=100-o;k.textContent=`使う: ${o}% / 貯金: ${S}%`};const i=document.createElement("button");i.innerText=e?"更新する":"クエストを作成する",i.className="primary-btn",i.style.minHeight="48px",i.style.width="100%",i.style.marginTop="10px";let m=null;if(i.onclick=async()=>{const o=r.querySelector("#quest-title"),S=r.querySelector("#quest-desc"),Y=r.querySelector("#quest-reward"),K=r.querySelector("#quest-repeat"),$=r.querySelector("#quest-child"),P=r.querySelector("#quest-photo"),x=r.querySelector("#quest-modal-error"),B=o.value.trim(),L=parseInt(Y.value,10),M=parseInt(c.value,10),W=100-M,V=$!=null&&$.value?$.value:null;if(!B){x.textContent="タイトルを入力してください",x.style.display="block";return}if(!L||L<=0){x.textContent="ごほうびコイン数は1枚以上にしてください",x.style.display="block";return}try{i.disabled=!0,i.textContent="保存中...",x.style.display="none";const C={family_id:s.id,title:B,description:S.value.trim(),reward_amount:L,spending_percent:M,savings_percent:W,repeat_type:K.value,requires_photo:P.checked,assigned_child_id:V,is_active:!0};e?(await y.updateQuest(e.id,C),f("クエストを更新しました！","success")):(await y.createQuest(C),f("クエストを作成しました！","success"));const j=await y.getAllQuests(s.id);l.set("quests",j),m==null||m.close()}catch(C){x.textContent=C.message||"クエストの保存に失敗しました",x.style.display="block",i.disabled=!1,i.textContent=e?"更新する":"クエストを作成する"}},r.appendChild(i),e){const o=document.createElement("button");o.innerText="🗑️ このクエストを完全に削除する",o.type="button",o.style.cssText="width: 100%; min-height: 40px; margin-top: 10px; background: transparent; border: 1px solid #EF5350; color: #D32F2F; border-radius: 8px; cursor: pointer; font-size: 0.9em;",o.onclick=()=>{D(e,()=>m==null?void 0:m.close())},r.appendChild(o)}m=H({title:e?"クエスト編集":"新しいクエスト",content:r})};l.onAny(z),z();const v=async()=>{const e=l.get("family");if(e)try{const s=await y.getAllQuests(e.id),p=E().quests||[],a=new Map;s.forEach(n=>a.set(n.id,n)),p.forEach(n=>a.set(n.id,n)),l.set("quests",Array.from(a.values()))}catch(s){console.warn("Failed to load quests in quest-manage:",s)}};v();const A=e=>{if(e.key==="moneytree_data"){const s=E();s.quests&&s.quests.length>0&&l.set("quests",s.quests),v()}},I=()=>{const e=E();e.quests&&e.quests.length>0&&l.set("quests",e.quests),v()};window.addEventListener("storage",A),window.addEventListener("moneytree_local_change",I),window.addEventListener("focus",v);const F=l.get("family"),N=y.subscribeToQuests((F==null?void 0:F.id)||"",()=>v());return G.onCleanup(()=>{N.unsubscribe(),window.removeEventListener("storage",A),window.removeEventListener("moneytree_local_change",I),window.removeEventListener("focus",v)}),u}export{te as createQuestManage};
