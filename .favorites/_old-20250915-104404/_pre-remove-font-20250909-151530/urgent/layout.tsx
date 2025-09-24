"use client";
import React from "react";
import FontControlBR from "../_shared/FontControlBR";

export default function UrgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div id="page-font-root" className="page-font">{children}</div>
      <FontControlBR />
    </>
  );
}
