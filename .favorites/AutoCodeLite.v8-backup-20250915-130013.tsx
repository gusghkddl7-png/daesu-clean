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

/** 포커스 가능한 요소(보이는 것만) */
function focusables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("input,select,textarea,button,[tabindex]"))
    .filter(el => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.offsetParent !== null);
}

/** 텍스트 포함 여부 */
const hasText = (el: Element | null, re: RegExp) => !!el && re.test((el.textContent || "").replace(/\s+/g,""));

/** 라벨 텍스트로 그룹 컨테이너 찾기: <L>거래유형 *</L> / <L>건물유형 *</L> 다음의 버튼 묶음 div */
function findToggleGroup(labelRe: RegExp): HTMLElement | null {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>("div,section,fieldset"));
  for (const b of blocks) {
    const lab = b.querySelector(":scope > *:first-child");
    if (hasText(lab, labelRe)) {
      // 바로 다음 형제 중 버튼들이 들어있는 div를 찾음
      let sib = lab?.nextElementSibling as HTMLElement | null;
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

export default function AutoCodeLite(){
  useEffect(() => {
    if ((window as any).__auto_code_v8) return;
    (window as any).__auto_code_v8 = true;

    const scope = (document.querySelector("form") as HTMLElement) || document.body;

    // 토글 그룹 영역만 이벤트 위임(다른 입력 클릭 시 영향 X)
    const dealGroup = findToggleGroup(/거래유형/);
    const btGroup   = findToggleGroup(/건물유형/);

    let selDeal = ""; // 월세/전세/매매
    let selBT   = ""; // 아파트/오피스텔/...

    // 마지막 코드(리렌더로 사라져도 복구)
    let lastCode = "";
    let lastPre  = "";
    let lastNext = 0;

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
        // 값만 주입(포커스 이동 금지), readOnly 상태 유지
        const ro = codeInp.readOnly;
        reactSetValue(codeInp, code);
        codeInp.readOnly = ro;
        lastCode = code; lastPre = pre; lastNext = next;
      }
      (window as any).__ac_state = { pre, next, code };
    };

    const pickLabel = (node: HTMLElement): string | null => {
      // 버튼/칩의 가장 가까운 요소에서 텍스트만 추출
      const cand = node.closest("button, [role='button'], [role='radio'], .chip, .badge, span, div") as HTMLElement | null;
      if (!cand) return null;
      const txt = (cand.textContent || "").replace(/\s+/g,"").trim();
      return txt || null;
    };

    const onDealClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const txt = pickLabel(t);
      if (!txt) return;
      const hit = (DEALS as readonly string[]).find(d => d === txt);
      if (hit) { selDeal = hit; applyCode(); }
    };
    const onBTClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const txt = pickLabel(t);
      if (!txt) return;
      const hit = (BTS as readonly string[]).find(b => b === txt);
      if (hit) { selBT = hit; applyCode(); }
    };

    dealGroup?.addEventListener("click", onDealClick, true);
    btGroup?.addEventListener("click", onBTClick, true);

    // Tab 키: 우리가 직접 다음 포커스로 이동(중복입력/더블클릭 방지)
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

    // 코드 input이 리렌더로 교체/초기화되면 자동 복구
    const mo = new MutationObserver(() => {
      if (!lastCode) return;
      const inp = findCodeInput(scope);
      if (inp && inp.value !== lastCode) {
        const ro = inp.readOnly;
        reactSetValue(inp, lastCode);
        inp.readOnly = ro;
      }
    });
    mo.observe(scope, { childList: true, subtree: true });

    // 제출 시 카운터 커밋
    const onSubmit = () => {
      const st = (window as any).__ac_state || { pre: lastPre, next: lastNext, code: lastCode };
      if (!st?.pre || !st?.next || !st?.code) return;
      const counters = loadCounters(); const used = loadUsed();
      counters[st.pre] = Math.max(counters[st.pre] || 0, st.next);
      used.add(st.code);
      saveCounters(counters); saveUsed(used);
    };
    const form = document.querySelector("form");
    form?.addEventListener("submit", onSubmit);

    return () => {
      dealGroup?.removeEventListener("click", onDealClick, true);
      btGroup?.removeEventListener("click", onBTClick, true);
      scope.removeEventListener("keydown", onKeyDown, true);
      form?.removeEventListener("submit", onSubmit);
      mo.disconnect();
      (window as any).__auto_code_v8 = false;
    };
  }, []);

  return null;
}
