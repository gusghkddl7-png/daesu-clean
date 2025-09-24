"use client";
import { useEffect } from "react";
import { setThead, listRows, saveRows, daysLeftFromISO } from "./urgentStore";

/** YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD / M-D / M/D / 2025년9월1일 등 대응 */
function parseDate(text: string): string | null {
  const s = (text || "").trim();
  if (!s) return null;

  // 한글형식: 2025년 9월 1일
  const kn = s.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (kn) {
    const y = kn[1], m = kn[2].padStart(2,"0"), d = kn[3].padStart(2,"0");
    const iso = `${y}-${m}-${d}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }

  // 일반 형식 정규화 (. / -)
  const raw = s.replace(/[^\d./-]/g, " ").trim().replace(/[.\/]/g, "-");
  const m = raw.match(/(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}-\d{1,2})/);
  if (!m) return null;

  let [a,b,c] = m[0].split("-");
  if (m[0].length >= 8) {
    // YYYY-M-D
    const y = a, mm = b.padStart(2,"0"), dd = c.padStart(2,"0");
    const iso = `${y}-${mm}-${dd}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  } else {
    // M-D → 올해로 가정
    const now = new Date();
    const y = String(now.getFullYear());
    const mm = a.padStart(2,"0"), dd = b.padStart(2,"0");
    const iso = `${y}-${mm}-${dd}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
}

/** 행에서 id 후보(전화번호 우선) */
function rowId(tr: HTMLTableRowElement): string {
  const t = tr.textContent || "";
  const p = t.match(/\d{2,3}-?\d{3,4}-?\d{4}/);
  if (p) return p[0];
  const tds = Array.from(tr.querySelectorAll("td"));
  return (tds[0]?.textContent || "row") + ":" + (tds[1]?.textContent || "");
}

export default function UrgentSyncClients() {
  useEffect(() => {
    const scan = () => {
      // 고객문의 테이블 탐색
      const table = (document.querySelector("main table") || document.querySelector("table")) as HTMLTableElement | null;
      if (!table) return;

      // 헤더 보존(있으면)
      const thead = table.querySelector("thead");
      if (thead) { try { setThead(thead.outerHTML); } catch {} }

      const tbody = table.querySelector("tbody");
      if (!tbody) return;

      // '입주일' 컬럼 인덱스 우선 탐색
      let moveIdx = -1;
      if (thead) {
        const ths = Array.from(thead.querySelectorAll("th"));
        moveIdx = ths.findIndex(th => /입주|입주일|이사|이사일/i.test(th.textContent || ""));
        if (moveIdx < 0) moveIdx = ths.findIndex(th => /날짜|일자|마감/i.test(th.textContent || ""));
      }

      const next: any[] = [];
      Array.from(tbody.querySelectorAll("tr")).forEach((tr, i) => {
        let moveText = "";
        if (moveIdx >= 0) {
          const td = (tr as HTMLTableRowElement).querySelectorAll("td")[moveIdx];
          moveText = (td?.textContent || "").trim();
        }
        // 보조: 행 전체에서 날짜 직접 탐지
        if (!moveText) {
          const whole = (tr.textContent || "");
          const k = whole.match(/\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일/);
          const n = whole.match(/\d{4}[./-]\d{1,2}[./-]\d{1,2}|\b\d{1,2}[./-]\d{1,2}\b/);
          moveText = (k?.[0] || n?.[0] || "").trim();
        }
        const iso = parseDate(moveText);
        if (!iso) return;

        const d = daysLeftFromISO(iso);
        if (d < 0 || d > 30) return; // 0~30일만 급함

        next.push({
          id: rowId(tr as HTMLTableRowElement),
          moveIn: iso,
          days: d,
          rowHTML: (tr as HTMLTableRowElement).innerHTML
        });
      });

      // 급한 순 정렬
      next.sort((a,b) => a.days - b.days);

      // 저장(변경 시에만)
      const before = listRows();
      if (JSON.stringify(before) !== JSON.stringify(next)) {
        try { saveRows(next); } catch {}
      }
    };

    // 초기 + 동적 변경 감지
    const iv = setInterval(scan, 600);
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => { clearInterval(iv); mo.disconnect(); };
  }, []);

  return null;
}
