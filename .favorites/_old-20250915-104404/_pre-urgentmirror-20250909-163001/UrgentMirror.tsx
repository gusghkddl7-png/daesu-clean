"use client";
import { useEffect } from "react";
import { listRows } from "./urgentStore";

function render(container: HTMLElement) {
  const rows = listRows();
  if (!rows.length) {
    container.innerHTML = ""; // 비었으면 아무 것도 표시하지 않음
    return;
  }
  const bodyHTML = rows.map(r => {
    const cls = r.days <= 10 ? "bg-red-50" : r.days <= 20 ? "bg-orange-50" : r.days <= 30 ? "bg-sky-50" : "";
    return `<tr class="${cls}">${r.rowHTML}</tr>`;
  }).join("");

  // 헤더 없이 tbody만 (고객문의 행 그대로)
  container.innerHTML = `
    <div class="mt-0 overflow-x-auto bg-white rounded-lg shadow">
      <table class="w-full table-remark-last"><tbody>${bodyHTML}</tbody></table>
    </div>`;
}

export default function UrgentMirror() {
  useEffect(() => {
    const main = (document.querySelector("main") || document.body) as HTMLElement;

    // 1) 페이지 상단 좌측 "급한임차문의", 우측 "10일전 20일전 30일전" 등 텍스트 전부 숨김
    try {
      const killTexts = ["급한임차문의", "10일전", "20일전", "30일전"];
      const candidates = Array.from(main.querySelectorAll("h1,h2,div,span,button,a"));
      candidates.forEach(el => {
        const t = (el.textContent || "").replace(/\s+/g,"").trim();
        if (!t) return;
        if (killTexts.some(k => t.includes(k))) (el as HTMLElement).style.display = "none";
      });
    } catch {}

    // 2) 기존 표가 있으면 숨김
    const origTable = main.querySelector("table") as HTMLElement | null;
    if (origTable) origTable.style.display = "none";

    // 3) 컨테이너를 맨 위에(한 칸 올려 붙이기)
    let mount = document.getElementById("urgent-mount") as HTMLElement | null;
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "urgent-mount";
      main.insertBefore(mount, main.firstChild);
    }

    const rerender = () => render(mount!);
    rerender();

    const onStorage = (e: StorageEvent) => { if (e.key === "urgent:rows") rerender(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
