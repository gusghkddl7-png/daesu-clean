"use client";
import { useEffect } from "react";
import { setThead, listRows, saveRows, daysLeftFromISO } from "./urgentStore";

/** 간단 날짜 파서: 2025-09-01 / 2025.09.01 / 2025/09/01 / 9-1 / 9/1 등 대응 */
function parseDate(text: string): string | null {
  const s = (text || "").trim();
  if (!s) return null;
  // 숫자/구분자만 추출
  const raw = s.replace(/[^\d./-]/g, "").replace(/[.\/]/g, "-");
  if (!raw) return null;
  const parts = raw.split("-").filter(Boolean).map(x => x.padStart(2, "0"));
  let y = "", m = "", d = "";
  if (parts.length === 3) {
    if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
    else { // YY-MM-DD → 20YY 보정 가정
      y = "20" + parts[0].slice(-2); m = parts[1]; d = parts[2];
    }
  } else if (parts.length === 2) {
    const now = new Date();
    y = String(now.getFullYear());
    m = parts[0]; d = parts[1];
  } else return null;
  const iso = `${y}-${m}-${d}`;
  if (isNaN(new Date(iso).getTime())) return null;
  return iso;
}

/** 전화번호/이름 등에서 id 추출 */
function makeId(tr: HTMLTableRowElement): string {
  const text = tr.textContent || "";
  const m = text.match(/\d{2,3}-?\d{3,4}-?\d{4}/);
  if (m) return m[0];
  // 폴백: 첫 두 셀 조합
  const tds = Array.from(tr.querySelectorAll("td"));
  return (tds[0]?.textContent || "row") + ":" + (tds[1]?.textContent || "");
}

export default function UrgentSyncClients() {
  useEffect(() => {
    const apply = () => {
      const table = (document.querySelector("main table") || document.querySelector("table")) as HTMLTableElement | null;
      if (!table) return;
      const thead = table.querySelector("thead");
      const tbody = table.querySelector("tbody");
      if (!thead || !tbody) return;

      // 헤더 저장(디자인 그대로)
      try { setThead(thead.outerHTML); } catch {}

      // 입주일 컬럼 인덱스 찾기
      const ths = Array.from(thead.querySelectorAll("th"));
      let moveIdx = ths.findIndex(th => /입주|입주일|이사|이사일/i.test(th.textContent || ""));
      if (moveIdx < 0) moveIdx = ths.findIndex(th => /날짜|일자|마감/i.test(th.textContent || ""));

      const next: any[] = [];
      Array.from(tbody.querySelectorAll("tr")).forEach((tr) => {
        let moveText = "";
        if (moveIdx >= 0) {
          const td = tr.querySelectorAll("td")[moveIdx];
          moveText = (td?.textContent || "").trim();
        } else {
          // 백업: 행에서 날짜 패턴 검색
          const m = (tr.textContent || "").match(/\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}|\d{1,2}[.\/-]\d{1,2}/);
          moveText = m ? m[0] : "";
        }
        const iso = parseDate(moveText);
        if (!iso) return;
        const d = daysLeftFromISO(iso);
        if (d < 0 || d > 30) return; // 0~30일만 "급함"으로 복사
        const id = makeId(tr as HTMLTableRowElement);
        const rowHTML = (tr as HTMLTableRowElement).innerHTML;
        next.push({ id, moveIn: iso, days: d, rowHTML });
      });

      // 정렬: 가장 급한 순
      next.sort((a, b) => a.days - b.days);
      const before = listRows();
      const changed = JSON.stringify(before) !== JSON.stringify(next);
      if (changed) saveRows(next);
    };

    const iv = setInterval(apply, 500);
    const mo = new MutationObserver(() => apply());
    mo.observe(document.body, { childList: true, subtree: true });
    apply();
    return () => { clearInterval(iv); mo.disconnect(); };
  }, []);
  return null;
}
