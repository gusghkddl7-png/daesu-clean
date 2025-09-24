"use client";
import { useEffect } from "react";

function applyDensity(den: "compact"|"cozy"|"comfortable") {
  const el = document.documentElement;
  el.dataset.uidensity = den;
  try { localStorage.setItem("ui.density", den); } catch {}
}

export default function DensityNearRegister() {
  useEffect(() => {
    try {
      // 우리 예전에 만든 상단 오버레이/레전드가 있으면 숨김
      const topbar = document.getElementById("uniform-topbar");
      if (topbar) (topbar as HTMLElement).style.display = "none";
      // 텍스트로 표시된 10/20/30일 레전드도 감춤(있을 때만)
      Array.from(document.querySelectorAll("span,div")).forEach(el => {
        const t = (el.textContent || "").replace(/\s+/g,"");
        if (/10일이내.*20일이내.*30일이내/.test(t)) (el as HTMLElement).style.display = "none";
      });

      // 등록/추가 버튼을 찾는다 (button, a)
      const regBtn = Array.from(document.querySelectorAll("button, a"))
        .find(el => /등록|추가/.test((el.textContent||"").replace(/\s+/g,""))) as HTMLElement|undefined;
      if (!regBtn) return;

      // 중복 방지
      if (document.getElementById("density-select-host")) return;

      const host = document.createElement("span");
      host.id = "density-select-host";
      host.style.marginRight = "8px";

      const sel = document.createElement("select");
      sel.style.fontSize = "12px";
      sel.style.border = "1px solid #e5e7eb";
      sel.style.borderRadius = "6px";
      sel.style.padding = "2px 6px";

      const opts: Array<{v:"compact"|"cozy"|"comfortable", t:string}> = [
        {v:"compact",      t:"콤팩트"},
        {v:"cozy",         t:"보통"},
        {v:"comfortable",  t:"넉넉"},
      ];
      opts.forEach(o => { const op = document.createElement("option"); op.value = o.v; op.textContent = o.t; sel.appendChild(op); });

      const saved = (typeof localStorage!=="undefined" ? localStorage.getItem("ui.density") : null) as any;
      sel.value = saved || "compact";
      applyDensity(sel.value as any);
      sel.addEventListener("change", () => applyDensity(sel.value as any));

      host.appendChild(sel);
      // 등록/추가 버튼 "왼쪽"에 삽입
      regBtn.parentElement?.insertBefore(host, regBtn);
    } catch {}
  }, []);

  return null;
}
