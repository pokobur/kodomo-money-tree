import{s as o,i as v}from"./index-DVKodEt2.js";function x(e){const n=document.createElement("nav");n.className="nav-footer";const p=e==="CHILD"?[{label:"ホーム",icon:"🏠",hash:"#/child/home"},{label:"クエスト",icon:"📋",hash:"#/child/quests"},{label:"ちょきん",icon:"🏦",hash:"#/child/savings"},{label:"ほしいもの",icon:"⭐",hash:"#/child/wishlist"},{label:"おわる",icon:"🚪",hash:"#/child/logout"}]:[{label:"ダッシュボード",icon:"📊",hash:"#/parent/dashboard"},{label:"クエスト管理",icon:"📋",hash:"#/parent/quests"},{label:"こども",icon:"👤",hash:"#/parent/children"},{label:"設定",icon:"⚙️",hash:"#/parent/settings"}];function u(){var h,r;const a=v(),t=new Set(a.deletedChildIds||[]),i=(a.submissions||[]).filter(s=>s.status==="PENDING"&&!t.has(s.child_id)),l=(((h=o.getState())==null?void 0:h.submissions)||[]).filter(s=>s.status==="PENDING"&&!t.has(s.child_id)),b=new Set([...i.map(s=>s.id),...l.map(s=>s.id)]),g=(a.withdrawals||[]).filter(s=>(s.status==="PENDING"||s.status==="COOLDOWN")&&!t.has(s.child_id)),m=(((r=o.getState())==null?void 0:r.withdrawals)||[]).filter(s=>(s.status==="PENDING"||s.status==="COOLDOWN")&&!t.has(s.child_id)),w=new Set([...g.map(s=>s.id),...m.map(s=>s.id)]);return b.size+w.size}function c(){const a=e==="PARENT"?u():0;n.innerHTML=p.map(t=>{const l=e==="PARENT"&&t.hash==="#/parent/dashboard"&&a>0?`
        <span class="nav-badge" style="position: absolute; top: -6px; right: -10px; background: #FF3D00; color: white; border-radius: 10px; font-size: 0.7rem; font-weight: bold; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.25); border: 2px solid white;">
          ${a}
        </span>
      `:"";return`
        <a href="${t.hash}" class="nav-item" data-hash="${t.hash}" style="position: relative;">
          <span class="nav-icon" style="position: relative; display: inline-block;">
            ${t.icon}
            ${l}
          </span>
          <span class="nav-label">${t.label}</span>
        </a>
      `}).join(""),d()}function d(){const a=window.location.hash||"#/";n.querySelectorAll(".nav-item").forEach(t=>{const i=t.getAttribute("data-hash");a.startsWith(i)?t.classList.add("active"):t.classList.remove("active")})}if(c(),window.addEventListener("hashchange",d),e==="PARENT"){const a=()=>c();window.addEventListener("storage",a),window.addEventListener("moneytree_local_change",a),o.on("submissions",a),o.on("withdrawals",a)}return n}export{x as c};
