"use client";

import { useEffect } from "react";

export default function TabRescue() {
  useEffect(() => {
    const isVisible = (el: HTMLElement) => {
      const s = window.getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const focusablesSelector =
      'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

    const getCycleList = (container: HTMLElement) => {
      return Array.from(container.querySelectorAll<HTMLElement>(focusablesSelector))
        .filter(isVisible)
        .filter((el) => !el.hasAttribute("inert"));
    };

    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const from = document.activeElement as HTMLElement | null;
      const shift = e.shiftKey;
      if (!from) return;

      setTimeout(() => {
        const after = document.activeElement as HTMLElement | null;
        if (after && after !== from) return; // 정상 이동됨

        const container = (from.closest("form") as HTMLElement) || document.body;
        const list = getCycleList(container);
        if (!list.length) return;

        const idx = list.indexOf(from);
        const start = idx >= 0 ? idx : Math.max(0, list.findIndex((el) => isVisible(el)));
        let nextIdx = start;

        for (let i = 0; i < list.length + 1; i++) {
          nextIdx = shift
            ? (nextIdx - 1 + list.length) % list.length
            : (nextIdx + 1) % list.length;
          const candidate = list[nextIdx];
          if (candidate && candidate !== from && isVisible(candidate)) {
            try { (candidate as any).focus({ preventScroll: true }); }
            catch { candidate.focus(); }
            break;
          }
        }
      }, 0);
    };

    window.addEventListener("keydown", onKeyDownCapture, true);
    return () => window.removeEventListener("keydown", onKeyDownCapture, true);
  }, []);

  return null;
}