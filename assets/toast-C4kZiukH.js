function c(s,e="info",o=3e3){const a=document.getElementById("toast-container")||i(),t=document.createElement("div");t.className=`toast toast-${e}`;let n="ℹ️";e==="success"&&(n="✅"),e==="error"&&(n="❌"),t.innerHTML=`
    <span class="toast-icon">${n}</span>
    <span class="toast-message">${s}</span>
  `,a.appendChild(t),requestAnimationFrame(()=>{t.classList.add("show")}),setTimeout(()=>{t.classList.remove("show"),t.classList.add("hide"),setTimeout(()=>{a.contains(t)&&a.removeChild(t)},300)},o)}function i(){const s=document.createElement("div");return s.id="toast-container",s.className="toast-container",document.body.appendChild(s),s}export{c as s};
