"use client";
import { useEffect, useState } from "react";

type Den = "compact" | "cozy" | "comfortable";

function applyDensity(den: Den) {
  const el = document.documentElement;
  el.dataset.uidensity = den;
  try { localStorage.setItem("ui.density", den); } catch {}
}

export default function DensityNearRegister() {
  const [den, setDen] = useState<Den>("compact");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" ? (localStorage.getItem("ui.density") as Den) : null) || "compact";
    setDen(saved);
    applyDensity(saved);
  }, []);

  useEffect(() => { applyDensity(den); }, [den]);

  return (
    <div
      id="density-select-float"
      style={{
        position: "fixed",
        right: "12px",
        bottom: "12px",
        zIndex: 50,
        background: "rgba(255,255,255,.9)",
        backdropFilter: "saturate(180%) blur(6px)",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "6px 8px",
      }}
    >
      <select
        value={den}
        onChange={(e) => setDen(e.target.value as Den)}
        style={{
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          padding: "2px 6px",
        }}
      >
        <option value="compact">콤팩트</option>
        <option value="cozy">보통</option>
        <option value="comfortable">넉넉</option>
      </select>
    </div>
  );
}
