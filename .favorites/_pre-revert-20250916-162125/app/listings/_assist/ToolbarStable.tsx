"use client";
import { useEffect } from "react";

function byText(selector: string, re: RegExp): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const el of els) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (re.test(t)) return el;
  }
  return null;
}
function findRow(anchor: HTMLElement | null): HTMLElement | null {
  let cur = anchor as HTMLElement | null, hop = 0;
  while (cur && hop < 7) {
    const txt = (cur.textContent || "");
    if (/(상세검색|월세매물장|전세매물장|매매매물장|표시\s*\d+\s*\/\s*전체|새로고침)/.test(txt)) return cur;
    cur = cur.parentElement as HTMLElement | null; hop++;
  }
  return null;
}
function leftStick(row: HTMLElement) {
  row.style.display = "flex";
  row.style.flexWrap = "wrap";
  row.style.alignItems = "center";
  row.style.justifyContent = "flex-start";
  row.style.gap = "8px";
  Array.from(row.children).forEach(c => {
    const cs = getComputedStyle(c as HTMLElement);
    if (cs.marginLeft === "auto") (c as HTMLElement).style.marginLeft = "0";
  });
}

export default function ToolbarStable() {
  useEffect(() => {
    if ((document.documentElement as any).__daesuStable) return;
    (document.documentElement as any).__daesuStable = true;

    const hide = () => document.documentElement.classList.add("daesu-hide");
    const show = () => document.documentElement.classList.remove("daesu-hide");
    hide();

    const patch = () => {
      try {
        // 기준 고정(체크포인트 n) 숨김
        Array.from(document.querySelectorAll<HTMLElement>("*")).forEach(el => {
          const t = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (/^기준\s*고정\s*\(체크포인트/i.test(t)) el.style.display = "none";
        });

        const btnAdd = byText("button,a", /\+\s*매물등록/);
        const btnFind = byText("button,a", /상세검색/);
        const vacLbl  = byText("label,span,div", /공\s*실\s*만/);
        const refresh = byText("button,a", /새로고침/);

        // 버튼 라인: 왼쪽 정렬 + 매물등록은 오른쪽 고정
        const btnRow = findRow(btnAdd || btnFind);
        if (btnRow) {
          leftStick(btnRow);
          if (btnAdd) (btnAdd as HTMLElement).style.marginLeft = "auto";
        }

        // 표시건수/새로고침 라인: 왼쪽 정렬
        const countRow = refresh ? findRow(refresh) : null;
        if (countRow) leftStick(countRow);

        // 공실만/거래완료 숨기기 묶음: 오른쪽 고정
        if (vacLbl) {
          const row = findRow(vacLbl) || countRow;
          if (row) (vacLbl.closest("label,div,span") as HTMLElement).style.marginLeft = "auto";
        }

        // 버튼 크기 통일(있을 때만)
        const base = byText("button,a", /(월세매물장|전세매물장|매매매물장)/);
        const t1   = byText("button,a", /상가\/사무실매물장/);
        const t2   = byText("button,a", /재개발매물장/);
        const apply = (el: HTMLElement | null) => {
          if (!el || !base) return;
          const cs = getComputedStyle(base);
          Object.assign(el.style, {
            padding: cs.padding,
            fontSize: cs.fontSize,
            lineHeight: cs.lineHeight,
            borderRadius: cs.borderRadius,
            height: cs.height,
            minHeight: cs.minHeight
          } as Partial<CSSStyleDeclaration>);
        };
        apply(t1); apply(t2);
      } finally {
        requestAnimationFrame(show);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", patch, { once: true });
    } else {
      patch();
    }
  }, []);
  return null;
}
