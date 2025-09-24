"use client";

import React from "react";
import Link from "next/link";

type Deal = "월세" | "전세" | "매매";

type Listing = {
  id: string;
  createdAt: string;
  agent: string;
  code: string;
  dealType: Deal;
  buildingType: string;
  deposit?: number;
  rent?: number;
  mgmt?: number;
  address: string;
  addressSub?: string;
  vacant: boolean;
  completed: boolean;
};

const ROWS: Listing[] = [
  {
    id: "R-0001",
    createdAt: "2025-09-05",
    agent: "강실장",
    code: "BO-0004",
    dealType: "월세",
    buildingType: "오피스텔",
    deposit: 1000,
    rent: 65,
    mgmt: 7,
    address: "서울 강동구 천호동 166-82",
    addressSub: "대스타워 · 101동 1203호",
    vacant: true,
    completed: false,
  },
  {
    id: "R-0002",
    createdAt: "2025-08-28",
    agent: "김부장",
    code: "BO-1234",
    dealType: "월세",
    buildingType: "아파트",
    deposit: 3000,
    rent: 120,
    mgmt: 12,
    address: "서울 강동구 길동 123-45",
    addressSub: "길동리버뷰",
    vacant: false,
    completed: false,
  },
  {
    id: "R-0003",
    createdAt: "2025-07-15",
    agent: "소장",
    code: "BO-5678",
    dealType: "월세",
    buildingType: "상가주택",
    deposit: 2000,
    rent: 180,
    mgmt: 0,
    address: "서울 강동구 성내동 55-3",
    addressSub: "성내스퀘어",
    vacant: true,
    completed: false,
  },
];

const fmtWon = (v?: number) =>
  v || v === 0 ? v.toLocaleString("ko-KR") : "-";
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
};

export default function ListingsPage() {
  return (
    <main className="w-full mx-auto max-w-[1400px] px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">매물 리스트</h1>
        <Link
          href="/listings/new"
          className="px-3 py-2 border rounded-lg hover:bg-gray-50"
        >
          + 매물 등록
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">등록일</th>
              <th className="px-3 py-2 text-left">코드</th>
              <th className="px-3 py-2 text-left">거래</th>
              <th className="px-3 py-2 text-left">유형</th>
              <th className="px-3 py-2 text-left">보증금</th>
              <th className="px-3 py-2 text-left">월세</th>
              <th className="px-3 py-2 text-left">관리비</th>
              <th className="px-3 py-2 text-left">주소</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{fmtDate(r.createdAt)}</td>
                <td className="px-3 py-2 font-mono">{r.code}</td>
                <td className="px-3 py-2">{r.dealType}</td>
                <td className="px-3 py-2">{r.buildingType}</td>
                <td className="px-3 py-2">{fmtWon(r.deposit)}</td>
                <td className="px-3 py-2">{fmtWon(r.rent)}</td>
                <td className="px-3 py-2">{fmtWon(r.mgmt)}</td>
                <td className="px-3 py-2">
                  {r.address}
                  {r.addressSub ? ` · ${r.addressSub}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
