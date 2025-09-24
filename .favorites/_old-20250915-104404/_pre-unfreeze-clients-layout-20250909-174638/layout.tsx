"use client";
import React from "react";
import UrgentSyncClients from "../_shared/UrgentSyncClients";
export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (<>{children}<UrgentSyncClients /></>);
}
