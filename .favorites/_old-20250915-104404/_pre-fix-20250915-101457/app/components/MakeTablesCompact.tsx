"use client";
import { useEffect } from "react";
function apply() {
  try {
    const tables = Array.from(document.querySelectorAll("table"));
    tables.forEach(t => t.classList.add("table-compact"));
  } catch {}
}
export default function MakeTablesCompact() {
  useEffect(() => {
    apply();
    const mo = new MutationObserver(()=>apply());
    mo.observe(document.documentElement, { childList: true, subtree: true });
    const iv = setInterval(()=>apply(), 800);
    setTimeout(()=>clearInterval(iv), 6000);
    return () => { mo.disconnect(); clearInterval(iv); };
  }, []);
  return null;
}
