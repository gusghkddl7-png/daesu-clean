"use client";
import { useEffect } from "react";
import { listRows, getState, getThead } from "./urgentStore";

function render(main: HTMLElement, mount: HTMLElement, orig: HTMLElement | null) {
  const rows = listRows();
  const st = getState();

  if (!rows || rows.length===0) {
    if (orig) orig.style.display = "";
    mount.innerHTML = "";
    return;
  }

  // 원래 상단 텍스트/표 숨김
  try {
    const hideTexts = ["급한임차문의","10일전","20일전","30일전"];
    Array.from(main.querySelectorAll("h1,h2,div,span,button,a")).forEach(el=>{
      const t=(el.textContent||"").replace(/\s+/g,"").trim();
      if (t && hideTexts.some(k=>t.includes(k))) (el as HTMLElement).style.display="none";
    });
  } catch {}
  if (orig) orig.style.display = "none";

  const thead = getThead() ?? "";
  const body = rows.map(r=>{
    const closed = !!st[r.id]?.closed;
    const color = closed ? "" : (r.days<=10?"bg-red-50": r.days<=20?"bg-orange-50": r.days<=30?"bg-sky-50":"");
    const closedCls = closed ? "urgent-closed" : "";
    return `<tr id="${r.anchorId}" data-anchor="${r.anchorId}" class="${color} ${closedCls} row-clickable">${r.rowHTML}</tr>`;
  }).join("");

  mount.innerHTML = `
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="w-full table-remark-last">
        ${thead}
        <tbody>${body}</tbody>
      </table>
    </div>`;

  // 행 클릭 → 고객문의로 이동
  Array.from(mount.querySelectorAll("tbody tr")).forEach(tr=>{
    const a = (tr as HTMLElement).querySelector("a[href]") as HTMLAnchorElement | null;
    if (a) return; // 내부에 링크가 있으면 그대로 사용
    const anchor = (tr as HTMLElement).getAttribute("data-anchor");
    if (!anchor) return;
    (tr as HTMLElement).addEventListener("click", ()=>{
      location.href = "/clients#" + anchor;
    });
  });
}

export default function UrgentMirror() {
  useEffect(() => {
    const main = (document.querySelector("main") || document.body) as HTMLElement;
    const orig = main.querySelector("table") as HTMLElement | null;

    let mount = document.getElementById("urgent-mount") as HTMLElement | null;
    if (!mount) { mount = document.createElement("div"); mount.id="urgent-mount"; main.insertBefore(mount, main.firstChild); }

    const rerender = () => render(main, mount!, orig);
    rerender();

    const onStorage = (e: StorageEvent)=>{ if (e.key==="urgent:rows" || e.key==="urgent:state" || e.key==="urgent:thead") rerender(); };
    window.addEventListener("storage", onStorage);
    return ()=>window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
