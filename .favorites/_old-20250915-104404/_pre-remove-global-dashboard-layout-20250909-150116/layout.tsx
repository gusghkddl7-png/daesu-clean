"use client";
import React from "react";
import SiteFontControls from "../_shared/SiteFontControls";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFontControls />
    </>
  );
}
