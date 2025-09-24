"use client";
import { useEffect, useState } from "react";

function getUserKey() {
  try {
    const c = document.cookie || "";
    const m = c.match(/(?:user(email|id)|email|uid|userid)=([^;]+)/i);
    return m ? decodeURIComponent(m[2] || m[1] || "") : "global";
  } catch { return "global"; }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [px, setPx] = useState<number>(() => {
    if (typeof window === "undefined") return 14;
    try {
      const key = getUserKey();
      const raw = localStorage.getItem(`siteFontPx:${key}`) ?? localStorage.getItem("siteFontPx");
      const n = Number(raw);
      return Number.isFinite(n) ? n : 14;
    } catch { return 14; }
  });

  useEffect(() => {
    const v = `${px}px`;
    document.documentElement.style.setProperty("--site-font-px", v);
    const key = getUserKey();
    try { localStorage.setItem(`siteFontPx:${key}`, String(px)); } catch {}
  }, [px]);

  return (
    <>
      {children}
      <div id="site-font-ui" className="fixed bottom-4 right-4 z-[99999] flex gap-2" style={{ pointerEvents: "auto" }}>
        <button type="button" className="px-3 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95"
                onClick={() => setPx(v => Math.max(12, Math.min(22, v - 1)))}>A−</button>
        <button type="button" className="px-3 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95"
                onClick={() => setPx(v => Math.max(12, Math.min(22, v + 1)))}>A＋</button>
      </div>
    </>
  );
}
