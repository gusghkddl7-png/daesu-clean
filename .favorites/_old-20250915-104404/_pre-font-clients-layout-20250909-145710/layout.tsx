"use client";
import React, { useEffect, useState } from "react";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  // 폰트 크기 상태 (로컬 저장)
  const [fontPx, setFontPx] = useState<number>(() => {
    if (typeof window === "undefined") return 14;
    const v = Number(localStorage.getItem("clientsFontPx") || "14");
    return Number.isFinite(v) ? v : 14;
  });
  useEffect(() => { try { localStorage.setItem("clientsFontPx", String(fontPx)); } catch {} }, [fontPx]);

  // 중복된 "글자 크기 / A- A+" UI 자동 숨김 (우리 컨트롤 제외)
  useEffect(() => {
    const hideDup = () => {
      try {
        const all = Array.from(document.querySelectorAll("body *")) as HTMLElement[];
        all.forEach((el) => {
          if (el.closest("#clients-font-ui")) return; // 우리 컨트롤
          const t = (el.innerText || "").replace(/\s/g, "");
          const isFontUI = t.includes("글자크기") || (t.includes("A-") && t.includes("A+"));
          if (isFontUI) el.style.display = "none";
        });
      } catch {}
    };
    hideDup();
    const mo = new MutationObserver(hideDup);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return (
    <>
      {/* 이 래퍼 안의 모든 글자는 폰트를 상속받아 A-/A+가 확실히 적용됨 */}
      <div id="clients-root" className="clients-font" style={{ ["--clients-font-px" as any]: `${fontPx}px` }}>
        <div className="px-4">{children}</div>
      </div>

      {/* 우하단 컨트롤: 텍스트 라벨 제거(겹침 방지), 최상단 z-index */}
      <div
        id="clients-font-ui"
        className="fixed bottom-3 right-3 z-[99999] pointer-events-auto flex items-center gap-2"
        style={{ pointerEvents: "auto" }}
      >
        <button
          type="button"
          className="px-3 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95 cursor-pointer"
          onClick={() => setFontPx(v => Math.max(12, Math.min(20, v - 1)))}
          aria-label="글자 작게"
          title="글자 작게"
        >
          A−
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded-md border bg-white shadow hover:bg-gray-50 active:scale-95 cursor-pointer"
          onClick={() => setFontPx(v => Math.max(12, Math.min(20, v + 1)))}
          aria-label="글자 크게"
          title="글자 크게"
        >
          A＋
        </button>
      </div>
    </>
  );
}
