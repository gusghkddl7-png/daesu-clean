"use client";
import { useEffect } from "react";

export default function CompactEveryTable() {
  useEffect(() => {
    const addClass = () => {
      document.querySelectorAll("table").forEach((t) => {
        (t as HTMLElement).classList.add("table-compact");
      });
    };
    addClass();
    const mo = new MutationObserver(() => addClass());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return null;
}
