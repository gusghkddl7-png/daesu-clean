"use client";
import { useEffect } from "react";
/** wheel/touch만 preventDefault. 키보드는 건드리지 않음 (Tab 안전) */
export default function NoScrollJank() {
  useEffect(() => {
    const prevent = (e: Event) => { e.preventDefault(); };
    window.addEventListener("wheel", prevent, { passive: false });
    window.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      window.removeEventListener("wheel", prevent as any);
      window.removeEventListener("touchmove", prevent as any);
    };
  }, []);
  return null;
}