"use client";
import React from "react";
import UrgentMirrorV3 from "../_shared/UrgentMirrorV3";
export default function UrgentLayout({ children }: { children: React.ReactNode }) {
  return (<>{children}<UrgentMirrorV3 /></>);
}
