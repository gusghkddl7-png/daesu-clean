import ClientsUrgentOnlyGlobal from "../_shared/ClientsUrgentOnlyGlobal";
"use client";
import React from "react";
import ClientsTableBridge from "../_shared/ClientsTableBridge";
export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (<>{children}<ClientsTableBridge /></>);
}

<ClientsUrgentOnlyGlobal />
