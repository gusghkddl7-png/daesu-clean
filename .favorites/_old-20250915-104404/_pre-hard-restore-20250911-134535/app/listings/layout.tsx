import React from "react";
import ToolbarStyleFix from "./_assist/ToolbarStyleFix";
import ExtraFilterBar from "./_assist/ExtraFilterBar";
export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="w-full py-4">
        <h1 className="text-center text-2xl font-semibold">매물관리</h1>
      </header>
      <ToolbarStyleFix />
      <ExtraFilterBar />
<main className="flex-1">{children}</main>
    </div>
  );
}




