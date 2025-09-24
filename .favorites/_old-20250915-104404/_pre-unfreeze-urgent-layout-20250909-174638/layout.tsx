"use client";
import React from "react";
import UrgentMirror from "../_shared/UrgentMirror";
export default function UrgentLayout({ children }: { children: React.ReactNode }) {
  return (<>{children}<UrgentMirror /></>);
}
