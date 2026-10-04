import{s as n,r as Z,i as J}from"./index-DVKodEt2.js";import{c as Q}from"./nav-BNXpAq-h.js";import{s as U}from"./modal-Ds6dQjwb.js";import{s as k}from"./toast-C4kZiukH.js";import{a as _,w as L}from"./withdrawal.service-CTx2i8xT.js";import{a as H}from"./account.service-DOlo53QK.js";import{f as F}from"./format-whnyl9xB.js";import{s as P}from"./sound-Bkfm5yFF.js";function ae(){var M,N;const w=document.createElement("div");w.className="screen-container child-theme",w.style.display="flex",w.style.flexDirection="column",w.style.height="100vh";const m=document.createElement("div");m.className="wishlist-screen",m.style.flexGrow="1",m.style.overflowY="auto",m.style.padding="1.25rem",m.style.paddingBottom="5rem";const S=document.createElement("h1");S.innerText="ほしいものリスト 🎁",S.style.textAlign="center",S.style.color="#2E7D32",S.style.margin="0 0 1rem 0",m.appendChild(S);const d=document.createElement("button");d.innerText="＋ ほしいものを ついか",d.className="primary-btn btn-primary",d.style.minHeight="48px",d.style.width="100%",d.style.marginBottom="1.25rem",d.style.fontWeight="bold",d.style.fontSize="1.05rem",d.style.border="none",d.style.borderRadius="12px",d.style.cursor="pointer",d.style.color="white",d.onclick=()=>j(),m.appendChild(d);const g=document.createElement("div");g.className="wishlist-grid",g.style.display="grid",g.style.gridTemplateColumns="repeat(auto-fill, minmax(260px, 1fr))",g.style.gap="1rem",m.appendChild(g),w.appendChild(m),w.appendChild(Q("CHILD"));const W=()=>{var f,y,u;const e=n.getState();if(!e)return;g.innerHTML="";const i=(f=e.currentUser)==null?void 0:f.id,a=J(),r=e.wishItems&&e.wishItems.length>0?e.wishItems:(a.wishItems||[]).filter(t=>!i||t.child_id===i),o=e.withdrawals&&e.withdrawals.length>0?e.withdrawals:(a.withdrawals||[]).filter(t=>!i||t.child_id===i),s=new Set;o.forEach(t=>{if(t.status==="APPROVED"&&t.purpose){const p=t.purpose.match(/\[([a-zA-Z0-9_-]+)\]/);p&&p[1]&&(s.add(p[1]),_.deleteWishItem(p[1]).catch(()=>{}))}});const l=r.filter(t=>!t.is_purchased&&!s.has(t.id)),h=((y=e.account)==null?void 0:y.savings_balance)||0;if((u=e.account)!=null&&u.spending_balance,l.length===0){g.innerHTML='<div class="card" style="grid-column: 1 / -1; text-align: center; color: #888; padding: 2rem;">ほしいものを とうろくして、目標にむかって ちょきんしよう！</div>';return}l.forEach(t=>{const p=Math.min(100,Math.round(h/t.target_price*100)),x=h>=t.target_price,I=x,C=o.some(v=>{var $;return v.child_id===(($=e.currentUser)==null?void 0:$.id)&&(v.status==="PENDING"||v.status==="COOLDOWN")&&v.purpose&&v.purpose.includes(`[${t.id}]`)}),c=document.createElement("div");c.className="card wish-card",c.style.display="flex",c.style.flexDirection="column",c.style.gap="8px",x&&(c.style.border="2px solid #FFD700",c.style.boxShadow="0 4px 15px rgba(255, 215, 0, 0.3)"),c.innerHTML=`
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <h3 style="margin: 0; font-size: 1.15rem; color: #333; flex: 1; word-break: break-word;">${t.title}</h3>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        ${x?'<span style="background: #FFD700; color: #000; font-weight: bold; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; white-space: nowrap;">🎉 かえるよ！</span>':""}
                        <button class="delete-wish-btn" title="リストから けす" style="background: #FFEBEE; border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #D32F2F; font-size: 0.95rem; transition: background 0.2s;">🗑️</button>
                    </div>
                </div>
                ${t.image_url?`<img src="${t.image_url}" onerror="this.style.display='none'" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin: 4px 0;" alt="${t.title}" />`:""}
                <div style="font-weight: 800; font-size: 1.25rem; color: #2E7D32;">${F(t.target_price)}</div>
                
                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 4px;">
                        <span>ちょきんのわりあい</span>
                        <strong style="color: ${x?"#2E7D32":"#F57F17"};">${p}%</strong>
                    </div>
                    <div style="background: #E0E0E0; height: 12px; border-radius: 6px; overflow: hidden;">
                        <div style="background: linear-gradient(to right, #81C784, #4CAF50); width: ${p}%; height: 100%; transition: width 0.5s ease;"></div>
                    </div>
                </div>

                ${t.matching_bonus_percent?`
                    <div style="background: #FFF3E0; color: #E65100; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;">
                        👨‍👩‍👦 パパママが ${t.matching_bonus_percent}% おうえん中！
                    </div>
                `:""}

                <div style="font-size: 0.8em; color: #888; margin-top: auto;">
                    のこり: ${x?"0 コイン (ごーる！)":`${F(Math.max(0,t.target_price-h))}`}
                </div>

                ${C?`
                    <div style="background: #FFF3E0; color: #E65100; border: 1px solid #FFE0B2; padding: 8px 12px; border-radius: 10px; font-weight: bold; font-size: 0.9rem; text-align: center; margin-top: 8px;">
                        ⏳ おとなのひとの かくにんまち
                    </div>
                `:I?`
                    <button class="buy-wish-btn" style="width: 100%; min-height: 44px; background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; font-weight: bold; font-size: 0.95rem; border: none; border-radius: 10px; cursor: pointer; margin-top: 8px; box-shadow: 0 2px 8px rgba(46, 125, 50, 0.3);">
                        🛍️ これを かう！ (${F(t.target_price)})
                    </button>
                `:""}
            `;const D=c.querySelector(".delete-wish-btn");D&&(D.onclick=async v=>{var $,q;if(v.stopPropagation(),!!confirm(`「${t.title}」を リストから けしますか？`))try{D.disabled=!0,await _.deleteWishItem(t.id);const z=(q=($=n.getState())==null?void 0:$.currentUser)==null?void 0:q.id;if(z){const Y=await _.getWishItems(z);n.set("wishItems",Y)}k(`「${t.title}」を けしたよ`,"info")}catch(z){k(z.message||"けすのに しっぱいしたよ","error"),D.disabled=!1}});const T=c.querySelector(".buy-wish-btn");T&&(T.onclick=()=>R(t,h)),g.appendChild(c)})},R=(e,i)=>{const a=n.getState(),r=a==null?void 0:a.currentUser;if(!r)return;if(i<e.target_price){k("ちょきんが たりないよ！","error");return}const o=document.createElement("div");o.innerHTML=`
            <div id="purchase-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>
            
            <div style="text-align: center; margin-bottom: 1rem;">
                ${e.image_url?`<img src="${e.image_url}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 12px; margin-bottom: 8px;" alt="${e.title}" />`:""}
                <h3 style="margin: 0; font-size: 1.2rem; color: #333;">${e.title}</h3>
                <div style="font-size: 1.4rem; font-weight: 800; color: #2E7D32; margin-top: 4px;">
                    ${F(e.target_price)}
                </div>
            </div>

            <div style="background: #E8F5E9; padding: 0.75rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.95rem; color: #2E7D32;">
                🏦 <strong>ちょきんから つかうよ</strong><br>
                いまの ちょきん: <strong>${F(i)}</strong> ➔ のこり: <strong>${F(i-e.target_price)}</strong>
            </div>

            <div style="background: #FFF9C4; border: 1px solid #FBC02D; padding: 0.75rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem; color: #F57F17; line-height: 1.4;">
                💌 <strong>おとなのひとに おねがいを おくるよ！</strong><br>
                おとなのひとが「いいよ！」と しょうにんしたら、ちょきんから つかわれて リストから じどうで けされるよ。
            </div>

            <button id="confirm-purchase-btn" class="primary-btn btn-primary" style="width: 100%; min-height: 50px; font-weight: bold; border-radius: 12px; border: none; cursor: pointer; color: white; font-size: 1.05rem; background: linear-gradient(135deg, #4CAF50, #2E7D32);">
                💌 おとなのひとに おねがいする
            </button>
        `;let s=null;const l=o.querySelector("#confirm-purchase-btn");l.onclick=async()=>{var f;const h=o.querySelector("#purchase-error");try{l.disabled=!0,l.textContent="おねがい中...",await L.createWithdrawalRequest(r.id,r.family_id||((f=a.family)==null?void 0:f.id)||"",e.target_price,`ほしいもの購入[${e.id}]: ${e.title}`,"SAVINGS");const y=await L.getWithdrawals(r.id);n.set("withdrawals",y),P.play("success"),k(`おとなのひとに「${e.title}」を かうおねがいを おくったよ！`,"success"),s==null||s.close()}catch(y){h&&(h.textContent=y.message||"おねがいをおくるのに しっぱいしたよ",h.style.display="block"),l.disabled=!1,l.textContent="💌 おとなのひとに おねがいする"}},s=U({title:"ほしいものを かう おねがい 🎁",content:o})},j=()=>{var l;const e=n.getState(),i=e==null?void 0:e.currentUser;if(!i)return;const a=i.family_id||((l=e==null?void 0:e.family)==null?void 0:l.id)||"",r=document.createElement("div");r.innerHTML=`
            <div id="wish-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>
            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">ほしいものの なまえ</label>
            <input type="text" id="wish-name" placeholder="例: サッカーボール、ゲームソフト" style="width: 100%; min-height: 48px; margin-bottom: 1rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">

            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">ねだん（コイン）</label>
            <input type="number" id="wish-price" placeholder="例: 1500" min="1" style="width: 100%; min-height: 48px; margin-bottom: 1rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">

            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">しゃしんの URL（なくてもOK）</label>
            <input type="url" id="wish-url" placeholder="https://..." style="width: 100%; min-height: 48px; margin-bottom: 1rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">

            <button id="add-wish-btn" class="primary-btn btn-primary" style="width: 100%; min-height: 50px; font-weight: bold; border-radius: 12px; border: none; cursor: pointer; color: white;">
                リストに ついかする
            </button>
        `;let o=null;const s=r.querySelector("#add-wish-btn");s.onclick=async()=>{const h=r.querySelector("#wish-name"),f=r.querySelector("#wish-price"),y=r.querySelector("#wish-url"),u=r.querySelector("#wish-error"),t=h.value.trim(),p=parseInt(f.value,10),x=y.value.trim();if(!t){u.textContent="なまえを 入力してね！",u.style.display="block";return}if(isNaN(p)||p<=0){u.textContent="1コインいじょうの ねだんを入れてね！",u.style.display="block";return}try{s.disabled=!0,s.textContent="ついか中...";const I=await _.createWishItem({child_id:i.id,family_id:a,title:t,target_price:p,image_url:x||void 0}),C=n.get("wishItems")||[];C.some(c=>c.id===I.id)||n.set("wishItems",[I,...C]),P.play("success"),k("リストに ついかしたよ！がんばって貯めよう","success"),o==null||o.close(),W()}catch(I){u.textContent=I.message||"エラーがおきちゃった",u.style.display="block",s.disabled=!1,s.textContent="リストに ついかする"}},o=U({title:"ほしいものを ついか",content:r})},b=async()=>{var i,a;const e=(a=(i=n.getState())==null?void 0:i.currentUser)==null?void 0:a.id;if(e)try{const[r,o,s]=await Promise.all([L.getWithdrawals(e),_.getWishItems(e),H.getAccount(e)]);n.set("withdrawals",r),n.set("wishItems",o),s&&n.set("account",s)}catch(r){console.warn("Failed to load wishlist data:",r)}};b();const A=e=>{e.key==="moneytree_data"&&b()},B=e=>{var a,r;const i=e.detail;if(i!=null&&i.wishItems){const o=(r=(a=n.getState())==null?void 0:a.currentUser)==null?void 0:r.id,s=i.wishItems.filter(l=>!o||l.child_id===o);n.set("wishItems",s)}b()};window.addEventListener("storage",A),window.addEventListener("moneytree_local_change",B),window.addEventListener("focus",b);const E=(N=(M=n.getState())==null?void 0:M.currentUser)==null?void 0:N.id,G=E?L.subscribeToWithdrawals(E,()=>b()):{unsubscribe:()=>{}},O=E?_.subscribeToWishItems(E,()=>b()):{unsubscribe:()=>{}},V=E?H.subscribeToAccount(E,e=>{e&&n.set("account",e)}):{unsubscribe:()=>{}},K=window.setInterval(b,3500);return Z.onCleanup(()=>{window.clearInterval(K),G.unsubscribe(),O.unsubscribe(),V.unsubscribe(),window.removeEventListener("storage",A),window.removeEventListener("moneytree_local_change",B),window.removeEventListener("focus",b)}),n.onAny(W),W(),w}export{ae as createChildWishlist};
