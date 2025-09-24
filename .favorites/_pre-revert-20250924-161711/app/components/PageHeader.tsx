"use client";
import React from "react";
import BackToDashboard from "./BackToDashboard";

export default function PageHeader(
  { title, right }: { title: string; right?: React.ReactNode }
) {
  return (
    <div className="relative flex items-center min-h-9 mb-3">
      <BackToDashboard />
      <h1 className="absolute left-1/2 -translate-x-1/2 top-1 text-base font-semibold text-center">
        {title}
      </h1>
      <div className="ml-auto">{right}</div>
    </div>
  );
}
