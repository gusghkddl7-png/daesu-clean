"use client";
import React, { useEffect, useState } from "react";

export default function CodePreview() {
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    let alive = true;
    fetch("/api/code/next", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (alive) setCode(d?.code ?? ""); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!code) return null;
  return (
    <div className="text-xs text-gray-500 mb-2">
      코드번호: <span className="font-semibold">{code}</span>
    </div>
  );
}