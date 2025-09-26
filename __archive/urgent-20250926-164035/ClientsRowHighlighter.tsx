"use client";
import { useEffect } from "react";

export default function ClientsRowHighlighter() {
  useEffect(() => {
    const go = () => {
      const hash = (location.hash||"").replace(/^#/, "");
      if (!hash || !/^row-/.test(hash)) return;
      const el = document.getElementById(hash);
      if (!el) return;
      el.scrollIntoView({behavior:"smooth", block:"center"});
      el.classList.add("row-focus");
      setTimeout(()=>el.classList.remove("row-focus"), 2500);
    };
    go();
    window.addEventListener("hashchange", go);
    return ()=>window.removeEventListener("hashchange", go);
  }, []);
  return null;
}
