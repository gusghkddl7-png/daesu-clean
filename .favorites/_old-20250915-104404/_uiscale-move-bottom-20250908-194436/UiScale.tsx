"use client";
import React, { useEffect, useState } from "react";
function applyUi(font: "s"|"m"|"l"|"xl", den: "compact"|"cozy"|"comfortable") {
  const el = document.documentElement;
  el.dataset.uifont = font; el.dataset.uidensity = den;
  try { localStorage.setItem("ui.font", font); localStorage.setItem("ui.density", den); } catch {}
}
export default function UiScaleInline({ className = "" }: { className?: string }) {
  const [font, setFont] = useState<"s"|"m"|"l"|"xl">("m");
  const [den, setDen] = useState<"compact"|"cozy"|"comfortable">("compact");
  useEffect(() => {
    const f = (localStorage.getItem("ui.font") as any) || "m";
    const d = (localStorage.getItem("ui.density") as any) || "compact";
    setFont(f); setDen(d); applyUi(f, d);
  }, []);
  const order: Array<"s"|"m"|"l"|"xl"> = ["s","m","l","xl"];
  const dec = () => { const i = Math.max(0, order.indexOf(font)-1); setFont(order[i]); applyUi(order[i], den); };
  const inc = () => { const i = Math.min(order.length-1, order.indexOf(font)+1); setFont(order[i]); applyUi(order[i], den); };
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button className="text-xs px-1.5 py-0.5 border rounded" title="작게" onClick={dec}>A-</button>
      <button className="text-xs px-1.5 py-0.5 border rounded" title="크게" onClick={inc}>A+</button>
      <select className="text-xs border rounded px-1 py-0.5" value={den}
        onChange={e => { const v = e.target.value as any; setDen(v); applyUi(font, v); }}>
        <option value="compact">콤팩트</option>
        <option value="cozy">보통</option>
        <option value="comfortable">넉넉</option>
      </select>
    </div>
  );
}
export function UiScaleFloating() {
  return (
    <UiScaleInline className="fixed right-3 top-3 z-50 shadow bg-white/85 backdrop-blur px-2 py-1 rounded border" />
  );
}
