"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ===== 접두사 규칙 =====
// 빌딩 카테고리 텍스트를 받아 규칙 적용
function prefixBy(deal: string, btLabel: string): string {
  // 공통 우선순위 (거래유형 무시)
  if (/아파트/.test(btLabel)) return "C";
  if (/재개발|재건축/.test(btLabel)) return "J";
  if (/상가|사무/.test(btLabel)) return "R";

  // 나머지 3종은 거래유형에 따라
  if (/월세/.test(deal)) return "BO";
  if (/전세/.test(deal)) return "BL";
  if (/매매/.test(deal)) return "BM";
  return "X"; // fallback
}

// ===== 유틸 =====
const all = <T extends Element>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];
const valOf = (el: HTMLInputElement | HTMLSelectElement | null) => (el?.value || "").trim();
const txts  = (sel: HTMLSelectElement) => Array.from(sel.options).map(o => (o.textContent || o.value || "").trim());
const ensureBadge = () => {
  let el = document.getElementById("autocode-badge");
  if (!el) {
    el = document.createElement("div");
    el.id = "autocode-badge";
    el.style.cssText = [
      "position:fixed","top:8px","left:50%","transform:translateX(-50%)",
      "z-index:9999","background:#111","color:#fff","padding:8px 12px",
      "border-radius:12px","font-size:14px","font-weight:700","box-shadow:0 2px 8px rgba(0,0,0,.2)"
    ].join(";");
    document.body.appendChild(el);
  }
  return el as HTMLDivElement;
};

// 로컬 저장소
function loadCounters(){ try{ return JSON.parse(localStorage.getItem("codeCounters")||"{}") as Record<string,number>; }catch{ return {}; } }
function loadUsed(){ try{ return new Set<string>(JSON.parse(localStorage.getItem("usedCodes")||"[]")); }catch{ return new Set<string>(); } }
function saveCounters(o: Record<string,number>){ localStorage.setItem("codeCounters", JSON.stringify(o)); }
function saveUsed(s: Set<string>){ localStorage.setItem("usedCodes", JSON.stringify(Array.from(s))); }

function recomputeCountersFromUsed() {
  // usedCodes를 스캔하여 각 접두사의 최대 번호를 counters에 반영
  const used = Array.from(loadUsed());
  const maxBy: Record<string, number> = {};
  used.forEach(code => {
    const m = code.match(/^([A-Z]{1,3})-(\d{1,})$/);
    if (!m) return;
    const pre = m[1], n = Number(m[2]);
    maxBy[pre] = Math.max(maxBy[pre] || 0, n);
  });
  const counters = loadCounters();
  Object.keys(maxBy).forEach(k => { counters[k] = Math.max(counters[k] || 0, maxBy[k]); });
  saveCounters(counters);
}

export default function CodeAgentGlobal(){
  const path = usePathname();

  useEffect(() => {
    if (!path?.startsWith("/listings/new")) return;

    // 1) 필드 자동 탐색
    const findDeal = (): HTMLSelectElement | null => {
      for (const s of all<HTMLSelectElement>("select")) {
        const o = txts(s).join("|");
        if (/월세|전세|매매/.test(o)) return s;
      }
      return (document.querySelector('select[name*="deal" i]') ||
              document.querySelector('select#dealType')) as HTMLSelectElement | null;
    };
    const findBt = (): HTMLSelectElement | null => {
      for (const s of all<HTMLSelectElement>("select")) {
        const o = txts(s).join("|");
        if (/아파트|오피스텔|빌라|다세대|단독|다가구|상가|사무|재개발|재건축/.test(o)) return s;
      }
      return (document.querySelector('select[name*="build" i]') ||
              document.querySelector('select#buildingType')) as HTMLSelectElement | null;
    };
    const findCodeInput = (): HTMLInputElement | null => {
      // name/id/placeholder에 code/코드 포함된 input을 우선
      const byAttr = document.querySelector('input[name*="code" i], input#code') as HTMLInputElement | null;
      if (byAttr) return byAttr;
      // 없으면 새 입력칸 만들지 않고 배지로만 표시
      return null;
    };

    let dealSel: HTMLSelectElement | null = null;
    let btSel:   HTMLSelectElement | null = null;
    let codeInp: HTMLInputElement | null  = null;
    const badge = ensureBadge();

    const show = (text: string) => { badge.textContent = `코드번호: ${text}`; badge.style.display = "block"; };
    const hide = () => { badge.style.display = "none"; };

    const computeAndFill = () => {
      if (!dealSel || !btSel) { hide(); return; }
      const deal = valOf(dealSel);
      const bt   = valOf(btSel);
      if (!deal || !bt) { hide(); return; }

      // 접두사 결정
      const pre = prefixBy(deal, bt);

      // 카운터 계산: usedCodes 기반 최대값을 counters에 동기화
      recomputeCountersFromUsed();
      const counters = loadCounters();
      const used = loadUsed();

      let next = (counters[pre] || 0) + 1;
      let code = `${pre}-${String(next).padStart(4,"0")}`;
      let guard = 0;
      while (used.has(code) && guard++ < 10000) {
        next++; code = `${pre}-${String(next).padStart(4,"0")}`;
      }

      // 표기 + 입력칸 반영
      show(code);
      if (codeInp) {
        codeInp.value = code;
        codeInp.readOnly = true;
      }
      // 폼 제출 시 커밋을 위해 window에 보관
      (window as any).__autoCode__ = { pre, next, code };
    };

    const bind = () => {
      dealSel = findDeal();
      btSel   = findBt();
      codeInp = findCodeInput();
      if (dealSel && btSel) {
        dealSel.addEventListener("change", computeAndFill);
        btSel.addEventListener("change", computeAndFill);
        computeAndFill();
        return true;
      }
      return false;
    };

    let bound = bind();
    const mo = new MutationObserver(() => { if (!bound) bound = bind(); });
    mo.observe(document.documentElement, { childList:true, subtree:true });

    // 제출시 카운터/사용코드 커밋
    const onSubmit = () => {
      const st = (window as any).__autoCode__;
      if (!st?.pre || !st?.next || !st?.code) return;
      const counters = loadCounters(); const used = loadUsed();
      counters[st.pre] = Math.max(counters[st.pre] || 0, st.next);
      used.add(st.code);
      saveCounters(counters); saveUsed(used);
    };
    const form = document.querySelector("form");
    form?.addEventListener("submit", onSubmit);

    return () => { mo.disconnect(); form?.removeEventListener("submit", onSubmit); };
  }, [path]);

  return null;
}
