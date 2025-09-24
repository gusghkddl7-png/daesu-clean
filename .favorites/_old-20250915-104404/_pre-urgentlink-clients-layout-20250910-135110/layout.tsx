"use client";
import React from "react";
import UrgentFromClientsOnce from "../_shared/UrgentFromClientsOnce";
export default function ClientsLayout({ children }: { children: React.ReactNode }){
  return (<>{children}<UrgentFromClientsOnce /></>);
}