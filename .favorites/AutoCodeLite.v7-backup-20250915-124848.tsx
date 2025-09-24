"use client";
import { useEffect } from "react";

/** 접두사 규칙 */
function prefixBy(deal: string, bt: string): string {
  if (bt === "아파트")                return "C";
  if (bt === "재개발/재건축")          return "J";
  if (bt === "상가/사무실")            return "R";
  if (deal === "월세")                 return "BO";
  if (deal === "전세")                 return "BL";
  if (deal === "매매")                 return "BM";
  return "X";
}

const DEALS = ["월세","전세","매매"] as const;
const BTS   = ["아파트","오피스텔","단독/다가구(상가주택)","빌라/다세대","상가/사무실","재개발/재건축"] as const;

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

/** 코드 입력칸(우린 이미 name="code" 확인됨) */
function findCodeInput(scope: ParentNode): HTMLInputElement | null {
  const byName = scope.querySelector('input[name="code"]') as HTMLInputElement | null;
  if (byName) return byName;
  // 보조
  const byAttr = scope.querySelector('input[name*="code" i], input#code, input[placeholder*="코드"], input[aria-label*="코드"]') as HTMLInputElement | null;
  return byAttr;
}

/** 클릭된 엘리먼트에서 조상 4단계까지 올라가며 라벨을 정확 매칭 */
function pickLabelFromEventTarget(target: HTMLElement): {deal?: typeof DEALS[number], bt?: typeof BTS[number]} {
  let node: HTMLElement | null = target;
  for (let depth=0; depth<4 && node; depth++, node = node.parentElement) {
    const txt = (node.textContent || "").replace(/\s+/g,"").trim();
    // 정확 매칭(부분문자열 금지)
    const deal = DEALS.find(d => txt === d);
    if (deal) return { deal };
    const bt = BTS.find(b => txt === b);
    if (bt) return { bt };
  }
  // 그래도 못 찾으면 가장 가까운 텍스트 토큰 단위로 시도
  node = target;
  for (let depth=0; depth<4 && node; depth++, node = node.parentElement) {
    const txt = (node.textContent || "").replace(/\s+/g,"").trim();
    const deal = DEALS.find(d => txt.includes(d));
    const bt   = BTS.find(b => txt.includes(b));
    if (deal || bt) return { deal, bt };
  }
  return {};
}

export default function AutoCodeLite(){
  useEffect(() => {
    if ((window as any).__auto_code_v7) return;
    (window as any).__auto_code_v7 = true;

    const scope = (document.querySelector("form") as HTMLElement) || document.body;

    let selDeal = ""; // 월세/전세/매매
    let selBT   = ""; // 아파트/오피스텔/...

    const applyCode = () => {
      if (!selDeal || !selBT) return;
      const pre = prefixBy(selDeal as any, selBT as any);
      const counters = loadCounters();
      const used = loadUsed();

      let next = (counters[pre] || 0) + 1;
      let code = `${pre}-${String(next).padStart(4,"0")}`;
      let guard = 0;
      while (used.has(code) && guard++ < 10000) { next++; code = `${pre}-${String(next).padStart(4,"0")}`; }

      const codeInp = findCodeInput(scope);
      if (codeInp) {
        reactSetValue(codeInp, code);
        codeInp.readOnly = true; // 사용자가 원하면 '수정' 버튼으로 해제
      }
      (window as any).__ac_state = { pre, next, code };
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t) return;
      const got = pickLabelFromEventTarget(t);
      if (got.deal) { selDeal = got.deal; }
      if (got.bt)   { selBT   = got.bt; }
      if (got.deal || got.bt) applyCode();
    };

    const onChange = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLSelectElement | null;
      if (!el) return;
      const txt = ((el as HTMLInputElement).value || (el as any).labels?.[0]?.textContent || "")
        .replace(/\s+/g,"").trim();
      if (DEALS.includes(txt as any)) selDeal = txt as any;
      if (BTS.includes(txt as any))   selBT   = txt as any;
      if (DEALS.includes(txt as any) || BTS.includes(txt as any)) applyCode();
    };

    scope.addEventListener("click", onClick, true);
    scope.addEventListener("change", onChange, true);

    // Tab 백업: 기본 Tab이 실패했을 때만 개입
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
      (window as any).__auto_code_v7 = false;
    };
  }, []);

  return null;
}
