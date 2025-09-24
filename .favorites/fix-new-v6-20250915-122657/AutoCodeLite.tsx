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
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  proto?.set?.call(input, value);
  input.dispatchEvent(new Event("input",  { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/** 포커스 가능한 요소 */
function focusables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("input,select,textarea,button,[tabindex]"))
    .filter(el => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.offsetParent !== null);
}

/** 코드 입력칸 찾기: 라벨/placeholder/name/id 모두 시도 */
function findCodeInput(scope: ParentNode): HTMLInputElement | null {
  // label for="..."
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
  // 속성 기반
  const byAttr = scope.querySelector('input[name*="code" i],input#code,input[placeholder*="코드"],input[aria-label*="코드"]') as HTMLInputElement | null;
  if (byAttr) return byAttr;
  // 텍스트 근접
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
  return null;
}

export default function AutoCodeLite(){
  useEffect(() => {
    if ((window as any).__auto_code_v5) return;
    (window as any).__auto_code_v5 = true;

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
        if (codeInp.readOnly || codeInp.value.trim() === "" || /^([A-Z]{1,3})-\d{4}$/.test(codeInp.value)) {
          reactSetValue(codeInp, code);
          codeInp.readOnly = true;
        }
      }
      (window as any).__ac_state = { pre, next, code };
    };

    // 클릭/체인지(가벼운 위임)
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

    // Tab 백업: 기본 Tab이 실패한 경우에만 다음 요소로 이동
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
      (window as any).__auto_code_v5 = false;
    };
  }, []);

  return null;
}
