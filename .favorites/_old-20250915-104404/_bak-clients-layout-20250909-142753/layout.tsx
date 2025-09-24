"use client";
import React, { useEffect, useState } from "react";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  const [fontPx, setFontPx] = useState<number>(() => {
    if (typeof window === "undefined") return 14;
    const v = Number(localStorage.getItem("clientsFontPx") || "14");
    return Number.isFinite(v) ? v : 14;
  });
  useEffect(() => { try { localStorage.setItem("clientsFontPx", String(fontPx)); } catch {} }, [fontPx]);

  // 페이지 어딘가에 남아있을 '콤팩트' UI 제거
  useEffect(() => {
    try {
      const nodes = Array.from(document.querySelectorAll("button, [role='button'], a, select"));
      nodes.forEach(el => {
        const t = (el as HTMLElement).innerText?.replace(/\s/g,"")?.toLowerCase() ?? "";
        if (t.includes("콤팩트") || t.includes("컴팩트") || t.includes("compact")) {
          (el as HTMLElement).style.display = "none";
        }
      });
    } catch {}
  }, []);

  return (
    <div style={{ fontSize: `${fontPx}px`, lineHeight: 1.35 }}>
      {/* 콘텐츠 */}
      <div className="px-4">{children}</div>

      {/* 우하단 글자 크기 컨트롤 (A-/A+만) */}
      <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1">
        <span className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded-md shadow">글자 크기</span>
        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-white shadow"
          onClick={() => setFontPx(v => Math.max(12, Math.min(20, v - 1)))}
          aria-label="글자 작게">A−</button>
        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-white shadow"
          onClick={() => setFontPx(v => Math.max(12, Math.min(20, v + 1)))}
          aria-label="글자 크게">A＋</button>
      </div>
    </div>
  );
}
