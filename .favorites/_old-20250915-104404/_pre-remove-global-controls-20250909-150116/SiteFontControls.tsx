"use client";
import React, { useEffect, useState } from "react";

/** 계정키 추출: cookie에서 email/user/uid/userid 중 하나 */
function getUserKey() {
  try {
    const c = document.cookie || "";
    const m = c.match(/(?:user(email|id)|email|uid|userid)=([^;]+)/i);
    return m ? decodeURIComponent((m[2] as string) || (m[1] as string) || "") : "global";
  } catch { return "global"; }
}

function applyPx(px: number) {
  const v = `${px}px`;
  document.documentElement.style.setProperty("--site-font-px", v);
  const root = document.getElementById("site-font-root") as HTMLElement | null;
  if (root) root.style.setProperty("--site-font-px", v);
}

export default function SiteFontControls() {
  const [px, setPx] = useState<number>(() => {
    if (typeof window === "undefined") return 14;
    try {
      // 먼저 현재 CSS 변수 읽기 → 없으면 저장값 → 14
      const cs = getComputedStyle(document.documentElement).getPropertyValue("--site-font-px");
      const fromVar = parseInt(cs);
      if (Number.isFinite(fromVar) && fromVar > 0) return fromVar;
      const key = getUserKey();
      const raw = localStorage.getItem(`siteFontPx:${key}`) ?? localStorage.getItem("siteFontPx");
      const n = Number(raw);
      return Number.isFinite(n) ? n : 14;
    } catch { return 14; }
  });

  useEffect(() => {
    applyPx(px);
    try {
      const key = getUserKey();
      localStorage.setItem(`siteFontPx:${key}`, String(px));
    } catch {}
  }, [px]);

  return (
    <div
      id="site-font-ui"
      className="fixed bottom-4 right-4 z-[99999] flex items-center gap-2"
      style={{ pointerEvents: "auto" }}
    >
      {/* 물건관리와 동일 톤: 작은 라벨 + 버튼 두 개 */}
      <span className="text-xs text-gray-700 bg-white/90 px-2 py-1 rounded-md shadow">글자 크기</span>
      <button
        type="button"
        className="px-3 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95"
        onClick={() => setPx(v => Math.max(12, Math.min(22, v - 1)))}
        title="글자 작게"
        aria-label="글자 작게"
      >
        A−
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95"
        onClick={() => setPx(v => Math.max(12, Math.min(22, v + 1)))}
        title="글자 크게"
        aria-label="글자 크게"
      >
        A＋
      </button>
    </div>
  );
}
