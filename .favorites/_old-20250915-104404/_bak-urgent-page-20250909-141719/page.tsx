"use client";

import React, { useMemo } from "react";

export default function UrgentPage() {
  // 데모용 아이템 (색상 규칙 확인용)
  const items = useMemo(() => {
    const daysFromNow = (n: number) => {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + n);
      return { d: n, iso: d.toISOString().slice(0,10) };
    };
    return [daysFromNow(30), daysFromNow(20), daysFromNow(10)];
  }, []);

  return (
    <main className="p-4">
      <div className="relative">
        <h1 className="text-2xl font-bold">급한 임차 문의</h1>
        {/* 우상단 레전드 */}
        <div className="absolute right-0 top-0 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-sky-50 border-sky-200">D≤30</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-orange-50 border-orange-200">D≤20</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-red-50 border-red-200">D≤10</span>
        </div>
      </div>

      {/* 데모 카드(색상 확인용) */}
      <div className="mt-4 flex flex-col gap-2">
        {items.map((it, idx) => {
          const color =
            it.d <= 10 ? "bg-red-50 border-red-200" :
            it.d <= 20 ? "bg-orange-50 border-orange-200" :
            it.d <= 30 ? "bg-sky-50 border-sky-200" :
                          "bg-white border-gray-200";
          return (
            <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${color}`}>
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/70 border">{`D-${it.d}`}</span>
              <span className="font-semibold">샘플 고객 {idx + 1}</span>
              <span className="ml-auto text-sm text-gray-600">{it.iso}</span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
