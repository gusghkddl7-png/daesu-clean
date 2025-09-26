// app/urgent/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type UrgentItem = {
  id: string;
  name?: string;
  phone?: string;
  area?: string;
  need?: string;
  deadline: string; // yyyy-mm-dd
  memo?: string;

  // 고객/문의 테이블에 있는 컬럼도 받음
  date?: string;     // 날짜
  manager?: string;  // 담당
  price?: string;    // 가격
  rooms?: string;    // 방갯수
  channel?: string;  // 유입경로
};

function daysLeft(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export default function UrgentPage() {
  const [items, setItems] = useState<UrgentItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ❶ 15초 폴링으로 자동 갱신
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    async function load() {
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || "";
        const res = await fetch(`${base}/api/urgent`, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as UrgentItem[];
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
        setErr(null);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setErr("데이터를 불러오지 못했습니다.");
      }
    }

    load();
    const timer = setInterval(load, 15000);

    return () => {
      alive = false;
      ctrl.abort();
      clearInterval(timer);
    };
  }, []);

  const rows = useMemo(() => {
    const list = (items || []).map((x) => ({ ...x, d: daysLeft(x.deadline) }));
    return list.filter((x) => x.d >= 0).sort((a, b) => a.d - b.d);
  }, [items]);

  const rowBg = (d: number) =>
    d <= 10
      ? "bg-rose-50"
      : d <= 20
      ? "bg-amber-50"
      : d <= 30
      ? "bg-sky-50"
      : "";

  return (
    <main className="p-4">
      {/* 상단바 */}
      <div className="relative h-10 mb-4">
        <button
          type="button"
          onClick={() =>
            history.length > 1 ? history.back() : (location.href = "/listings")
          }
          className="absolute left-0 top-0 px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50"
        >
          ← 뒤로가기
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 top-0 text-xl font-bold">
          급한임차문의
        </h1>
      </div>

      {/* 에러 메시지(조용히) */}
      {err && (
        <div className="mb-3 text-sm text-red-600">
          {err} (개발자 콘솔 확인)
        </div>
      )}

      {/* 표 : D-일 + 고객/문의 컬럼 그대로 */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th style={{ width: "80px" }}>D-일</th>
              <th style={{ width: "110px" }}>날짜</th>
              <th style={{ width: "90px" }}>담당</th>
              <th style={{ width: "110px" }}>가격</th>
              <th style={{ width: "140px" }}>지역</th>
              <th>요구사항</th>
              <th style={{ width: "90px" }}>방갯수</th>
              <th style={{ width: "120px" }}>입주일</th>
              <th style={{ width: "120px" }}>유입경로</th>
              <th style={{ width: "150px" }}>연락처</th>
              <th style={{ width: "200px" }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => (
              <tr
                key={it.id}
                className={`${rowBg(it.d)} border-t [&>td]:px-3 [&>td]:py-2`}
              >
                <td>
                  <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/70 border">
                    {`D-${it.d}`}
                  </span>
                </td>
                <td className="text-gray-700">{it.date ?? "-"}</td>
                <td>{it.manager ?? "-"}</td>
                <td>{it.price ?? "-"}</td>
                <td>{it.area ?? "-"}</td>
                <td>{it.need ?? "-"}</td>
                <td>{it.rooms ?? "-"}</td>
                <td className="text-gray-700">{it.deadline}</td>
                <td>{it.channel ?? "-"}</td>
                <td>{it.phone ?? "-"}</td>
                <td className="text-gray-600">{it.memo ?? "-"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={11} className="text-center text-gray-500 py-6">
                  표시할 임차 문의가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
