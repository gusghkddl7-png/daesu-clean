"use client";
import { useEffect } from "react";

function parseDate(t: string): string | null {
  t = (t || "").trim();
  if (!t) return null;
  let m = t.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) {
    const y = m[1] ?? String(new Date().getFullYear());
    const iso = `${y}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  // 2025-09-12 / 2025.09.12 / 2025/09/12 / 20250912
  const norm = t.replace(/[^\d./-]/g," ").replace(/[.\/]/g,"-");
  m = norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const iso = `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  m = t.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  return null;
}

const daysLeft = (iso: string) => {
  const d = new Date(iso), n = new Date();
  d.setHours(0,0,0,0); n.setHours(0,0,0,0);
  return Math.ceil((+d - +n) / 86400000);
};

const rowId = (tr: HTMLTableRowElement) => {
  const t = tr.textContent || "";
  const p = t.match(/\d{2,3}-?\d{3,4}-?\d{4}/);
  if (p) return p[0];
  const td = tr.querySelectorAll("td");
  return (td[0]?.textContent || "row") + ":" + (td[1]?.textContent || "");
};
const anchorOf = (id: string) => "row-" + (id || "").replace(/[^a-zA-Z0-9_-]/g, "_");

function renderFromClientsHTML(html: string, mount: HTMLElement, orig: HTMLElement | null) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = (doc.querySelector("main table") || doc.querySelector("table")) as HTMLTableElement | null;
  if (!table) {
    mount.innerHTML = `<div style="padding:8px;color:#6b7280">고객문의 표를 찾지 못했어요.</div>`;
    return;
  }
  const thead = table.querySelector("thead");
  const colg  = table.querySelector("colgroup");
  const tbody = table.querySelector("tbody");
  if (!tbody) {
    mount.innerHTML = `<div style="padding:8px;color:#6b7280">고객문의 표가 비어있습니다.</div>`;
    return;
  }

  // '입주일' 컬럼 인덱스
  let idx = -1;
  if (thead) {
    const ths = Array.from(thead.querySelectorAll("th"));
    idx = ths.findIndex(th => /입주|입주일|이사/i.test(th.textContent || ""));
  }

  const rows: {anchor: string; days: number; html: string}[] = [];
  Array.from(tbody.querySelectorAll("tr")).forEach((tr) => {
    let txt = "";
    if (idx >= 0) {
      const td = (tr as HTMLTableRowElement).querySelectorAll("td")[idx];
      txt = (td?.textContent || "").trim();
    }
    if (!txt) {
      const cells = Array.from((tr as HTMLTableRowElement).querySelectorAll("td")).map(td => td.textContent || "");
      const cand = cells.find(c => parseDate(c || ""));
      if (cand) txt = cand;
    }
    const iso = parseDate(txt || "");
    if (!iso) return;
    const d = daysLeft(iso);
    if (d < 0 || d > 30) return;
    const id = rowId(tr as HTMLTableRowElement);
    const anchor = anchorOf(id);
    (tr as HTMLElement).id = (tr as HTMLElement).id || anchor;
    const color = d <= 10 ? "bg-red-50" : d <= 20 ? "bg-orange-50" : d <= 30 ? "bg-sky-50" : "";
    rows.push({ anchor, days: d, html: `<tr data-anchor="${anchor}" class="row-clickable ${color}">${(tr as HTMLTableRowElement).innerHTML}</tr>` });
  });

  rows.sort((a,b) => a.days - b.days);

  if (orig) (orig as HTMLElement).style.display = "none";
  const tclass = (table.className || "").trim();
  mount.innerHTML = `
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="${tclass}">
        ${colg ? (colg as HTMLElement).outerHTML : ""}
        ${thead ? (thead as HTMLElement).outerHTML : ""}
        <tbody>${rows.map(r => r.html).join("")}</tbody>
      </table>
    </div>
  `;
  Array.from(mount.querySelectorAll("tbody tr")).forEach(tr => {
    const a = (tr as HTMLElement).querySelector("a[href]") as HTMLAnchorElement | null;
    if (a) return;
    const anchor = (tr as HTMLElement).getAttribute("data-anchor");
    if (!anchor) return;
    (tr as HTMLElement).addEventListener("click", () => { location.href = "/clients#" + anchor; });
  });
}

export default function UrgentMirrorFetch() {
  useEffect(() => {
    const main = (document.querySelector("main") || document.body) as HTMLElement;
    const orig = main.querySelector("table") as HTMLElement | null;
    let mount = document.getElementById("urgent-mount") as HTMLElement | null;
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "urgent-mount";
      main.insertBefore(mount, main.firstChild);
    }
    // 안내
    mount.innerHTML = `<div style="padding:8px;color:#6b7280">고객문의 표를 불러오는 중…</div>`;
    fetch("/clients", { credentials: "include" })
      .then(r => r.text())
      .then(html => renderFromClientsHTML(html, mount!, orig))
      .catch(() => { mount!.innerHTML = `<div style="padding:8px;color:#ef4444">/clients 불러오기에 실패했습니다.</div>`; });
  }, []);
  return null;
}
