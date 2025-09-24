"use client";
import { useEffect } from "react";
import { listRows, getThead, getColgroup, getTableClass } from "./urgentBridge";

function hideOriginal(main:HTMLElement){
  // 급한임차 고유 UI/테이블 전부 숨김
  main.querySelectorAll("table, h1, [data-urgent-ui], .urgent-top, .urgent-filters, button").forEach(el=>{
    const t=(el as HTMLElement).innerText?.trim();
    if (el.tagName==="TABLE" || ["10일전","20일전","30일전","급한임차문의","뒤로가기"].some(v=>t===v)) {
      (el as HTMLElement).style.display="none";
    }
  });
}

function render(mount:HTMLElement, main:HTMLElement){
  const rows=listRows(); const thead=getThead()||""; const colg=getColgroup()||""; const tclass=(getTableClass()||"").trim();
  hideOriginal(main);

  if(!rows || rows.length===0){
    mount.innerHTML=`<div style="padding:8px;color:#6b7280">먼저 <b>/clients</b>에서 표가 보이는 상태로 2~3초만 대기하면 여기 자동 반영됩니다.</div>`;
    return;
  }
  const body=rows.map(r=>{
    const color=r.days<=10?"bg-red-50":r.days<=20?"bg-orange-50":r.days<=30?"bg-sky-50":"";
    return `<tr data-anchor="${r.anchorId}" class="row-clickable ${color}">${r.rowHTML}</tr>`;
  }).join("");

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
    if ((location.pathname.split("?")[0]||"") !== "/urgent") return;
    const main=(document.querySelector("main")||document.body) as HTMLElement;
    let mount=document.getElementById("urgent-mount") as HTMLElement|null;
    if(!mount){ mount=document.createElement("div"); mount.id="urgent-mount"; main.insertBefore(mount, main.firstChild); }
    const rer=()=>render(mount!,main); rer();
    const on=(e:StorageEvent)=>{ if(e.key && e.key.startsWith("urgent:v2:")) rer(); }; window.addEventListener("storage", on);
    return ()=>window.removeEventListener("storage", on);
  },[]);
  return null;
}