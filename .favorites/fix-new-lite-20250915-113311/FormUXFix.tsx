"use client";
import { useEffect } from "react";

export default function FormUXFix(){
  useEffect(() => {
    if ((window as any).__formUXFixMounted) return;
    (window as any).__formUXFixMounted = true;

    const scope = (document.querySelector("form") as HTMLElement | null) || document.body;

    // 첫 클릭에도 바로 포커스(더블클릭 방지)
    const onMouseDownCapture = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t) return;
      if (t.matches("input,select,textarea")) {
        // 이미 포커스가 아니면 강제로 포커스
        if (document.activeElement !== t) {
          (t as HTMLElement).focus();
        }
      }
    };
    scope.addEventListener("mousedown", onMouseDownCapture, { capture: true });

    // 탭 순서 정상화
    const normalizeTabOrder = () => {
      const list = Array.from(scope.querySelectorAll<HTMLElement>("input,select,textarea,button,[tabindex]"))
        .filter(el => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.offsetParent !== null);
      list.forEach((el, i) => { el.tabIndex = i + 1; });
    };
    normalizeTabOrder();

    // DOM 변화 시 재보정(필드 추가/표시 전환)
    const mo = new MutationObserver(() => normalizeTabOrder());
    mo.observe(scope, { childList: true, subtree: true, attributes: true });

    return () => {
      scope.removeEventListener("mousedown", onMouseDownCapture, { capture: true } as any);
      mo.disconnect();
      (window as any).__formUXFixMounted = false;
    };
  }, []);

  return null;
}
