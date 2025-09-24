"use client";
import AutoCodeNew from "./AutoCodeNew";
import FormUXFix from "./FormUXFix";

export default function ListingsNewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FormUXFix />
      <AutoCodeNew />
    </>
  );
}
