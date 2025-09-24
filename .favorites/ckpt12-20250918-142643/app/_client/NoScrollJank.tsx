"use client";
import { useEffect } from "react";

/**
 * v6:
 *  - 입력 직후 포커스 유실을 "리마운트 추적"으로 해결: 동일 칸을 다시 찾아 재포커스(캐럿 복구)
 *  - window/#app-scroll 스크롤 핀 고정 그대로 유지
 *  - "#" 앵커/빈 href, 엔터 자동 submit, hash/popstate, submit 완화
 */
export default function NoScrollJank() {
  useEffect(() => {
    const N = 800; // 보호 시간(ms)
    const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

    const isEditable = (el: HTMLElement | null) => {
      if (!el) return false;
      const tag = el.tagName;
      if ((el as any).isContentEditable) return true;
      if (tag === "INPUT") {
        const type = (el as HTMLInputElement).type;
        return !["button","submit","checkbox","radio","range","color","file","image","reset"].includes(type);
      }
      return tag === "TEXTAREA" || tag === "SELECT";
    };

    // ===== 스크롤 핀 (윈도우/컨테이너) =====
    let wLockUntil = 0, wPinY = 0;
    let cLockUntil = 0, cPinY = 0;

    // ===== 포커스 스틱 + 리마운트 추적 =====
    let refocusUntil = 0;
    let lastEl: any = null;
    let lastSelStart: number | null = null;
    let lastSelEnd: number | null = null;
    let fp: { id?: string; name?: string; type?: string; placeholder?: string } | null = null;

    const saveCaret = (el: any) => {
      try {
        if (typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
          lastSelStart = el.selectionStart;
          lastSelEnd = el.selectionEnd;
        } else {
          lastSelStart = lastSelEnd = null;
        }
      } catch { lastSelStart = lastSelEnd = null; }
    };

    const fingerprint = (el: any) => ({
      id: el?.id || undefined,
      name: el?.name || undefined,
      type: el?.type || undefined,
      placeholder: el?.placeholder || undefined,
    });

    const findByFingerprint = () => {
      if (!fp) return null;
      // 우선순위: id > name[type] > name > placeholder
      if (fp.id) {
        const byId = document.getElementById(fp.id);
        if (byId && isEditable(byId as any)) return byId;
      }
      if (fp.name && fp.type) {
        const el = document.querySelector(`input[name="${CSS.escape(fp.name)}"][type="${CSS.escape(fp.type)}"]`) as any;
        if (el && isEditable(el)) return el;
      }
      if (fp.name) {
        const el = document.querySelector(`[name="${CSS.escape(fp.name)}"]`) as any;
        if (el && isEditable(el)) return el;
      }
      if (fp.placeholder) {
        const el = document.querySelector(`input[placeholder="${CSS.escape(fp.placeholder)}"], textarea[placeholder="${CSS.escape(fp.placeholder)}"]`) as any;
        if (el && isEditable(el)) return el;
      }
      return null;
    };

    const startPins = () => {
      // window pin
      wPinY = window.scrollY || window.pageYOffset || 0;
      wLockUntil = now() + N;
      // container pin
      const sc = document.getElementById("app-scroll");
      if (sc) {
        cPinY = sc.scrollTop;
        cLockUntil = now() + N;
      }
      if (!raf) tick();
    };

    const markEditable = (el: HTMLElement | null) => {
      if (!isEditable(el)) return;
      lastEl = el;
      fp = fingerprint(el);
      saveCaret(el);
      refocusUntil = now() + N;
      startPins();
    };

    let raf = 0;
    const tick = () => {
      raf = 0;
      const t = now();

      // 1) 스크롤 복원(윈도우)
      if (t < wLockUntil) {
        const cur = window.scrollY || window.pageYOffset || 0;
        if (cur < wPinY) {
          (window as any)._origScrollTo ? (window as any)._origScrollTo(0, wPinY) : window.scrollTo(0, wPinY);
        }
      }
      // 2) 스크롤 복원(컨테이너)
      const sc = document.getElementById("app-scroll");
      if (sc && t < cLockUntil) {
        if (sc.scrollTop < cPinY) sc.scrollTop = cPinY;
      }

      // 3) 포커스 스틱/리마운트 추적
      if (t < refocusUntil && fp) {
        let target: any = null;
        if (lastEl && document.contains(lastEl)) {
          target = lastEl;
        } else {
          target = findByFingerprint();
          if (target) lastEl = target;
        }
        if (target && document.activeElement !== target) {
          try { target.focus({ preventScroll: true }); } catch { target.focus(); }
          if (typeof target.setSelectionRange === "function" && lastSelStart !== null && lastSelEnd !== null) {
            try { target.setSelectionRange(lastSelStart, lastSelEnd); } catch {}
          }
        }
      }

      if (t < Math.max(wLockUntil, cLockUntil, refocusUntil)) {
        raf = requestAnimationFrame(tick);
      }
    };

    // window.scrollTo 가로채기(맨 위 점프 무시)
    const origScrollTo = window.scrollTo.bind(window);
    (window as any)._origScrollTo = origScrollTo;
    window.scrollTo = function (...args: any[]) {
      try {
        const t = now();
        const within = t < wLockUntil;
        let targetY: number | undefined;
        if (args.length === 1 && typeof args[0] === "object" && args[0]) {
          const o = args[0] as any;
          targetY = typeof o.top === "number" ? o.top : (typeof o.y === "number" ? o.y : undefined);
        } else if (args.length >= 2 && typeof args[1] === "number") {
          targetY = args[1];
        }
        if (within && typeof targetY === "number" && targetY <= 0 && wPinY > 0) return;
      } catch {}
      return origScrollTo(...(args as any));
    } as any;

    // 컨테이너 scrollTo 가로채기
    const scEl = document.getElementById("app-scroll") as any;
    let origContainerScrollTo: any = null;
    if (scEl && typeof scEl.scrollTo === "function") {
      origContainerScrollTo = scEl.scrollTo.bind(scEl);
      scEl.scrollTo = function (...args: any[]) {
        try {
          const t = now();
          const within = t < cLockUntil;
          let targetY: number | undefined;
          if (args.length === 1 && typeof args[0] === "object" && args[0]) {
            const o = args[0] as any;
            targetY = typeof o.top === "number" ? o.top : (typeof o.y === "number" ? o.y : undefined);
          } else if (args.length >= 2 && typeof args[1] === "number") {
            targetY = args[1];
          }
          if (within && typeof targetY === "number" && targetY <= 0 && cPinY > 0) return;
        } catch {}
        return origContainerScrollTo(...(args as any));
      } as any;
    }

    // === 전역 이벤트 ===
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.('a[href="#"], a[href=""]') as HTMLAnchorElement | null;
      if (a) e.preventDefault();
    };
    document.addEventListener("click", onClick, { capture: true });

    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "Enter" && el && el.tagName !== "TEXTAREA") {
        const form = el.closest("form");
        if (form) e.preventDefault();
      }
      markEditable(el);
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });

    const onInput = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (isEditable(el)) {
        saveCaret(el);
        markEditable(el);
      }
    };
    document.addEventListener("input", onInput, { capture: true });
    document.addEventListener("compositionstart", onInput as any, { capture: true });
    document.addEventListener("compositionend", onInput as any, { capture: true });

    const onSubmit = (e: Event) => e.preventDefault();
    document.addEventListener("submit", onSubmit, { capture: true });

    const onHashChange = () => startPins();
    const onPopState = () => startPins();
    window.addEventListener("hashchange", onHashChange, { capture: true });
    window.addEventListener("popstate", onPopState, { capture: true });

    try { if ("scrollRestoration" in history) { (history as any).scrollRestoration = "manual"; } } catch {}

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.scrollTo = (window as any)._origScrollTo || window.scrollTo;
      if (scEl && origContainerScrollTo) scEl.scrollTo = origContainerScrollTo;
      document.removeEventListener("click", onClick, { capture: true } as any);
      document.removeEventListener("keydown", onKeyDown, { capture: true } as any);
      document.removeEventListener("input", onInput, { capture: true } as any);
      document.removeEventListener("compositionstart", onInput as any, { capture: true } as any);
      document.removeEventListener("compositionend", onInput as any, { capture: true } as any);
      document.removeEventListener("submit", onSubmit, { capture: true } as any);
      window.removeEventListener("hashchange", onHashChange, { capture: true } as any);
      window.removeEventListener("popstate", onPopState, { capture: true } as any);
    };
  }, []);
  return null;
}
