"use client";
import { useEffect } from "react";

/** 접두사 규칙 */
function prefixBy(deal: string, bt: string): string {
  if (/아파트/.test(bt))       return "C";
  if (/재개발|재건축/.test(bt)) return "J";
  if (/상가|사무/.test(bt))     return "R";
  if (/월세/.test(deal))        return "BO";
  if (/전세/.test(deal))        return "BL";
  if (/매매/.test(deal))        return "BM";
  return "X";
}

/** storage helpers */
const loadCounters = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem("codeCounters")||"{}"); } catch { return {}; } };
const loadUsed     = (): Set<string> => { try { return new Set<string>(JSON.parse(localStorage.getItem("usedCodes")||"[]")); } catch { return new Set(); } };
const saveCounters = (o: Record<string, number>) => localStorage.setItem("codeCounters", JSON.stringify(o));
const saveUsed     = (s: Set<string>) => localStorage.setItem("usedCodes", JSON.stringify(Array.from(s)));

/** React 제어 input에 안전하게 값 넣기 */
function reactSetValue(input: HTMLInputElement, value: string) {
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  desc?.set?.call(input, value);
  input.dispatchEvent(new Event("input",  { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/** 포커스 가능한 요소 */
function focusables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("input,select,textarea,button,[tabindex]"))
    .filter(el => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.offsetParent !== null);
}

/** 텍스트 일치 확인 */
const hasText = (el: Element | null, re: RegExp) => !!el && re.test((el.textContent || "").replace(/\s+/g,""));

/** 코드 입력칸 찾기: 라벨/속성/텍스트근접/‘수정’버튼/‘기본·거래’ 블록까지 전부 */
function findCodeInput(scope: ParentNode): HTMLInputElement | null {
  // 1) label for="id"
  for (const lab of Array.from(document.querySelectorAll("label"))) {
    const txt = (lab.textContent || "").replace(/\s+/g,"");
    if (!/코드번호|코드/i.test(txt)) continue;
    const id = lab.getAttribute("for");
    if (id) {
      const byFor = document.getElementById(id) as HTMLInputElement | null;
      if (byFor) return byFor;
    }
    const near = lab.parentElement?.querySelector("input") as HTMLInputElement | null;
    if (near) return near;
  }

  // 2) 속성 기반
  const byAttr = scope.querySelector('input[name*="code" i], input#code, input[placeholder*="코드"], input[aria-label*="코드"]') as HTMLInputElement | null;
  if (byAttr) return byAttr;

  // 3) '코드번호' 텍스트가 있는 컨테이너 근처
  for (const el of Array.from(scope.querySelectorAll<HTMLElement>("div,section,fieldset,header,span,strong,small,p"))) {
    const text = (el.textContent || "").replace(/\s+/g,"");
    if (/코드번호/.test(text)) {
      const inSame = el.querySelector("input") as HTMLInputElement | null;
      if (inSame) return inSame;
      const parent = el.closest("div,section,fieldset") || el.parentElement;
      const inParent = parent?.querySelector("input") as HTMLInputElement | null;
      if (inParent) return inParent;
    }
  }

  // 4) '수정' 버튼 옆 input
  for (const btn of Array.from(scope.querySelectorAll("button"))) {
    const label = (btn.textContent || "").replace(/\s+/g,"");
    if (/수정/.test(label)) {
      let prev = btn.previousElementSibling as HTMLElement | null;
      while (prev && prev.tagName !== "INPUT") prev = prev.previousElementSibling as HTMLElement | null;
      if (prev && prev.tagName === "INPUT") return prev as HTMLInputElement;
    }
  }

  // 5) '기본/거래' 섹션 안 첫 번째 input
  const sec = Array.from(scope.querySelectorAll<HTMLElement>("section,div"))
    .find(el => hasText(el, /기본.?거래|기본\/거래/));
  if (sec) {
    const firstInput = sec.querySelector("input") as HTMLInputElement | null;
    if (firstInput) return firstInput;
  }

  // 6) 최후: 페이지 상단의 첫 번째 input
  return scope.querySelector("input") as HTMLInputElement | null;
}

export default function AutoCodeLite(){
  useEffect(() => {
    if ((window as any).__auto_code_v6) return;
    (window as any).__auto_code_v6 = true;

    const scope = (document.querySelector("form") as HTMLElement) || document.body;

    let selDeal = ""; // 월세/전세/매매
    let selBT   = ""; // 아파트/오피스텔/...

    const applyCode = () => {
      if (!selDeal || !selBT) return;
      const pre = prefixBy(selDeal, selBT);
      const counters = loadCounters();
      const used = loadUsed();

      let next = (counters[pre] || 0) + 1;
      let code = `${pre}-${String(next).padStart(4,"0")}`;
      let guard = 0;
      while (used.has(code) && guard++ < 10000) { next++; code = `${pre}-${String(next).padStart(4,"0")}`; }

      const codeInp = findCodeInput(scope);
      if (codeInp) {
        // disabled여도 값은 채워지게 하고, React 제어 입력도 대응
        reactSetValue(codeInp, code);
        codeInp.readOnly = true;
      }
      (window as any).__ac_state = { pre, next, code };
    };

    // 이벤트(가벼운 위임)
    const buildingRe = /아파트|오피스텔|빌라|다세대|단독|다가구|상가|사무|재개발|재건축/;
    const dealRe     = /월세|전세|매매/;

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t) return;
      const btn = t.closest("button,[role='button'],[role='radio'],label,.chip,.badge") as HTMLElement | null;
      if (!btn) return;
      const txt = (btn.textContent || btn.getAttribute("data-value") || "").replace(/\s+/g,"").trim();
      if (dealRe.test(txt))    { selDeal = txt; applyCode(); }
      if (buildingRe.test(txt)){ selBT   = txt; applyCode(); }
    };
    const onChange = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLSelectElement | null;
      if (!el) return;
      const raw = (el as HTMLInputElement).value || (el as any).labels?.[0]?.textContent || "";
      const txt = raw.replace(/\s+/g,"").trim();
      if (dealRe.test(txt))    { selDeal = txt; applyCode(); }
      if (buildingRe.test(txt)){ selBT   = txt; applyCode(); }
    };
    scope.addEventListener("click", onClick, true);
    scope.addEventListener("change", onChange, true);

    // Tab 백업: 기본 동작이 실패했을 때만 개입
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== "Tab") return;
      const before = document.activeElement as HTMLElement | null;
      setTimeout(() => {
        const after = document.activeElement as HTMLElement | null;
        if (after === before) {
          const nodes = focusables(scope);
          if (nodes.length === 0) return;
          const dir = ev.shiftKey ? -1 : 1;
          const idx = Math.max(0, nodes.indexOf(before || nodes[0]));
          const next = nodes[(idx + dir + nodes.length) % nodes.length];
          next?.focus();
        }
      }, 0);
    };
    scope.addEventListener("keydown", onKeyDown, true);

    // 제출 시 카운터 커밋
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

    return () => {
      scope.removeEventListener("click", onClick, true);
      scope.removeEventListener("change", onChange, true);
      scope.removeEventListener("keydown", onKeyDown, true);
      form?.removeEventListener("submit", onSubmit);
      (window as any).__auto_code_v6 = false;
    };
  }, []);

  return null;
}
