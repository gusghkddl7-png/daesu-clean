"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Status = "공개" | "숨김" | "계약완료";
type LType = "원룸" | "투룸" | "오피스텔" | "상가" | "사무실";

type Listing = {
  id: string;
  title: string;
  district: "천호동" | "길동" | "암사동" | "성내동" | "둔촌동";
  type: LType;
  price?: number;
  deposit?: number;
  rent?: number;
  area?: number;
  floor?: string;
  createdAt: string;
  agent?: string;
  status: Status;
};

const MOCK: Listing[] = [
  { id:"L-001", title:"천호역 도보 3분 오피스텔", district:"천호동", type:"오피스텔", deposit:1000, rent:70, area:28, floor:"20F", createdAt:"2025-08-30", agent:"여실장", status:"공개" },
  { id:"L-002", title:"성내동 투룸 풀옵션",       district:"성내동", type:"투룸",     deposit:2000, rent:95, area:36, floor:"5F",  createdAt:"2025-09-01", agent:"남부장", status:"숨김" },
  { id:"L-003", title:"둔촌동 상가 1층 코너",       district:"둔촌동", type:"상가",     price:85000, area:49, floor:"1F", createdAt:"2025-08-25", agent:"강팀장", status:"공개" },
  { id:"L-004", title:"암사동 사무실 분할 임대",   district:"암사동", type:"사무실",   deposit:3000, rent:180, area:66, floor:"7F", createdAt:"2025-09-05", agent:"여실장", status:"계약완료" },
  { id:"L-005", title:"길동 원룸 신축급",         district:"길동",   type:"원룸",     deposit:500,  rent:55, area:20, floor:"3F", createdAt:"2025-09-10", agent:"남부장", status:"공개" },
];

function fmtCurrencyKR(v?: number) {
  if (v === undefined || v === null) return "-";
  return v.toLocaleString("ko-KR");
}

export default function ListingsPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("");
  const [ltype, setLtype] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const pageSize = 10;
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = [...MOCK];
    const needle = q.trim();
    if (needle) {
      const n = needle.toLowerCase();
      rows = rows.filter((r) =>
        r.title.toLowerCase().includes(n) || (r.agent ?? "").toLowerCase().includes(n)
      );
    }
    if (district) rows = rows.filter((r) => r.district === district);
    if (ltype) rows = rows.filter((r) => r.type === (ltype as LType));
    if (status) rows = rows.filter((r) => r.status === (status as Status));

    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    rows = rows.filter((r) => {
      const base = r.price ?? r.deposit ?? 0;
      if (min !== undefined && base < min) return false;
      if (max !== undefined && base > max) return false;
      return true;
    });

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return rows;
  }, [q, district, ltype, status, minPrice, maxPrice]);

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetFilters() {
    setQ(""); setDistrict(""); setLtype(""); setStatus(""); setMinPrice(""); setMaxPrice(""); setPage(1);
  }

  function cellPrice(r: Listing) {
    if (r.price) return `매매 ${fmtCurrencyKR(r.price)}만원`;
    if (r.deposit || r.rent !== undefined) return `전월세 ${fmtCurrencyKR(r.deposit)} / ${fmtCurrencyKR(r.rent)}만원`;
    return "-";
  }

  return (
    <main className="w-full max-w-[1200px] mx-auto px-4 md:px-6 py-6">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b mb-4">
        <div className="py-3 flex items-center justify-between">
          <div className="flex-1">
            <button className="border px-3 py-2 rounded-lg hover:bg-gray-50" onClick={() => history.back()}>
              ← 뒤로가기
            </button>
          </div>
          <h1 className="text-xl font-semibold text-center flex-1">매물관리</h1>
          <div className="flex-1 flex justify-end">
            <button
              className="border px-3 py-2 rounded-lg hover:bg-gray-50"
              onClick={() => router.push("/listings/new")}
            >
              + 신규등록
            </button>
          </div>
        </div>
      </div>

      <section className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <input value={q} onChange={(e)=>{setQ(e.target.value); setPage(1);}} placeholder="검색어 (제목/담당)" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <select value={district} onChange={(e)=>{setDistrict(e.target.value); setPage(1);}} className="border rounded-lg px-3 py-2">
            <option value="">지역(전체)</option><option>천호동</option><option>길동</option><option>암사동</option><option>성내동</option><option>둔촌동</option>
          </select>
          <select value={ltype} onChange={(e)=>{setLtype(e.target.value); setPage(1);}} className="border rounded-lg px-3 py-2">
            <option value="">유형(전체)</option><option>원룸</option><option>투룸</option><option>오피스텔</option><option>상가</option><option>사무실</option>
          </select>
          <select value={status} onChange={(e)=>{setStatus(e.target.value); setPage(1);}} className="border rounded-lg px-3 py-2">
            <option value="">상태(전체)</option><option>공개</option><option>숨김</option><option>계약완료</option>
          </select>
          <div className="flex gap-2">
            <input value={minPrice} onChange={(e)=>{setMinPrice(e.target.value.replace(/\D/g,"")); setPage(1);}} inputMode="numeric" placeholder="최소가(만원)" className="w-full border rounded-lg px-3 py-2" />
            <input value={maxPrice} onChange={(e)=>{setMaxPrice(e.target.value.replace(/\D/g,"")); setPage(1);}} inputMode="numeric" placeholder="최대가(만원)" className="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-gray-600">총 <b>{total}</b>건 / 페이지 <b>{page}</b> / <b>{maxPage}</b></div>
          <div className="flex gap-2">
            <button className="px-3 py-2 border rounded-lg hover:bg-gray-50" onClick={resetFilters}>필터 초기화</button>
          </div>
        </div>
      </section>

      <section className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-3 py-2">제목</th><th className="px-3 py-2">지역</th><th className="px-3 py-2">유형</th>
                <th className="px-3 py-2">가격</th><th className="px-3 py-2">면적(㎡)</th><th className="px-3 py-2">등록일</th>
                <th className="px-3 py-2">담당</th><th className="px-3 py-2">상태</th><th className="px-3 py-2">작업</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-medium">{r.title}</td>
                  <td className="px-3 py-2">{r.district}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{cellPrice(r)}</td>
                  <td className="px-3 py-2">{r.area ?? "-"}</td>
                  <td className="px-3 py-2">{new Date(r.createdAt).toLocaleDateString("ko-KR")}</td>
                  <td className="px-3 py-2">{r.agent ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span className={
                      "px-2 py-1 rounded text-xs " +
                      (r.status === "공개" ? "bg-green-100 text-green-700"
                       : r.status === "숨김" ? "bg-gray-200 text-gray-700"
                       : "bg-blue-100 text-blue-700")
                    }>{r.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={() => alert(`보기: ${r.id}`)}>보기</button>
                      <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={() => alert(`수정: ${r.id}`)}>수정</button>
                      <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={() => confirm("정말 삭제할까요?") && alert(`삭제: ${r.id}`)}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-gray-500">조건에 맞는 매물이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-top border-t bg-white">
          <div className="text-sm text-gray-600">
            {total > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total}` : "0 / 0"}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>이전</button>
            <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>다음</button>
          </div>
        </div>
      </section>
    </main>
  );
}
