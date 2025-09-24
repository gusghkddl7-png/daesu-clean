"use client";
import React from "react";
import UrgentMirrorLite from "../_shared/UrgentMirrorLite";
export default function UrgentLayout({ children }: { children: React.ReactNode }) {
  return (<>{children}<UrgentMirrorLite /></>);
}
