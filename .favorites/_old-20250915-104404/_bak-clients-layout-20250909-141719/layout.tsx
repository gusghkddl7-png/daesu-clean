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
    <div style={{ fontSize: `${fontPx}px`, lineHeight: 1.35 }}>
      <div className="sticky top-0 z-10 flex justify-end items-center gap-1 p-2 bg-white/70 backdrop-blur">
        <span className="text-xs text-gray-500 mr-2">글자 크기</span>
        <button type="button" className="px-2 py-0.5 rounded-md border"
                onClick={() => setFontPx(v => Math.max(12, Math.min(20, v - 1)))}>A−</button>
        <button type="button" className="px-2 py-0.5 rounded-md border"
                onClick={() => setFontPx(v => Math.max(12, Math.min(20, v + 1)))}>A＋</button>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}
