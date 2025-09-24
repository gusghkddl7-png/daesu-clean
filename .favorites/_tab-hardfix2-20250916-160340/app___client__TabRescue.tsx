"use client";
import { useEffect } from "react";

/** 전역 Tab 강제 안정화: /listings/new 에서만 활성화 */
export default function TabRescue() {
  useEffect(() => {
    const isNewPage = () => location.pathname.startsWith("/listings/new");
    const isVis = (el: HTMLElement) => {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const focusablesSel =
      'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

    const listIn = (scope: HTMLElement) =>
      Array.from(scope.querySelectorAll<HTMLElement>(focusablesSel))
        .filter(isVis)
        .filter((el) => !el.hasAttribute("inert") && el.tabIndex !== -1);

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !isNewPage()) return;
      const from = document.activeElement as HTMLElement | null;
      if (!from) return;

      // Tab을 우리가 직접 처리 (기본 막고 다음 요소로 포커스)
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

      const scope =
        (from.closest("#listing-new-form") as HTMLElement) ||
        (document.querySelector("#listing-new-form") as HTMLElement) ||
        (from.closest("form") as HTMLElement) ||
        document.body;

      const xs = listIn(scope);
      if (!xs.length) return;

      let idx = xs.indexOf(from);
      if (idx < 0) {
        // 비정상 상태면 눈에 보이는 첫 요소를 시작점으로
        idx = xs.findIndex(isVis);
        if (idx < 0) idx = 0;
      }
      const dir = e.shiftKey ? -1 : 1;
      for (let i = 1; i <= xs.length; i++) {
        const next = xs[(idx + dir * i + xs.length) % xs.length];
        if (next && next !== from && isVis(next)) {
          try {
            (next as any).focus({ preventScroll: true });
          } catch {
            next.focus();
          }
          // 텍스트 입력이면 전체 선택(편의)
          if (/^INPUT|TEXTAREA|SELECT$/.test(next.tagName)) {
            const n: any = next;
            try { if (n.select) n.select(); } catch {}
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  return null;
}