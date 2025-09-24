"use client";
import React from "react";
import UrgentMirrorExact from "../_shared/UrgentMirrorExact";
export default function UrgentLayout({ children }: { children: React.ReactNode }){
  return (<>{children}<UrgentMirrorExact /></>);
}