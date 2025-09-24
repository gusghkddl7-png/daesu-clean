"use client";
import { useEffect } from "react";

export default function GlobalCompactify() {
  useEffect(() => {
    const apply = () => {
      try {
        const tables = Array.from(document.querySelectorAll("table"));
        tables.forEach(t => t.classList.add("table-compact"));
      } catch {}
    };
    // 초기 1회 + 라우팅/동적 변경 감시
    apply();
    const mo = new MutationObserver(() => apply());
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("load", apply);
    return () => { mo.disconnect(); window.removeEventListener("load", apply); };
  }, []);
  return null;
}
