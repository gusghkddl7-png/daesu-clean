"use client";
import React, { useEffect, useState } from "react";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  const [fontPx, setFontPx] = useState<number>(() => {
    if (typeof window === "undefined") return 14;
    const v = Number(localStorage.getItem("clientsFontPx") || "14");
    return Number.isFinite(v) ? v : 14;
  });
  useEffect(() => { try { localStorage.setItem("clientsFontPx", String(fontPx)); } catch {} }, [fontPx]);

  // (선택) 남아있는 '콤팩트' UI 숨김
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
    <>
      {/* 전 페이지 폰트를 이 컨테이너의 크기로 강제 상속 */}
      <div id="clients-root" className="clients-font" style={{ ["--clients-font-px" as any]: `${fontPx}px` }}>
        <div className="px-4">{children}</div>
      </div>

      {/* 우하단 글자 크기 컨트롤 */}
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
    </>
  );
}

