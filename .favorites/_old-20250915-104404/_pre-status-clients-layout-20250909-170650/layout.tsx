"use client";
import React from "react";
import UrgentSyncClients from "../_shared/UrgentSyncClients";
import ClientsRowHighlighter from "../_shared/ClientsRowHighlighter";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <UrgentSyncClients />
      <ClientsRowHighlighter />
    </>
  );
}
