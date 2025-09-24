'use client';
import { useEffect } from "react";
import { listRows, getThead, getColgroup, getTableClass } from "./urgentBridge";
function render(mount:HTMLElement, orig:HTMLElement|null){
  const rows=listRows(); const thead=getThead()||""; const colg=getColgroup()||""; const tclass=(getTableClass()||"").trim();
  if(!rows||rows.length===0){ if(orig) orig.style.display=""; mount.innerHTML=`<div style="padding:8px;color:#6b7280">입주일 30일 이내 후보가 없습니다.</div>`; return; }
  if(orig) orig.style.display="none";
  const body=rows.map(r=>{ const color=r.days<=10?"bg-red-50":r.days<=20?"bg-orange-50":r.days<=30?"bg-sky-50":""; return `<tr data-anchor="${r.anchorId}" class="row-clickable ${color}">${r.rowHTML}</tr>`; }).join("");

  // 상단 고유 UI는 숨김
  document.querySelectorAll("h1, [data-urgent-ui], .urgent-top, .urgent-filters").forEach(el=>{ (el as HTMLElement).style.display="none"; });

  mount.innerHTML = `
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="${tclass}">
        ${colg||""}
        ${thead||""}
        <tbody>${body}</tbody>
      </table>
    </div>`;
  Array.from(mount.querySelectorAll("tbody tr")).forEach(tr=>{
    const a=(tr as HTMLElement).querySelector("a[href]") as HTMLAnchorElement|null;
    if(a) return;
    const anchor=(tr as HTMLElement).getAttribute("data-anchor"); if(!anchor) return;
    (tr as HTMLElement).addEventListener("click",()=>{ location.href="/clients#"+anchor; });
  });
}
export default function UrgentMirrorExact(){
  useEffect(()=>{
    const main=(document.querySelector("main")||document.body) as HTMLElement;
    const orig=main.querySelector("table") as HTMLElement|null;
    let mount=document.getElementById("urgent-mount") as HTMLElement|null;
    if(!mount){ mount=document.createElement("div"); mount.id="urgent-mount"; main.insertBefore(mount, main.firstChild); }
    const rer=()=>render(mount!,orig); rer();
    const on=(e:StorageEvent)=>{ if(e.key && e.key.startsWith("urgent:v2:")) rer(); }; window.addEventListener("storage", on);
    return ()=>window.removeEventListener("storage", on);
  },[]);
  return null;
}
