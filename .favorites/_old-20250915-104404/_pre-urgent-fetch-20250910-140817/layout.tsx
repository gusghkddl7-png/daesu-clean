"use client";
import React from "react";
import UrgentMirrorFetch from "../_shared/UrgentMirrorFetch";

export default function UrgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <UrgentMirrorFetch />
    </>
  );
}
