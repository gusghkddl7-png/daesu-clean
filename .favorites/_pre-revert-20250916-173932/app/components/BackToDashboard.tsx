"use client";
import Link from "next/link";

export default function BackToDashboard({ className = "" }: { className?: string }) {
  return (
    <Link href="/dashboard"
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span>뒤로가기</span>
    </Link>
  );
}
