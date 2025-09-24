"use client";
import { useEffect } from "react";

// 접두사 규칙(요청 반영)
function prefixBy(deal: string, bt: string): string {
  if (/아파트/.test(bt)) return "C";
  if (/재개발|재건축/.test(bt)) return "J";
  if (/상가|사무/.test(bt)) return "R";
  if (/월세/.test(deal)) return "BO";
  if (/전세/.test(deal)) return "BL";
  if (/매매/.test(deal)) return "BM";
  return "X";
}

// localStorage helpers
const loadCounters = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem("codeCounters")||"{}"); } catch { return {}; } };
const loadUsed = (): Set<string> => { try { return new Set<string>(JSON.parse(localStorage.getItem("usedCodes")||"[]")); } catch { return new Set(); } };
const saveCounters = (o: Record<string, number>) => localStorage.setItem("codeCounters", JSON.stringify(o));
const saveUsed = (s: Set<string>) => localStorage.setItem("usedCodes", JSON.stringify(Array.from(s)));

function ensureBadge(): HTMLDivElement {
  let el = document.getElementById("autocode-badge") as HTMLDivElement | null;
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
  return el!;
}

export default function AutoCodeNew(){
  useEffect(() => {
    if ((window as any).__autoCodeNewMounted) return;
    (window as any).__autoCodeNewMounted = true;

    const form = (document.querySelector("form") as HTMLFormElement | null) || document.body;
    const badge = ensureBadge();

    const findDeal = (): HTMLSelectElement | null => {
      const all = Array.from(form.querySelectorAll("select"));
      for (const s of all) {
        const txt = Array.from(s.options).map(o => (o.textContent||o.value||"").trim()).join("|");
        if (/월세|전세|매매/.test(txt)) return s as HTMLSelectElement;
      }
      return form.querySelector('select[name*="deal" i], select#dealType') as HTMLSelectElement | null;
    };
    const findBt = (): HTMLSelectElement | null => {
      const all = Array.from(form.querySelectorAll("select"));
      for (const s of all) {
        const txt = Array.from(s.options).map(o => (o.textContent||o.value||"").trim()).join("|");
        if (/아파트|오피스텔|빌라|다세대|단독|다가구|상가|사무|재개발|재건축/.test(txt)) return s as HTMLSelectElement;
      }
      return form.querySelector('select[name*="build" i], select#buildingType') as HTMLSelectElement | null;
    };
    const findCodeInput = (): HTMLInputElement | null => {
      return form.querySelector('input[name*="code" i], input#code') as HTMLInputElement | null;
    };

    let dealSel: HTMLSelectElement | null = null;
    let btSel: HTMLSelectElement | null = null;
    let codeInp: HTMLInputElement | null = null;

    const show = (t: string) => { badge.textContent = `코드번호: ${t}`; badge.style.display = "block"; };
    const hide = () => { badge.style.display = "none"; };

    const computeAndFill = () => {
      if (!dealSel || !btSel) { hide(); return; }
      const deal = (dealSel.value||"").trim();
      const bt   = (btSel.value||"").trim();
      if (!deal || !bt) { hide(); return; }

      const pre = prefixBy(deal, bt);
      const counters = loadCounters();
      const used = loadUsed();

      let next = (counters[pre] || 0) + 1;
      let code = `${pre}-${String(next).padStart(4,"0")}`;
      let guard = 0;
      while (used.has(code) && guard++ < 10000) { next++; code = `${pre}-${String(next).padStart(4,"0")}`; }

      show(code);
      if (codeInp) { codeInp.value = code; codeInp.readOnly = true; }
      (window as any).__autoCodeState = { pre, next, code };
    };

    // 바인딩(중복 방지, 즉시 반응)
    const bind = () => {
      dealSel = findDeal();
      btSel   = findBt();
      codeInp = findCodeInput();
      if (dealSel && !(dealSel as any).__bindAC) { dealSel.addEventListener("change", computeAndFill); (dealSel as any).__bindAC = true; }
      if (btSel   && !(btSel   as any).__bindAC) { btSel.addEventListener("change", computeAndFill);   (btSel   as any).__bindAC = true; }
      computeAndFill();
    };
    bind();

    // 제출시 카운터/사용코드 커밋(원하면 유지)
    const onSubmit = () => {
      const st = (window as any).__autoCodeState;
      if (!st?.pre || !st?.next || !st?.code) return;
      const counters = loadCounters(); const used = loadUsed();
      counters[st.pre] = Math.max(counters[st.pre] || 0, st.next);
      used.add(st.code);
      saveCounters(counters); saveUsed(used);
    };
    const f = document.querySelector("form");
    f?.addEventListener("submit", onSubmit);

    return () => { f?.removeEventListener("submit", onSubmit); (window as any).__autoCodeNewMounted = false; };
  }, []);

  return null;
}
