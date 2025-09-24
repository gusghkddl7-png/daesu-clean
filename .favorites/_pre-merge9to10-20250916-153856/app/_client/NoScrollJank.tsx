"use client";
import { useEffect } from "react";

/**
 * Scroll-jank만 막는다: wheel/touchmove만 preventDefault.
 * 키보드(특히 Tab)는 절대 가로채지 않음.
 */
export default function NoScrollJank() {
  useEffect(() => {
    const prevent = (e: Event) => { e.preventDefault(); };

    // passive:false 여야 preventDefault가 동작함
    window.addEventListener("wheel", prevent, { passive: false });
    window.addEventListener("touchmove", prevent, { passive: false });

    return () => {
      window.removeEventListener("wheel", prevent as any);
      window.removeEventListener("touchmove", prevent as any);
    };
  }, []);
  return null;
}