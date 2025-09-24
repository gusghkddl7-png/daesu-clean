"use client";
import { useEffect } from "react";
import { listRows, getState, setState, toggleClosed } from "./urgentStore";

function render(main: HTMLElement, mount: HTMLElement, orig: HTMLElement | null) {
  const rows = listRows();
  const st = getState();

  // 데이터 없으면 원본 표/화면 그대로 보이기
  if (!rows || rows.length === 0) {
    if (orig) orig.style.display = "";
    mount.innerHTML = "";
    return;
  }

  // 데이터 있을 때만 원본 표/상단 텍스트 숨김
  try {
    const hideTexts = ["급한임차문의","10일전","20일전","30일전"];
    const nodes = Array.from(main.querySelectorAll("h1,h2,div,span,button,a"));
    nodes.forEach(el => {
      const t = (el.textContent || "").replace(/\s+/g,"").trim();
      if (t && hideTexts.some(k => t.includes(k))) (el as HTMLElement).style.display = "none";
    });
  } catch {}
  if (orig) orig.style.display = "none";

  // 행 렌더 (헤더 없음)
  const body = rows.map(r => {
    const closed = !!st[r.id]?.closed;
    const color = closed ? "" : (r.days <= 10 ? "bg-red-50" : r.days <= 20 ? "bg-orange-50" : r.days <= 30 ? "bg-sky-50" : "");
    const closedCls = closed ? "urgent-closed" : "";
    return `<tr data-id="${r.id}" class="${color} ${closedCls}">${r.rowHTML}</tr>`;
  }).join("");

  mount.innerHTML = `
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="w-full table-remark-last">
        <tbody>${body}</tbody>
      </table>
    </div>`;

  // 각 행의 마지막 셀에 '종료/복구' 버튼 주입 + 이벤트
  const trEls = Array.from(mount.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
  trEls.forEach(tr => {
    const id = tr.getAttribute("data-id") || "";
    const lastTd = tr.querySelector("td:last-child") as HTMLTableCellElement | null;
    if (!lastTd) return;
    // 한번만 붙이기
    if (lastTd.querySelector(".urgent-close-btn")) return;
    const btn = document.createElement("button");
    const closed = !!st[id]?.closed;
    btn.className = "urgent-close-btn ml-2";
    btn.textContent = closed ? "복구" : "종료";
    btn.addEventListener("click", () => {
      toggleClosed(id);
    });
    lastTd.appendChild(btn);
  });
}

export default function UrgentMirror() {
  useEffect(() => {
    const main = (document.querySelector("main") || document.body) as HTMLElement;
    const orig = main.querySelector("table") as HTMLElement | null;

    let mount = document.getElementById("urgent-mount") as HTMLElement | null;
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "urgent-mount";
      main.insertBefore(mount, main.firstChild);
    }

    const rerender = () => render(main, mount!, orig);
    rerender();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "urgent:rows" || e.key === "urgent:state") rerender();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
