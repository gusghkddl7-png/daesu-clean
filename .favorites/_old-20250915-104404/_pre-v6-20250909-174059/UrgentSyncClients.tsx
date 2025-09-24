"use client";
import { useEffect } from "react";
import { listRows, saveRows, getState, setThead } from "./urgentStore";

/** 날짜 파싱(다양한 포맷) */
function parseDate(text: string): string | null {
  const s = (text||"").trim(); if (!s) return null;
  let m = s.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) { const y = m[1] ?? String(new Date().getFullYear());
    const mm = m[2].padStart(2,"0"), dd = m[3].padStart(2,"0");
    const iso = `${y}-${mm}-${dd}`; return isNaN(new Date(iso).getTime())?null:iso; }
  m = s.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if (m) { const iso = `${m[1]}-${m[2]}-${m[3]}`; return isNaN(new Date(iso).getTime())?null:iso; }
  const norm = s.replace(/[^\d./-]/g," ").replace(/[.\/]/g,"-");
  m = norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) { const iso = `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`; return isNaN(new Date(iso).getTime())?null:iso; }
  m = norm.match(/(\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) { const iso = `20${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`; return isNaN(new Date(iso).getTime())?null:iso; }
  m = norm.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if (m) { const y=String(new Date().getFullYear()); const iso = `${y}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`; return isNaN(new Date(iso).getTime())?null:iso; }
  return null;
}
function rowId(tr: HTMLTableRowElement): string {
  const t = tr.textContent || "";
  const p = t.match(/\d{2,3}-?\d{3,4}-?\d{4}/);
  if (p) return p[0];
  const tds = Array.from(tr.querySelectorAll("td"));
  return (tds[0]?.textContent || "row") + ":" + (tds[1]?.textContent || "");
}
function mkAnchorId(id: string) {
  return "row-" + (id||"").replace(/[^a-zA-Z0-9_-]/g,"_");
}
function daysLeft(iso: string) {
  const d = new Date(iso); const now = new Date();
  d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((d.getTime()-now.getTime())/86400000);
}
function applyClosedStyles(table: HTMLTableElement) {
  const st = getState(); const tbody = table.querySelector("tbody"); if (!tbody) return;
  Array.from(tbody.querySelectorAll("tr")).forEach(tr=>{
    const id = rowId(tr as HTMLTableRowElement);
    (tr as HTMLElement).classList.toggle("urgent-closed", !!st[id]?.closed);
    // 앵커 id 부여(한 번만)
    const aid = mkAnchorId(id); if (!(tr as HTMLElement).id) (tr as HTMLElement).id = aid;
  });
}

export default function UrgentSyncClients() {
  useEffect(() => {
    const scan = () => {
      const table = (document.querySelector("main table") || document.querySelector("table")) as HTMLTableElement | null;
      if (!table) return;
      const thead = table.querySelector("thead"); const tbody = table.querySelector("tbody");
      if (thead) { try { setThead(thead.outerHTML); } catch {} }
      if (!tbody) return;

      // '입주일' 열 인덱스
      let moveIdx = -1;
      if (thead) {
        const ths = Array.from(thead.querySelectorAll("th"));
        moveIdx = ths.findIndex(th => /입주|입주일/i.test(th.textContent || ""));
      }

      const next:any[] = [];
      Array.from(tbody.querySelectorAll("tr")).forEach(tr=>{
        let txt=""; if (moveIdx>=0) { const td=(tr as HTMLTableRowElement).querySelectorAll("td")[moveIdx]; txt=(td?.textContent||"").trim(); }
        if (!txt) txt = (tr.textContent || "");
        const iso = parseDate(txt); if (!iso) return;
        const d = daysLeft(iso); if (d<0 || d>30) return; // 0~30일만
        const id = rowId(tr as HTMLTableRowElement);
        const anchorId = mkAnchorId(id);
        (tr as HTMLElement).id = (tr as HTMLElement).id || anchorId; // 고객문의쪽에 id 부여
        next.push({ id, anchorId, moveIn: iso, days: d, rowHTML: (tr as HTMLTableRowElement).innerHTML });
      });

      next.sort((a,b)=>a.days-b.days);
      const before = listRows(); if (JSON.stringify(before)!==JSON.stringify(next)) saveRows(next);
      applyClosedStyles(table);
    };

    const iv = setInterval(scan, 600);
    const mo = new MutationObserver(()=>scan());
    mo.observe(document.body, {childList:true, subtree:true});
    scan();
    const onStorage = (e: StorageEvent)=>{ if (e.key==="urgent:state") scan(); };
    window.addEventListener("storage", onStorage);
    return ()=>{ clearInterval(iv); mo.disconnect(); window.removeEventListener("storage", onStorage); };
  }, []);
  return null;
}
