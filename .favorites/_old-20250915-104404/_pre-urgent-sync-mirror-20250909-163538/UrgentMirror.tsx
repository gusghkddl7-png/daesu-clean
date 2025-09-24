"use client";
import { useEffect } from "react";
import { listRows } from "./urgentStore";

function render(main: HTMLElement, mount: HTMLElement, orig: HTMLElement | null) {
  const rows = listRows();

  // 데이터가 없으면: 원본 화면 복구, 미러 제거
  if (!rows || rows.length === 0) {
    if (orig) orig.style.display = "";
    mount.innerHTML = "";
    return;
  }

  // 데이터가 있을 때만 상단 텍스트/범례 숨김 + 원본 표 숨김
  try {
    const killTexts = ["급한임차문의", "10일전", "20일전", "30일전"];
    const nodes = Array.from(main.querySelectorAll("h1,h2,div,span,button,a"));
    nodes.forEach(el => {
      const t = (el.textContent || "").replace(/\s+/g,"").trim();
      if (t && killTexts.some(k => t.includes(k))) (el as HTMLElement).style.display = "none";
    });
  } catch {}
  if (orig) orig.style.display = "none";

  const bodyHTML = rows.map(r => {
    const cls = r.days <= 10 ? "bg-red-50"
              : r.days <= 20 ? "bg-orange-50"
              : r.days <= 30 ? "bg-sky-50" : "";
    return `<tr class="${cls}">${r.rowHTML}</tr>`;
  }).join("");

  // 헤더 없이 행만
  mount.innerHTML = `
    <div class="mt-0 overflow-x-auto bg-white rounded-lg shadow">
      <table class="w-full table-remark-last"><tbody>${bodyHTML}</tbody></table>
    </div>`;
}

export default function UrgentMirror() {
  useEffect(() => {
    const main = (document.querySelector("main") || document.body) as HTMLElement;
    const orig = main.querySelector("table") as HTMLElement | null;

    let mount = document.getElementById("urgent-mount") as HTMLElement | null;
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "urgent-mount";
      main.insertBefore(mount, main.firstChild); // 한 칸 위로
    }

    const rerender = () => render(main, mount!, orig);
    rerender();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "urgent:rows" || e.key === "urgent:thead") rerender();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
