"use client";
import React, { useEffect, useState } from "react";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  const [fontPx, setFontPx] = useState<number>(() => {
    if (typeof window === "undefined") return 14;
    const v = Number(localStorage.getItem("clientsFontPx") || "14");
    return Number.isFinite(v) ? v : 14;
  });
  useEffect(() => { try { localStorage.setItem("clientsFontPx", String(fontPx)); } catch {} }, [fontPx]);

  return (
    <>
      {/* 이 래퍼 안의 모든 글자는 폰트를 상속받게 되어 A-/A+가 확실히 적용됨 */}
      <div id="clients-root" className="clients-font" style={{ ["--clients-font-px" as any]: `${fontPx}px` }}>
        <div className="px-4">{children}</div>
      </div>

      {/* 우하단 컨트롤: 최우선 z-index + pointer-events 보장 */}
      <div
        id="clients-font-ui"
        className="fixed bottom-3 right-3 z-[99999] pointer-events-auto flex items-center gap-1"
        style={{ pointerEvents: "auto" }}
      >
        <span className="text-xs text-gray-700 bg-white/90 px-2 py-1 rounded-md shadow">글자 크기</span>
        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95 cursor-pointer"
          onClick={() => setFontPx(v => Math.max(12, Math.min(20, v - 1)))}
          aria-label="글자 작게"
        >
          A−
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95 cursor-pointer"
          onClick={() => setFontPx(v => Math.max(12, Math.min(20, v + 1)))}
          aria-label="글자 크게"
        >
          A＋
        </button>
      </div>
    </>
  );
}
