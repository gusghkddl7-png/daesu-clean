"use client";
import React from "react";
import Link from "next/link";
import UiScaleInline from "./UiScale";
export default function SimpleHeader({ title }: { title: string }) {
  return (
    <div className="relative flex items-center min-h-9 mb-3">
      <Link href="/dashboard" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>뒤로가기</span>
      </Link>
      <h1 className="absolute left-1/2 -translate-x-1/2 top-1 text-base font-semibold text-center">{title}</h1>
      <div className="ml-auto"><UiScaleInline /></div>
    </div>
  );
}
