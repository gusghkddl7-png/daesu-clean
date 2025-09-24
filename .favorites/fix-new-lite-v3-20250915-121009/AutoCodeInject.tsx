"use client";
import { useEffect } from "react";

/** 접두사 규칙 */
function prefixBy(deal: string, bt: string): string {
  if (/아파트/.test(bt)) return "C";
  if (/재개발|재건축/.test(bt)) return "J";
  if (/상가|사무/.test(bt)) return "R";
  if (/월세/.test(deal)) return "BO";
  if (/전세/.test(deal)) return "BL";
  if (/매매/.test(deal)) return "BM";
  return "X";
}

/** storage helpers */
const loadCounters = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem("codeCounters")||"{}"); } catch { return {}; } };
const loadUsed = (): Set<string> => { try { return new Set<string>(JSON.parse(localStorage.getItem("usedCodes")||"[]")); } catch { return new Set(); } };
const saveCounters = (o: Record<string, number>) => localStorage.setItem("codeCounters", JSON.stringify(o));
const saveUsed = (s: Set<string>) => localStorage.setItem("usedCodes", JSON.stringify(Array.from(s)));

/** 포커스 가능한 요소 수집 */
function focusables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("input,select,textarea,button,[tabindex]"))
    .filter(el => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.offsetParent !== null);
}

export default function AutoCodeInject(){
  useEffect(() => {
    // 중복 마운트 방지(React StrictMode)
    if ((window as any).__ac_injected) return;
    (window as any).__ac_injected = true;

    const scope = (document.querySelector("form") as HTMLElement) || document.body;

    // 코드 입력칸 탐색(없어도 동작)
    const findCodeInput = (): HTMLInputElement | null => {
      const q = 'input[name*="code" i], input#code, input[placeholder*="코드"], input[placeholder*="code" i]';
      return scope.querySelector(q) as HTMLInputElement | null;
    };

    // 라디오/칩 버튼 클릭을 가벼운 이벤트 위임으로 감지 (MutationObserver 사용 안 함)
    let selDeal = ""; let selBT = "";
    const buildingRegex = /아파트|오피스텔|빌라|다세대|단독|다가구|상가|사무|재개발|재건축/;
    const dealRegex = /월세|전세|매매/;

    const recompute = () => {
      if (!selDeal || !selBT) return;
      const pre = prefixBy(selDeal, selBT);
      const counters = loadCounters();
      const used = loadUsed();
      let next = (counters[pre] || 0) + 1;
      let code = `${pre}-${String(next).padStart(4,"0")}`;
      let guard = 0;
      while (used.has(code) && guard++ < 10000) { next++; code = `${pre}-${String(next).padStart(4,"0")}`; }
      // 상단 배지 없이, 입력칸에 바로 채움(있을 때만)
      const codeInp = findCodeInput();
      if (codeInp) {
        // 사용자가 '수정'해서 편집 중이면 덮어쓰지 않음 (readonly가 아닐 때는 유지)
        if (codeInp.readOnly || codeInp.value.trim() === "" || /^([A-Z]{1,3})-\d{4}$/.test(codeInp.value)) {
          codeInp.value = code;
          codeInp.readOnly = true;
        }
      }
      // 제출 시 커밋할 상태 저장
      (window as any).__ac_state = { pre, next, code };
    };

    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement);
      if (!t) return;
      const btn = t.closest("button, [role='button'], [data-value]") as HTMLElement | null;
      if (!btn) return;
      const label = (btn.textContent || btn.getAttribute("data-value") || "").trim();
      if (dealRegex.test(label)) { selDeal = label; recompute(); }
      else if (buildingRegex.test(label)) { selBT = label; recompute(); }
    };
    scope.addEventListener("click", onClick, true);

    // 탭 이동: 기본 탭이 막히는 페이지 대응(필요시에만 개입)
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== "Tab") return;
      const nodes = focusables(scope);
      if (nodes.length === 0) return;
      const dir = ev.shiftKey ? -1 : 1;
      const cur = document.activeElement as HTMLElement | null;
      const idx = Math.max(0, nodes.indexOf(cur || nodes[0]));
      const next = nodes[(idx + dir + nodes.length) % nodes.length];
      if (next && next !== cur) {
        ev.preventDefault();
        next.focus();
      }
    };
    scope.addEventListener("keydown", onKeyDown);

    // 첫 클릭 포커스(더블클릭 방지)
    const onMouseDownCapture = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement;
      if (t && (t.matches("input,select,textarea") || t.closest("input,select,textarea"))) {
        const el = (t.closest("input,select,textarea") as HTMLElement) || t;
        if (document.activeElement !== el) { (el as HTMLElement).focus(); }
      }
    };
    scope.addEventListener("mousedown", onMouseDownCapture, { capture: true });

    // 폼 제출 시 카운터/사용코드 커밋(중복 방지 포함)
    const onSubmit = () => {
      const st = (window as any).__ac_state;
      if (!st?.pre || !st?.next || !st?.code) return;
      const counters = loadCounters(); const used = loadUsed();
      counters[st.pre] = Math.max(counters[st.pre] || 0, st.next);
      used.add(st.code);
      saveCounters(counters); saveUsed(used);
    };
    const form = document.querySelector("form");
    form?.addEventListener("submit", onSubmit);

    // 정리
    return () => {
      scope.removeEventListener("click", onClick, true);
      scope.removeEventListener("keydown", onKeyDown);
      scope.removeEventListener("mousedown", onMouseDownCapture, { capture: true } as any);
      form?.removeEventListener("submit", onSubmit);
      (window as any).__ac_injected = false;
    };
  }, []);

  return null;
}
