"use client";
import { useEffect } from "react";
import { getThead, listRows } from "./urgentStore";

function render(container: HTMLElement) {
  const theadHTML = getThead() ?? `<thead><tr>
    <th class="px-2 py-1">이름</th>
    <th class="px-2 py-1">연락처</th>
    <th class="px-2 py-1">면적</th>
    <th class="px-2 py-1">입주일</th>
    <th class="px-2 py-1">비고</th>
  </tr></thead>`;

  const rows = listRows();
  const bodyHTML = rows.map(r => {
    const cls = r.days <= 10 ? "bg-red-50" : r.days <= 20 ? "bg-orange-50" : r.days <= 30 ? "bg-sky-50" : "";
    return `<tr class="${cls}">${r.rowHTML}</tr>`;
  }).join("");

  container.innerHTML = `
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="w-full table-remark-last">
        ${theadHTML}
        <tbody>${bodyHTML}</tbody>
      </table>
    </div>`;
}

export default function UrgentMirror() {
  useEffect(() => {
    const main = (document.querySelector("main") || document.body) as HTMLElement;
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
