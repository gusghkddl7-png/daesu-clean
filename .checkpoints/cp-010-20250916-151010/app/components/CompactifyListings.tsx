"use client";
import { useEffect } from "react";

export default function CompactifyListings() {
  useEffect(() => {
    try {
      const table = document.querySelector("main table") as HTMLElement | null;
      if (!table) return;
      table.classList.add("table-compact");
    } catch {}
  }, []);
  return null;
}
