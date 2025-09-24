"use client";
import React, { useEffect } from "react";

export default function UniformTopbar() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isUrgent = location.pathname.toLowerCase().startsWith("/urgent");
      // /urgent면 기존 바가 있으면 지우고, 새로 만들지 않음
      const exist = document.getElementById("uniform-topbar");
      if (isUrgent) { if (exist) exist.remove(); return; }
    }
    if (typeof document === "undefined") return;
    if (document.getElementById("uniform-topbar")) return;

    const host = document.createElement("div");
    host.id = "uniform-topbar";
    host.style.position = "fixed";
    host.style.top = "10px";
    host.style.right = "12px";
    host.style.zIndex = "50";
    host.style.background = "rgba(255,255,255,.9)";
    host.style.backdropFilter = "saturate(180%) blur(6px)";
    host.style.border = "1px solid #e5e7eb";
    host.style.borderRadius = "8px";
    host.style.padding = "6px 8px";
    host.style.display = "flex";
    host.style.alignItems = "center";
    host.style.gap = "10px";

    host.innerHTML = `
      <span style="font-size:12px;display:inline-flex;align-items:center;gap:6px">
        <span style="display:inline-flex;align-items:center;gap:4px"><i style="width:8px;height:8px;background:#fee2e2;border-radius:9999px;display:inline-block"></i>10일 이내</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><i style="width:8px;height:8px;background:#ffedd5;border-radius:9999px;display:inline-block"></i>20일 이내</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><i style="width:8px;height:8px;background:#e0f2fe;border-radius:9999px;display:inline-block"></i>30일 이내</span>
      </span>
      <button id="ui-dec" style="font-size:12px;border:1px solid #e5e7eb;border-radius:6px;padding:2px 6px">A-</button>
      <button id="ui-inc" style="font-size:12px;border:1px solid #e5e7eb;border-radius:6px;padding:2px 6px">A+</button>
      <select id="ui-den" style="font-size:12px;border:1px solid #e5e7eb;border-radius:6px;padding:2px 6px">
        <option value="compact">콤팩트</option>
        <option value="cozy">보통</option>
        <option value="comfortable">넉넉</option>
      </select>
    `;
    document.body.appendChild(host);

    const order = ["s","m","l","xl"] as const;
    const apply = (font?: "s"|"m"|"l"|"xl", den?: "compact"|"cozy"|"comfortable") => {
      const el = document.documentElement as HTMLElement & { dataset: any };
      if (font) el.dataset.uifont = font;
      if (den)  el.dataset.uidensity = den;
      try { if (font) localStorage.setItem("ui.font", font); if (den) localStorage.setItem("ui.density", den); } catch {}
    };

    let font = (localStorage.getItem("ui.font") || "m") as "s"|"m"|"l"|"xl";
    let den  = (localStorage.getItem("ui.density") || "compact") as "compact"|"cozy"|"comfortable";
    apply(font, den);

    const sel = document.getElementById("ui-den") as HTMLSelectElement | null;
    if (sel) sel.value = den;

    document.getElementById("ui-dec")?.addEventListener("click", () => {
      const i = Math.max(0, order.indexOf(font) - 1); font = order[i]; apply(font, den);
    });
    document.getElementById("ui-inc")?.addEventListener("click", () => {
      const i = Math.min(order.length - 1, order.indexOf(font) + 1); font = order[i]; apply(font, den);
    });
    sel?.addEventListener("change", (e:any) => { den = e.target.value; apply(font, den); });
  }, []);

  return null;
}

