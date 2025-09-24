"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusLegend from "../components/StatusLegend";

function parseKDeadline(row: any): Date | null {
  const today = new Date(); const y = today.getFullYear();
  if (row.deadline && /^\d{4}-\d{1,2}-\d{1,2}$/.test(row.deadline)) {
    const d = new Date(row.deadline); if (!isNaN(d as any)) return d;
  }
  if (row.deadlineMonth) {
    const m = Number(row.deadlineMonth);
    if (row.deadlineDay) return new Date(y, m - 1, Number(row.deadlineDay));
    if (row.deadlinePhase) {
      const endDay = row.deadlinePhase === "초순" ? 10 : row.deadlinePhase === "중순" ? 20 : 30;
      return new Date(y, m - 1, endDay);
    }
  }
  if (row.deadlineText) {
    const t: string = String(row.deadlineText).trim();
    let m = t.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일$/);
    if (m) return new Date(y, parseInt(m[1]) - 1, parseInt(m[2]));
    m = t.match(/^(\d{1,2})\s*월\s*(초순|중순|하순)$/);
    if (m) {
      const endDay = m[2] === "초순" ? 10 : m[2] === "중순" ? 20 : 30;
      return new Date(y, parseInt(m[1]) - 1, endDay);
    }
  }
  return null;
}
function daysLeftFrom(d: Date | null) {
  if (!d) return null;
  const due = new Date(d); const now = new Date();
  due.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

export default function UrgentPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/inquiries", { cache: "no-store" });
        const js  = await res.json();
        if (alive && Array.isArray(js.rows)) setRows(js.rows);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => rows
    .map(r => {
      const deadlineDate = parseKDeadline(r);
      const d = daysLeftFrom(deadlineDate);
      return { ...r, d, deadlineDate };
    })
    .filter(x => x.d === null || x.d >= 0) // 지난 건 숨김
    .sort((a,b) => {
      const au = a.d !== null && a.d <= 30 ? 1 : 0;
      const bu = b.d !== null && b.d <= 30 ? 1 : 0;
      if (au !== bu) return bu - au;               // 급한 항목 위로
      if (a.d !== null && b.d !== null) return a.d - b.d;
      if (a.d === null && b.d !== null) return 1;
      if (a.d !== null && b.d === null) return -1;
      return 0;
    })
  , [rows]);

  async function handleDelete(id: any) {
    if (!id) return;
    if (!confirm("해당 문의를 삭제(방 구함)할까요?")) return;
    const res = await fetch("/api/inquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const js = await res.json();
    if (res.ok && js.ok) {
      setRows(prev => prev.filter(x => String(x._id ?? x.id ?? x.name) !== String(id)));
    } else {
      alert("삭제 실패: " + (js?.error || res.statusText));
    }
  }

  return (
    <main className="min-h-screen p-4">
      <PageHeader title="급한 임차문의" right={<StatusLegend />} />

      {loading ? null : (
        items.length === 0 ? (
          <div className="text-center text-gray-500">표시할 문의가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((it: any) => {
              const color =
                it.d !== null && it.d <= 10 ? "bg-red-50 border-red-200" :
                it.d !== null && it.d <= 20 ? "bg-orange-50 border-orange-200" :
                it.d !== null && it.d <= 30 ? "bg-sky-50 border-sky-200" :
                                              "bg-white border-gray-200";
              const dLabel = it.d === null ? "기한없음" : `D-${it.d}`;
              const deadlineText = it.deadlineDate
                ? it.deadlineDate.toISOString().slice(0,10)
                : (it.deadlineText || it.deadline || "-");

              return (
                <div key={it._id ?? (it.name ?? Math.random())}
                     className={`rounded-xl border ${color} p-4 flex flex-col gap-2`}>
                  <div className="flex items-center">
                    <div className="font-semibold text-base">{it.title ?? it.name ?? "고객 문의"}</div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="text-sm">{dLabel}</div>
                      <button
                        className="text-xs px-2 py-1 rounded-md border border-red-300 bg-red-50 hover:bg-red-100"
                        onClick={() => handleDelete(it._id ?? it.id ?? it.name)}
                        title="방 구함(삭제)">
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* 고객문의 리스트에서 보이는 필드를 그대로 최대한 노출 */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
                    {it.manager && <span>{it.manager}</span>}
                    {it.channel && <span className="px-1.5 py-0.5 rounded-md border bg-white/70">[{it.channel}]</span>}
                    {it.name && <span>고객: {it.name}</span>}
                    {it.phone && <span>{it.phone}</span>}
                    {it.area && <span>{it.area}</span>}
                    {it.type && <span>{it.type}</span>}
                    {it.budget && <span>{it.budget}</span>}
                    {it.note && <span className="text-gray-600">{it.note}</span>}
                    <span className="ml-auto text-gray-600">{deadlineText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </main>
  );
}
