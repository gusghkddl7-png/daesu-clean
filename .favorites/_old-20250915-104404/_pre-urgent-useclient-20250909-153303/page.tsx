import UrgentMirror from "../_shared/UrgentMirror";
"use client";
import React, { useMemo } from "react";

type UrgentItem = {
  id: string;
  name: string;
  phone?: string;
  area?: string;
  need?: string;
  deadline: string; // ISO yyyy-mm-dd
  memo?: string;
};

function daysLeft(iso: string) {
  const d = new Date(iso); const now = new Date();
  d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export default function UrgentPage() {
  // 데모 데이터 (원하시면 실제 소스 연결해 드릴 수 있어요)
  const data: UrgentItem[] = useMemo(() => [
    { id: "U-001", name: "홍길동", phone: "010-1234-5678", area: "천호/길동", need: "원룸, 반려견 O", deadline: new Date(Date.now()+29*86400000).toISOString().slice(0,10), memo: "-" },
    { id: "U-002", name: "김영희", phone: "010-2222-3333", area: "성내",       need: "투룸, 엘베 필수", deadline: new Date(Date.now()+19*86400000).toISOString().slice(0,10) },
    { id: "U-003", name: "박철수", phone: "010-4444-5555", area: "둔촌",       need: "오피스텔, 역세권", deadline: new Date(Date.now()+9*86400000 ).toISOString().slice(0,10) },
  ], []);
  const items = data.map(x => ({ ...x, d: daysLeft(x.deadline) }))
                    .filter(x => x.d >= 0)
                    .sort((a,b) => a.d - b.d);

  const rowColor = (d: number) =>
    d <= 10 ? "bg-red-50" : d <= 20 ? "bg-orange-50" : d <= 30 ? "bg-sky-50" : "";

  return (
    <main className="p-4 relative">
      {/* 상단 바: 좌=뒤로가기, 중앙=제목, 우=레전드(한글) */}
      <div className="relative h-10 mb-4">
        <button
          type="button"
          onClick={() => (history.length > 1 ? history.back() : (location.href = "/listings"))}
          className="absolute left-0 top-0 px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50"
        >← 뒤로가기</button>

        <h1 className="absolute left-1/2 -translate-x-1/2 top-0 text-xl font-bold">급한임차문의</h1>

        <div className="absolute right-0 top-0 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-red-50 border-red-200">10일전</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-orange-50 border-orange-200">20일전</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-sky-50 border-sky-200">30일전</span>
        </div>
      </div>

      {/* 리스트: 매물관리/고객문의 톤과 유사한 테이블 */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm table-remark-last">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th style={{width: "90px"}}>D-일</th>
              <th style={{width: "110px"}}>기한</th>
              <th style={{width: "120px"}}>이름</th>
              <th style={{width: "160px"}}>연락처</th>
              <th style={{width: "220px"}}>지역</th>
              <th>요구사항</th>
              <th style={{width: "220px"}}>비고</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className={`${rowColor(it.d)} border-t [&>td]:px-3 [&>td]:py-2 align-middle`}>
                <td><span className="text-xs font-medium px-2 py-1 rounded-md bg-white/70 border">{`D-${it.d}`}</span></td>
                <td className="text-gray-700">{it.deadline}</td>
                <td className="font-semibold">{it.name}</td>
                <td>{it.phone ?? "-"}</td>
                <td>{it.area ?? "-"}</td>
                <td>{it.need ?? "-"}</td>
                <td className="text-gray-600"><div className="remark-cell">{it.memo ?? "-"}</div></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-500 py-6">표시할 임차 문의가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <UrgentMirror />
</main>
  );
}


