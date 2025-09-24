"use client";
import { useEffect } from "react";

/** 접두사 규칙(요구사항 고정 매핑) */
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

const norm = (s: string) => s.replace(/\s+/g,"").trim();

/** React 제어 input에 안전하게 값 넣기 */
function reactSetValue(input: HTMLInputElement, value: string) {
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  desc?.set?.call(input, value);
  input.dispatchEvent(new Event("input",  { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/** 포커스 가능한 요소(보이는 것만) */
function focusables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("input,select,textarea,button,[tabindex]"))
    .filter(el => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.offsetParent !== null);
}

/** 라벨 텍스트로 그룹 컨테이너 찾기 */
function findToggleGroup(labelRe: RegExp): HTMLElement | null {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>("div,section,fieldset"));
  for (const b of blocks) {
    const lab = b.querySelector(":scope > *:first-child");
    if (lab && labelRe.test(norm(lab.textContent || ""))) {
      let sib = lab.nextElementSibling as HTMLElement | null;
      while (sib && sib.tagName !== "DIV") sib = sib.nextElementSibling as HTMLElement | null;
      if (sib) return sib;
    }
  }
  return null;
}

/** 코드 입력칸: name="code" (확인됨) */
function findCodeInput(scope: ParentNode): HTMLInputElement | null {
  const byName = scope.querySelector('input[name="code"]') as HTMLInputElement | null;
  if (byName) return byName;
  const byAttr = scope.querySelector('input[name*="code" i], input#code, input[placeholder*="코드"], input[aria-label*="코드"]') as HTMLInputElement | null;
  return byAttr;
}

/** 그룹에서 '선택된 토글'을 찾아 라벨을 돌려줌 */
function getSelectedFromGroup(group: HTMLElement, candidates: readonly string[]): string | undefined {
  // 1) active 속성/aria 기반 후보
  const actSel = [
    '[aria-pressed="true"]','[aria-selected="true"]','[aria-checked="true"]',
    '[data-state="on"]','[data-active="true"]','[data-active="1"]',
    '.active','.bg-black','.bg-blue-600','.text-white'
  ].join(",");
  const act = group.querySelector<HTMLElement>(actSel);
  if (act) {
    const t = norm(act.textContent || "");
    const hit = candidates.find(c => t.includes(c));
    if (hit) return hit;
  }

  // 2) 토큰 정확 매칭(텍스트가 토큰과 정확히 같음)
  for (const el of Array.from(group.querySelectorAll<HTMLElement>("button,[role='button'],[role='radio'],span,div"))) {
    const t = norm(el.textContent || "");
    const hit = candidates.find(c => t === c);
    if (hit) return hit;
  }

  // 3) 토큰 포함(라벨 옆에 아이콘/기호가 있어도 허용)
  for (const el of Array.from(group.querySelectorAll<HTMLElement>("button,[role='button'],[role='radio'],span,div"))) {
    const t = norm(el.textContent || "");
    const hit = candidates.find(c => t.includes(c));
    if (hit) return hit;
  }
  return undefined;
}

export default function AutoCodeLite(){
  useEffect(() => {
    if ((window as any).__auto_code_v9) return;
    (window as any).__auto_code_v9 = true;

    const scope = (document.querySelector("form") as HTMLElement) || document.body;
    const dealGroup = findToggleGroup(/거래유형/);
    const btGroup   = findToggleGroup(/건물유형/);

    let selDeal = ""; // 월세/전세/매매
    let selBT   = ""; // 아파트/오피스텔/...

    // 마지막 코드(리렌더로 사라져도 복구)
    let lastCode = ""; let lastPre  = ""; let lastNext = 0;

    const applyCode = () => {
      if (!selDeal || !selBT) return;
      const pre = prefixBy(selDeal, selBT);
      const counters = (() => { try { return JSON.parse(localStorage.getItem("codeCounters")||"{}"); } catch { return {}; } })() as Record<string,number>;
      const used = (() => { try { return new Set<string>(JSON.parse(localStorage.getItem("usedCodes")||"[]")); } catch { return new Set<string>(); } })();

      let next = (counters[pre] || 0) + 1;
      let code = `${pre}-${String(next).padStart(4,"0")}`;
      let guard = 0;
      while (used.has(code) && guard++ < 10000) { next++; code = `${pre}-${String(next).padStart(4,"0")}`; }

      const codeInp = findCodeInput(scope);
      if (codeInp) {
        const ro = codeInp.readOnly;
        reactSetValue(codeInp, code);   // 포커스 이동 없이 주입
        codeInp.readOnly = ro;
        lastCode = code; lastPre = pre; lastNext = next;
      }
      (window as any).__ac_state = { pre, next, code };
    };

    const recompute = () => {
      if (dealGroup) {
        const v = getSelectedFromGroup(dealGroup, DEALS);
        if (v) selDeal = v;
      }
      if (btGroup) {
        const v = getSelectedFromGroup(btGroup, BTS);
        if (v) selBT = v;
      }
      if (selDeal && selBT) applyCode();
    };

    // 클릭/체인지 모두에서 재계산
    const onAny = () => setTimeout(recompute, 0);
    dealGroup?.addEventListener("click", onAny, true);
    btGroup?.addEventListener("click", onAny, true);
    dealGroup?.addEventListener("change", onAny, true);
    btGroup?.addEventListener("change", onAny, true);

    // 초기 2번 재계산 (초기 렌더 후/지연 렌더 대비)
    setTimeout(recompute, 0);
    setTimeout(recompute, 50);

    // Tab 키: 우리가 직접 다음 포커스로 이동
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== "Tab") return;
      const els = focusables(scope);
      const cur = document.activeElement as HTMLElement | null;
      const idx = els.indexOf(cur || (els[0] || null) as any);
      if (idx < 0) return;
      ev.preventDefault();
      const dir = ev.shiftKey ? -1 : 1;
      const next = els[(idx + dir + els.length) % els.length];
      next?.focus();
    };
    scope.addEventListener("keydown", onKeyDown, true);

    // 리렌더/속성 변경 감시 → 재계산 & 코드 복구
    const mo = new MutationObserver(() => {
      if (lastCode) {
        const inp = findCodeInput(scope);
        if (inp && inp.value !== lastCode) {
          const ro = inp.readOnly;
          reactSetValue(inp, lastCode);
          inp.readOnly = ro;
        }
      }
      recompute();
    });
    mo.observe(scope, { childList: true, subtree: true, attributes: true, attributeFilter: ["class","aria-pressed","aria-selected","aria-checked","data-state","data-active"] });

    // 제출 시 카운터 커밋
    const onSubmit = () => {
      const st = (window as any).__ac_state || { pre: lastPre, next: lastNext, code: lastCode };
      if (!st?.pre || !st?.next || !st?.code) return;
      try {
        const counters = JSON.parse(localStorage.getItem("codeCounters")||"{}");
        const usedArr  = JSON.parse(localStorage.getItem("usedCodes")||"[]");
        counters[st.pre] = Math.max(counters[st.pre] || 0, st.next);
        if (!usedArr.includes(st.code)) usedArr.push(st.code);
        localStorage.setItem("codeCounters", JSON.stringify(counters));
        localStorage.setItem("usedCodes", JSON.stringify(usedArr));
      } catch {}
    };
    const form = document.querySelector("form");
    form?.addEventListener("submit", onSubmit);

    return () => {
      dealGroup?.removeEventListener("click", onAny, true);
      btGroup?.removeEventListener("click", onAny, true);
      dealGroup?.removeEventListener("change", onAny, true);
      btGroup?.removeEventListener("change", onAny, true);
      scope.removeEventListener("keydown", onKeyDown, true);
      form?.removeEventListener("submit", onSubmit);
      mo.disconnect();
      (window as any).__auto_code_v9 = false;
    };
  }, []);

  return null;
}
