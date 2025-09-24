"use client";
import React, { useEffect, useState } from "react";

/** 이 페이지(경로)만의 저장 키 */
function keyForPath() {
  try { return "pageFontPx:" + (location.pathname.split("?")[0] || "/"); } catch { return "pageFontPx:/"; }
}
function applyPx(px: number) {
  const v = `${px}px`;
  const root = document.getElementById("page-font-root") as HTMLElement | null;
  if (root) { root.style.setProperty("--page-font-px", v); }
  else { document.body.style.setProperty("--page-font-px", v); }
}
export default function FontControlBR() {
  const [px, setPx] = useState<number>(() => {
    if (typeof window === "undefined") return 14;
    try { const n = Number(localStorage.getItem(keyForPath())); return Number.isFinite(n) ? n : 14; }
    catch { return 14; }
  });
  useEffect(() => {
    applyPx(px);
    try { localStorage.setItem(keyForPath(), String(px)); } catch {}
  }, [px]);

  return (
    <div id="page-font-ui" className="fixed bottom-4 right-4 z-[99999] flex items-center gap-2" style={{ pointerEvents: "auto" }}>
      <span className="text-xs text-gray-700 bg-white/90 px-2 py-1 rounded-md shadow">글자 크기</span>
      <button type="button" className="px-3 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95"
              onClick={() => setPx(v => Math.max(12, Math.min(22, v - 1)))}>A−</button>
      <button type="button" className="px-3 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95"
              onClick={() => setPx(v => Math.max(12, Math.min(22, v + 1)))}>A＋</button>
    </div>
  );
}
