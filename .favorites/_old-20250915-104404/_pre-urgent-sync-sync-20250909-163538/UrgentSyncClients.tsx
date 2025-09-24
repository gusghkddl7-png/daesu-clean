"use client";
import { useEffect } from "react";
import { setThead, listRows, saveRows } from "./urgentStore";

/** 날짜 파싱: YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, M-D, M/D, 2025년9월1일, 20250901, 25-9-1 등 */
function parseDate(text: string): string | null {
  const s = (text || "").trim();
  if (!s) return null;

  // 1) 한글: 2025년 9월 1일 / 9월 1일(연도 생략 시 올해)
  let m = s.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) {
    const now = new Date();
    const y = m[1] ? m[1] : String(now.getFullYear());
    const mm = m[2].padStart(2, "0");
    const dd = m[3].padStart(2, "0");
    const iso = `${y}-${mm}-${dd}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }

  // 2) 연속 8자리: 20250910
  m = s.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }

  // 3) 일반 구분자(. / -)
  const norm = s.replace(/[^\d./-]/g, " ").replace(/[.\/]/g, "-");
  // 3-1) YYYY-M-D
  m = norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const iso = `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
  // 3-2) YY-M-D → 20YY
  m = norm.match(/(\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const iso = `20${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
  // 3-3) M-D (연도 없음 → 올해)
  m = norm.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const y = String(new Date().getFullYear());
    const iso = `${y}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }

  return null;
}

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

export default function UrgentSyncClients() {
  useEffect(() => {
    const scan = () => {
      const table = (document.querySelector("main table") || document.querySelector("table")) as HTMLTableElement | null;
      if (!table) return;
      const thead = table.querySelector("thead");
      const tbody = table.querySelector("tbody");
      if (thead) { try { setThead(thead.outerHTML); } catch {} }
      if (!tbody) return;

      // '입주' 컬럼 인덱스 우선
      let moveIdx = -1;
      if (thead) {
        const ths = Array.from(thead.querySelectorAll("th"));
        moveIdx = ths.findIndex(th => /입주|입주일|이사|이사일/i.test(th.textContent || ""));
        if (moveIdx < 0) moveIdx = ths.findIndex(th => /날짜|일자|마감/i.test(th.textContent || ""));
      }

      const next: any[] = [];
      Array.from(tbody.querySelectorAll("tr")).forEach((tr) => {
        let txt = "";
        if (moveIdx >= 0) {
          const td = (tr as HTMLTableRowElement).querySelectorAll("td")[moveIdx];
          txt = (td?.textContent || "").trim();
        }
        if (!txt) txt = (tr.textContent || ""); // 행 전체에서 탐지

        const iso = parseDate(txt);
        if (!iso) return;

        const d = daysLeft(iso);
        if (d < 0 || d > 30) return; // 0~30일만 복사

        next.push({
          id: rowId(tr as HTMLTableRowElement),
          moveIn: iso,
          days: d,
          rowHTML: (tr as HTMLTableRowElement).innerHTML
        });
      });

      next.sort((a,b) => a.days - b.days);

      const before = listRows();
      if (JSON.stringify(before) !== JSON.stringify(next)) {
        try { saveRows(next); } catch {}
      }
    };

    const iv = setInterval(scan, 600);
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => { clearInterval(iv); mo.disconnect(); };
  }, []);
  return null;
}
