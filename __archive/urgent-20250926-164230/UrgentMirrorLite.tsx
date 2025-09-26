"use client";
import { useEffect } from "react";
import { listRows, getThead } from "./urgentBridge";

function render(mount: HTMLElement, orig: HTMLElement | null){
  const rows = listRows();
  if (!rows || rows.length === 0) {
    // 데이터 없으면 원본 유지, 안내만 표시
    if (orig) orig.style.display = "";
    mount.innerHTML = `<div style="padding:8px;color:#6b7280">입주일 30일 이내 후보가 없습니다.</div>`;
    return;
  }

  // 데이터 있을 땐 원래 표는 감추고 미러 표시
  if (orig) orig.style.display = "none";

  const thead = getThead() ?? "";
  const body = rows.map(r=>{
    const color = r.days <= 10 ? "bg-red-50" : r.days <= 20 ? "bg-orange-50" : r.days <= 30 ? "bg-sky-50" : "";
    return `<tr data-anchor="${r.anchorId}" class="row-clickable ${color}">${r.rowHTML}</tr>`;
  }).join("");

  mount.innerHTML = `
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="w-full table-remark-last">
        ${thead || ""}
        <tbody>${body}</tbody>
      </table>
    </div>`;

  // 행 클릭 → /clients#행
  Array.from(mount.querySelectorAll("tbody tr")).forEach(tr=>{
    const a = (tr as HTMLElement).querySelector("a[href]") as HTMLAnchorElement | null;
    if (a) return; // 내부 링크 있으면 그대로
    const anchor = (tr as HTMLElement).getAttribute("data-anchor");
    if (!anchor) return;
    (tr as HTMLElement).addEventListener("click", ()=>{ location.href = "/clients#" + anchor; });
  });
}

export default function UrgentMirrorLite(){
  useEffect(()=>{
    const main = (document.querySelector("main") || document.body) as HTMLElement;
    const orig = main.querySelector("table") as HTMLElement | null;
    let mount = document.getElementById("urgent-mount") as HTMLElement | null;
    if (!mount) { mount = document.createElement("div"); mount.id = "urgent-mount"; main.insertBefore(mount, main.firstChild); }

    const rer = () => render(mount!, orig);
    rer();
    const on = (e: StorageEvent) => { if (e.key === "urgent:rows" || e.key === "urgent:thead") rer(); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  },[]);
  return null;
}
