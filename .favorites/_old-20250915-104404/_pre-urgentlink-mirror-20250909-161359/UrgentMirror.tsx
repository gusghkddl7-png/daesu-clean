"use client";
import { useEffect } from "react";
import { getThead, listRows } from "./urgentStore";

function render(container: HTMLElement) {
  const theadHTML = getThead();
  const rows = listRows();

  const bodyHTML = rows.map(r => {
    const cls = r.days <= 10 ? "bg-red-50" : r.days <= 20 ? "bg-orange-50" : r.days <= 30 ? "bg-sky-50" : "";
    return `<tr class="${cls}">${r.rowHTML}</tr>`;
  }).join("");

  const table = `
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-semibold">급한 임차 문의</h2>
      <div class="text-sm text-gray-600">10일전 · 20일전 · 30일전</div>
    </div>
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="w-full table-remark-last">
        ${theadHTML ?? "<thead></thead>"}
        <tbody>${bodyHTML}</tbody>
      </table>
    </div>`;

  container.innerHTML = table;
}

export default function UrgentMirror() {
  useEffect(() => {
    const main = (document.querySelector("main") || document.body) as HTMLElement;
    // 기존 표 감추기 (있다면)
    const orig = main.querySelector("table") as HTMLElement | null;
    if (orig) orig.style.display = "none";

    let mount = document.getElementById("urgent-mount") as HTMLElement | null;
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "urgent-mount";
      main.insertBefore(mount, main.firstChild);
    }

    const rerender = () => render(mount!);
    rerender();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "urgent:rows" || e.key === "urgent:thead") rerender();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
