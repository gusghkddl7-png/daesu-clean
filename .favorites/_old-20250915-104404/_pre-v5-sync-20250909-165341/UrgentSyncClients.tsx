"use client";
import { useEffect } from "react";
import { listRows, saveRows, getState } from "./urgentStore";

/** 날짜 파싱: YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD / M-D / M/D / 2025년9월1일 / 20250901 */
function parseDate(text: string): string | null {
  const s = (text || "").trim();
  if (!s) return null;

  // 한글: 2025년 9월 1일 / (연도 생략 시 올해)
  let m = s.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) {
    const now = new Date();
    const y = m[1] ? m[1] : String(now.getFullYear());
    const mm = m[2].padStart(2, "0");
    const dd = m[3].padStart(2, "0");
    const iso = `${y}-${mm}-${dd}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }

  // 연속 8자리 20250910
  m = s.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }

  // 일반 구분자
  const norm = s.replace(/[^\d./-]/g, " ").replace(/[.\/]/g, "-");
  // YYYY-M-D
  m = norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const iso = `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
  // YY-M-D → 20YY
  m = norm.match(/(\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const iso = `20${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
  // M-D (올해)
  m = norm.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const y = String(new Date().getFullYear());
    const iso = `${y}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
  return null;
}

/** 전화번호 우선 id */
function rowId(tr: HTMLTableRowElement): string {
  const t = tr.textContent || "";
  const p = t.match(/\d{2,3}-?\d{3,4}-?\d{4}/);
  if (p) return p[0];
  const tds = Array.from(tr.querySelectorAll("td"));
  return (tds[0]?.textContent || "row") + ":" + (tds[1]?.textContent || "");
}

/** D-값 */
function daysLeft(iso: string) {
  const d = new Date(iso); const now = new Date();
  d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

/** 종료 상태를 고객문의 표에도 반영(시각적으로) */
function applyClosedStyles(table: HTMLTableElement) {
  const st = getState();
  const tbody = table.querySelector("tbody"); if (!tbody) return;
  Array.from(tbody.querySelectorAll("tr")).forEach(tr => {
    const id = rowId(tr as HTMLTableRowElement);
    const closed = !!st[id]?.closed;
    (tr as HTMLElement).classList.toggle("urgent-closed", closed);
  });
}

export default function UrgentSyncClients() {
  useEffect(() => {
    const scan = () => {
      const table = (document.querySelector("main table") || document.querySelector("table")) as HTMLTableElement | null;
      if (!table) return;
      const thead = table.querySelector("thead"); const tbody = table.querySelector("tbody");
      if (!tbody) return;

      // '입주일' 컬럼 인덱스 찾기 (스크린샷 기준)
      let moveIdx = -1;
      if (thead) {
        const ths = Array.from(thead.querySelectorAll("th"));
        moveIdx = ths.findIndex(th => /입주|입주일/i.test(th.textContent || ""));
      }

      const next:any[] = [];
      Array.from(tbody.querySelectorAll("tr")).forEach(tr => {
        let txt = "";
        if (moveIdx >= 0) {
          const td = (tr as HTMLTableRowElement).querySelectorAll("td")[moveIdx];
          txt = (td?.textContent || "").trim();
        }
        if (!txt) txt = (tr.textContent || "");
        const iso = parseDate(txt);
        if (!iso) return;
        const d = daysLeft(iso);
        if (d < 0 || d > 30) return; // 0~30일만 포함
        next.push({
          id: rowId(tr as HTMLTableRowElement),
          moveIn: iso,
          days: d,
          rowHTML: (tr as HTMLTableRowElement).innerHTML
        });
      });

      next.sort((a,b) => a.days - b.days);
      // 저장(변경시에만)
      const before = listRows();
      if (JSON.stringify(before) !== JSON.stringify(next)) saveRows(next);

      // 종료 상태를 시각적으로 반영
      applyClosedStyles(table);
    };

    const iv = setInterval(scan, 600);
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, {childList:true, subtree:true});
    scan();

    // urgent에서 종료 토글 시 반영
    const onStorage = (e: StorageEvent) => { if (e.key === "urgent:state") scan(); };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(iv); mo.disconnect(); window.removeEventListener("storage", onStorage); };
  }, []);

  return null;
}
