"use client";
import React from "react";
import SiteFontControls from "../_shared/SiteFontControls";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFontControls />
    </>
  );
}
