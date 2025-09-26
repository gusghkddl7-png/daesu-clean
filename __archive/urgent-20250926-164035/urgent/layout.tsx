"use client";
import React from "react";

// ⛔ UrgentMirrorV3 제거 (import도 지움)

export default function UrgentLayout({ children }: { children: React.ReactNode }) {
  // 읽기 전용 페이지이므로 children만 렌더
  return <>{children}</>;
}
