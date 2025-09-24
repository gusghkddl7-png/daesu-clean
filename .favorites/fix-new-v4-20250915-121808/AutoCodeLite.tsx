"use client";
import { useEffect } from "react";

/** 접두사 규칙(요청 반영) */
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

/** 포커스 가능한 요소 */
function focusables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("input,select,textarea,button,[tabindex]"))
    .filter(el => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.offsetParent !== null);
}

/** '코드번호' 라벨을 기준으로 입력칸 찾기 (라벨/placeholder/id/name 등 폭넓게) */
function findCodeInput(scope: ParentNode): HTMLInputElement | null {
  // 1) label for="id"
  const labels = Array.from(document.querySelectorAll("label"));
  for (const lab of labels) {
    const txt = (lab.textContent || "").trim();
    if (!/코드번호|코드/i.test(txt)) continue;
    const id = lab.getAttribute("for");
    if (id) {
      const byFor = document.getElementById(id) as HTMLInputElement | null;
      if (byFor) return byFor;
    }
    const nearby = lab.parentElement?.querySelector("input") as HTMLInputElement | null;
    if (nearby) return nearby;
  }
  // 2) 속성 기반
  const q = 'input[name*="code" i], input#code, input[placeholder*="코드"], input[aria-label*="코드"]';
  return scope.querySelector(q) as HTMLInputElement | null;
}

export default function AutoCodeLite(){
  useEffect(() => {
    // StrictMode/HMR 중복 방지
    if ((window as any).__auto_code_lite) return;
    (window as any).__auto_code_lite = true;

    const scope = (document.querySelector("form") as HTMLElement) || document.body;

    let selDeal = "";   // 월세/전세/매매
    let selBT   = "";   // 아파트/오피스텔/...

    const updateCode = () => {
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
        // 사용자가 직접 수정 중이 아니면 덮어씀
        if (codeInp.readOnly || codeInp.value.trim() === "" || /^([A-Z]{1,3})-\d{4}$/.test(codeInp.value)) {
          codeInp.value = code;
          codeInp.readOnly = true;
        }
      }
      (window as any).__ac_state = { pre, next, code };
    };

    // 클릭/체인지 이벤트(가벼운 위임)
    const buildingRe = /아파트|오피스텔|빌라|다세대|단독|다가구|상가|사무|재개발|재건축/;
    const dealRe     = /월세|전세|매매/;

    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement);
      if (!t) return;
      const btn = t.closest("button,[role='button'],[role='radio'],label,.chip,.badge") as HTMLElement | null;
      if (!btn) return;
      const txt = (btn.textContent || btn.getAttribute("data-value") || "").replace(/\s+/g,"").trim();
      if (dealRe.test(txt))    { selDeal = txt; updateCode(); }
      if (buildingRe.test(txt)){ selBT   = txt; updateCode(); }
    };
    const onChange = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLSelectElement | null;
      if (!el) return;
      const val = (el as HTMLInputElement).value || "";
      const lab = (el as HTMLInputElement).labels?.[0]?.textContent || "";
      const txt = (val || lab || "").replace(/\s+/g,"").trim();
      if (dealRe.test(txt))    { selDeal = txt; updateCode(); }
      if (buildingRe.test(txt)){ selBT   = txt; updateCode(); }
    };
    scope.addEventListener("click", onClick, true);
    scope.addEventListener("change", onChange, true);

    // 탭 순서 재정렬(자연 탭 사용, keydown 가로채지 않음)
    const normalizeTab = () => {
      const nodes = focusables(scope); nodes.forEach((el,i) => el.tabIndex = i + 1);
    };
    normalizeTab();
    const mo = new MutationObserver(() => normalizeTab());
    mo.observe(scope, { childList: true, subtree: true, attributes: true });

    // 제출 시 카운터/사용코드 커밋
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
      scope.removeEventListener("change", onChange, true);
      mo.disconnect();
      form?.removeEventListener("submit", onSubmit);
      (window as any).__auto_code_lite = false;
    };
  }, []);

  return null;
}
