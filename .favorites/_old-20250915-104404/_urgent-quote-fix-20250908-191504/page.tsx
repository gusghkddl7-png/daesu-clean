"use client";

import React, { useEffect, useMemo, useState } from "react";
import MakeTablesCompact from "../components/MakeTablesCompact";

/** 날짜 파싱: ISO / "9월 5일" / "9월 초·중·하순(끝날짜 기준)" */
function parseKDeadline(row: any): Date | null {
  const y = new Date().getFullYear();
  if (row?.moveInDate && /^\d{4}-\d{1,2}-\d{1,2}$/.test(row.moveInDate)) return new Date(row.moveInDate);
  if (row?.deadline && /^\d{4}-\d{1,2}-\d{1,2}$/.test(row.deadline))     return new Date(row.deadline);
  if (row?.deadlineMonth) {
    const m = Number(row.deadlineMonth);
    if (row.deadlineDay) return new Date(y, m-1, Number(row.deadlineDay));
    if (row.deadlinePhase) {
      const end = row.deadlinePhase === "초순" ? 10 : row.deadlinePhase === "중순" ? 20 : 30;
      return new Date(y, m-1, end);
    }
  }
  if (row?.deadlineText) {
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

  // 상단 1줄(뒤로가기/제목/레전드/콤팩트) 숨김: UniformTopbar, 뒤로가기, 각종 h1 숨기기
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/inquiries", { cache: "no-store" });
        const js  = await res.json().catch(()=>({ rows: [] }));
        if (alive && Array.isArray(js.rows)) setRows(js.rows);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const mapped: Row[] = useMemo(() => {
    const list = rows.map((r, i) => {
      const due = parseKDeadline(r);
      const d = daysLeftFrom(due);
      const date = (r?.date || r?.createdAt || "").toString().slice(0,10);
      const moveIn = due ? due.toISOString().slice(0,10) : (r?.moveInDate || r?.deadlineText || r?.deadline || "-");
      return {
        _id: r?._id ?? r?.id ?? i,
        idx: i+1,
        date: date || "-",
        manager: r?.manager || r?.owner || r?.agent || "-",
        price: r?.price || r?.budget || r?.rent || r?.amount || "-",
        area: r?.area || r?.areas || r?.region || "-",
        req: r?.requirements || r?.req || r?.want || "-",
        rooms: r?.rooms || r?.roomTypes || r?.type || "-",
        moveIn,
        channel: r?.channel || r?.source || "-",
        phone: r?.phone || r?.contact || "-",
        note: r?.note || r?.memo || "",
        d,
      };
    })
    .filter(x => x.d === null || x.d >= 0)   // 지난 건 숨김
    .sort((a,b) => {                         // 급한(≤30) 먼저, d 오름차순
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

  return (
    <main id="urgent-root" className="min-h-screen p-2 >
      <div className="relative flex items-center min-h-9 mb-2">
        <a href="/dashboard" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>뒤로가기</span>
        </a>
        <h1 className="absolute left-1/2 -translate-x-1/2 top-1 text-base font-semibold text-center">급한 임차문의</h1>
      </div>
      {/* /urgent 전용: 상단 전역바 숨김 + 표 패딩 촘촘 */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            "#uniform-topbar{display:none!important}" +
            "#urgent-root .table-compact th,#urgent-root .table-compact td{padding-top:.20rem!important;padding-bottom:.20rem!important}"
        }}
      />
      <MakeTablesCompact />

      {loading ? null : (
        mapped.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">표시할 문의가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-compact table-compact min-w-full border border-gray-200 rounded-lg text-xs leading-tight">
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
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-1">
                {mapped.map((r, i) => {
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

