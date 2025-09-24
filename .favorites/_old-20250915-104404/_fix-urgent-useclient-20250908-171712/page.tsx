import MakeTablesCompact from "../components/MakeTablesCompact";
import SimpleHeader from "../components/SimpleHeader";
"use client";
import UiScaleInline from "../components/UiScale";
import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusLegend from "../components/StatusLegend";

/** 날짜 파싱: ISO / "9월 5일" / "9월 초·중·하순(끝날짜 기준)" */
function parseKDeadline(row: any): Date | null {
  const y = new Date().getFullYear();
  if (row.moveInDate && /^\d{4}-\d{1,2}-\d{1,2}$/.test(row.moveInDate)) return new Date(row.moveInDate);
  if (row.deadline && /^\d{4}-\d{1,2}-\d{1,2}$/.test(row.deadline))     return new Date(row.deadline);
  if (row.deadlineMonth) {
    const m = Number(row.deadlineMonth);
    if (row.deadlineDay) return new Date(y, m-1, Number(row.deadlineDay));
    if (row.deadlinePhase) {
      const end = row.deadlinePhase === "초순" ? 10 : row.deadlinePhase === "중순" ? 20 : 30;
      return new Date(y, m-1, end);
    }
  }
  if (row.deadlineText) {
    const t = String(row.deadlineText).trim();
    let m = t.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일$/);
    if (m) return new Date(y, +m[1]-1, +m[2]);
    m = t.match(/^(\d{1,2})\s*월\s*(초순|중순|하순)$/);
    if (m) {
      const end = m[2]==="초순"?10:m[2]==="중순"?20:30;
      return new Date(y, +m[1]-1, end);
    }
  }
  return null;
}
function daysLeftFrom(d: Date | null) {
  if (!d) return null;
  const due = new Date(d), now = new Date();
  due.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((due.getTime()-now.getTime())/86400000);
}

type Row = {
  _id?: any; idx?: number; date?: string; manager?: string; price?: string;
  area?: string; req?: string; rooms?: string; moveIn?: string;
  channel?: string; phone?: string; note?: string; d?: number|null;
};

export default function UrgentPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // ★ 기본 100/페이지

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

  // 고객문의 → 표 행 매핑 (스크린샷의 컬럼을 최대한 맞춤)
  const mapped: Row[] = useMemo(() => {
    const list = rows.map((r, i) => {
      const due = parseKDeadline(r);
      const d = daysLeftFrom(due);
      const date = (r.date || r.createdAt || "").toString().slice(0,10);
      const moveIn = due ? due.toISOString().slice(0,10) : (r.moveInDate || r.deadlineText || r.deadline || "-");
      return {
        _id: r._id ?? r.id ?? i,
        idx: i+1,
        date: date || "-",
        manager: r.manager || r.owner || r.agent || "-",
        price: r.price || r.budget || r.rent || r.amount || "-",
        area: r.area || r.areas || r.region || "-",
        req: r.requirements || r.req || r.want || "-",
        rooms: r.rooms || r.roomTypes || r.type || "-",
        moveIn,
        channel: r.channel || r.source || "-",
        phone: r.phone || r.contact || "-",
        note: r.note || r.memo || "",
        d,
      };
    })
    // 지난 건은 숨김
    .filter(x => x.d === null || x.d >= 0)
    // 급한(≤30일) 먼저, 그 다음 남은 일수 오름차순
    .sort((a,b) => {
      const au = a.d!==null && a.d<=30 ? 1 : 0;
      const bu = b.d!==null && b.d<=30 ? 1 : 0;
      if (au !== bu) return bu - au;
      if (a.d!==null && b.d!==null) return a.d - b.d;
      if (a.d===null && b.d!==null) return 1;
      if (a.d!==null && b.d===null) return -1;
      return 0;
    });
    return list;
  }, [rows]);

  // 페이지네이션
  const total = mapped.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (current-1)*pageSize;
    return mapped.slice(start, start+pageSize);
  }, [mapped, current, pageSize]);

  async function handleDelete(id: any) {
    if (!id) return;
    if (!confirm("이 문의를 삭제(방 구함)할까요?")) return;
    const res = await fetch("/api/inquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const js = await res.json();
    if (res.ok && js.ok) setRows(prev => prev.filter(x => String(x._id ?? x.id ?? x.name) !== String(id)));
    else alert("삭제 실패: " + (js?.error || res.statusText));
  }

  return (
    <main className="min-h-screen p-3">
      <SimpleHeader title="고객문의" />
      <MakeTablesCompact />

      <PageHeader title="급한 임차문의" right={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2"><StatusLegend /><UiScaleInline /></div>
          <div className="text-xs text-gray-500">
            표시 {slice.length} / 전체 {total} ·
            페이지 <span className="font-medium">{current}</span> / {totalPages}
          </div>
          <select
            className="text-xs border rounded px-1 py-0.5"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {[50,100,200,500].map(n => <option key={n} value={n}>{n}/페이지</option>)}
          </select>
          <div className="flex items-center gap-1">
            <button className="text-xs px-2 py-0.5 border rounded disabled:opacity-40"
              onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={current<=1}>이전</button>
            <button className="text-xs px-2 py-0.5 border rounded disabled:opacity-40"
              onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={current>=totalPages}>다음</button>
          </div>
        </div>
      } />

      {loading ? null : (
        total===0 ? (
          <div className="text-center text-gray-500">표시할 문의가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-compact min-w-full border border-gray-200 rounded-lg text-xs leading-tight">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="[&>th]:px-2 [&>th]:py-2 text-gray-700">
                  <th className="w-14 text-left">#</th>
                  <th className="w-24 text-left">날짜</th>
                  <th className="w-20 text-left">담당</th>
                  <th className="w-32 text-left">가격</th>
                  <th className="w-48 text-left">지역</th>
                  <th className="w-56 text-left">요구사항</th>
                  <th className="w-28 text-left">방갯수</th>
                  <th className="w-28 text-left">입주일</th>
                  <th className="w-24 text-left">유입경로</th>
                  <th className="w-28 text-left">연락처</th>
                  <th className="text-left">비고</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-1">
                {slice.map((r, i) => {
                  const sev =
                    r.d!==null && r.d<=10 ? "bg-red-50" :
                    r.d!==null && r.d<=20 ? "bg-orange-50" :
                    r.d!==null && r.d<=30 ? "bg-sky-50" : "";
                  const zebra = i%2===1 ? "bg-gray-50/40" : "";
                  return (
                    <tr key={r._id ?? r.idx} className={`${sev} ${zebra}`}>
                      <td>{r.idx}</td>
                      <td>{r.date}</td>
                      <td className="font-semibold">{r.manager}</td>
                      <td>{r.price}</td>
                      <td className="truncate max-w-[18rem]" title={r.area}>{r.area}</td>
                      <td className="truncate max-w-[22rem]" title={r.req}>{r.req}</td>
                      <td>{r.rooms}</td>
                      <td>{r.moveIn}</td>
                      <td>{r.channel}</td>
                      <td>{r.phone}</td>
                      <td className="truncate max-w-[24rem]" title={r.note}>{r.note || "-"}</td>
                      <td>
                        <button
                          className="text-[11px] px-2 py-0.5 rounded border border-red-300 bg-red-50 hover:bg-red-100"
                          onClick={()=>handleDelete(r._id ?? r.idx)}
                          title="방 구함(삭제)">삭제</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  );
}



