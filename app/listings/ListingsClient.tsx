"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** ====== 타입 ====== */
type ListingStatus = "공개" | "비공개" | "거래중" | "거래완료";
type ListingType =
  | "아파트" | "오피스텔" | "빌라" | "다세대" | "다가구" | "상가" | "사무실";

interface Listing {
  id: string;
  date: string;                // 날짜(등록/갱신)
  manager: string;             // 담당자 (승인된 3글자 이름만 표시)
  type: ListingType;           // 건물유형
  deposit?: number;            // 보증금(만원)
  rent?: number;               // 월세(만원)
  tenantLives?: boolean;       // 세입자거주 여부
  address: string;             // 주소
  dong?: string;               // 동
  ho?: string;                 // 호
  floor?: number;              // 층
  areaExclusive?: number;      // 전용(㎡)
  rooms?: number;              // 방
  baths?: number;              // 욕실
  contractEnd?: string;        // 세입자 계약만기일 (YYYY-MM-DD)
  elevator?: boolean;          // 엘베 유무
  parking?: "가능" | "불가" | "문의"; // 주차 가능여부
  landlord?: string;           // 임대(차)인 성함
  landlordPhone?: string;      // 임대(차)인 연락처
  lho?: "Y" | "N";             // 주택임대사업자 여부 (간단히 Y/N)
  memo?: string;               // 비고(알아야될정보+특징)
  status: ListingStatus;       // 상태
  vacant?: boolean;            // 공실 여부
  saved?: boolean;             // 저장됨 표시
}

/** ====== 샘플 데이터 ====== */
const INIT: Listing[] = [
  {
    id: "L-2025-0001",
    date: "2025-09-05",
    manager: "강실장",
    type: "오피스텔",
    deposit: 1000, rent: 65,
    tenantLives: false,
    address: "서울 강동구 천호동 166-82",
    dong: "101", ho: "1203", floor: 12,
    areaExclusive: 44.2, rooms: 1, baths: 1,
    contractEnd: "",
    elevator: true, parking: "가능",
    landlord: "홍길동", landlordPhone: "010-1234-5678", lho: "N",
    memo: "즉시입주, 로열층",
    status: "공개",
    vacant: true,
    saved: true,
  },
  {
    id: "L-2025-0002",
    date: "2025-08-28",
    manager: "김부장",
    type: "아파트",
    deposit: 3000, rent: 120,
    tenantLives: true,
    address: "서울 강동구 길동 123-45",
    floor: 7,
    areaExclusive: 84.97, rooms: 3, baths: 2,
    contractEnd: "2025-09-15",
    elevator: true, parking: "가능",
    landlord: "김임대", landlordPhone: "010-2222-3333", lho: "Y",
    memo: "거래중, 9/15 퇴거예정",
    status: "거래중",
    vacant: false,
    saved: false,
  },
  {
    id: "L-2025-0003",
    date: "2025-07-15",
    manager: "소장",
    type: "상가",
    deposit: 2000, rent: 180,
    tenantLives: false,
    address: "서울 강동구 성내동 55-3 성내스퀘어",
    floor: 1,
    areaExclusive: 23.1, rooms: 0, baths: 1,
    contractEnd: "",
    elevator: false, parking: "문의",
    landlord: "박사장", landlordPhone: "010-7777-8888", lho: "N",
    memo: "노출천장, 코너",
    status: "비공개",
    vacant: true,
    saved: false,
  },
];

/** ====== 유틸 ====== */
const won = (n?: number) => (n == null ? "-" : n.toLocaleString("ko-KR"));
const px = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

function rowBg(l: Listing): string {
  if (l.status === "거래완료") return "bg-black text-white/70";
  if (l.saved) return "bg-amber-50";
  // 담당자에 따른 라이트 하이라이트(승인/미승인 무관, 시각적 구분만)
  switch (l.manager) {
    case "공동매물": return "bg-green-50";
    case "김부장":   return "bg-blue-50";
    case "김과장":   return "bg-yellow-50";
    case "강실장":   return "bg-pink-50";
    default: return "bg-white";
  }
}

/** ====== 메인 컴포넌트 ====== */
export default function ListingsClient() {
  const router = useRouter();
  const [items, setItems] = useState<Listing[]>(INIT);
  const [q, setQ] = useState("");
  const [vacantOnly, setVacantOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);

  // 승인된 담당자 목록 불러오기 (설정 연동)
  const [approved, setApproved] = useState<Set<string>>(new Set());
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/staff?approved=1", { cache: "no-store" });
        const arr = await res.json();
        const only3 = (Array.isArray(arr) ? arr : []).filter(
          (s) => typeof s === "string" && s.trim().length === 3
        );
        if (alive) setApproved(new Set(only3));
      } catch {
        if (alive) setApproved(new Set());
      }
    })();
    return () => { alive = false; };
  }, []);

  // 표시용: 승인된 이름만 보여주기(미승인은 공백)
  const showManager = (name?: string) =>
    name && approved.has(name.trim()) ? name.trim() : "";

  const query = q.trim().toLowerCase();
  const saved = useMemo(() => items.filter(i => i.saved), [items]);

  const filtered = useMemo(() => {
    return items.filter((l) => {
      if (vacantOnly && !l.vacant) return false;
      // 거래완료 숨김은 검색어 없을 때만 적용
      if (hideCompleted && query === "" && l.status === "거래완료") return false;

      // 검색은 원본 값 기준(담당자 포함)으로 수행
      const hay = [
        l.address, l.type, l.manager, l.memo,
        l.landlord, l.landlordPhone, l.dong, l.ho
      ].filter(Boolean).join(" ").toLowerCase();

      return hay.includes(query);
    });
  }, [items, vacantOnly, hideCompleted, query]);

  const toggleSave = (id: string) => {
    setItems(prev => prev.map(l => l.id === id ? { ...l, saved: !l.saved } : l));
  };

  return (
    <div className="w-full max-w-none px-6 py-4">
      {/* 상단: 좌측 로고, 중앙 타이틀 */}
      <div className="relative h-12 flex items-center mb-3">
        <div className="absolute left-0 text-lg font-semibold">대수부동산</div>
        <h1 className="mx-auto text-2xl font-bold">매물관리</h1>
      </div>

      {/* 1행: 검색칸 (단독 줄) */}
      <div className="mb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="주소검색"
          className="w-[640px] max-w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* 2행: 뒤로가기 / 매물등록 (단독 줄) */}
      <div className="mb-4 flex items-center gap-2">
        <button
          className="border rounded-lg px-3 py-2 hover:bg-gray-50"
          onClick={() => history.back()}
        >
          ← 뒤로가기
        </button>
        <button
          className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700"
          onClick={() => router.push("/listings/new")}
        >
          + 매물등록
        </button>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-6 mb-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={vacantOnly} onChange={(e) => setVacantOnly(e.target.checked)} />
          <span>공실만</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
          <span>거래완료 숨기기(검색 시 표시)</span>
        </label>
        <div className="ml-auto text-sm text-gray-500">
          표시 {filtered.length}건 / 전체 {items.length}건
        </div>
      </div>

      {/* 저장된 매물 */}
      {saved.length > 0 && (
        <>
          <div className="text-sm font-semibold mb-1">저장된 매물</div>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-[1200px] w-full text-sm border">
              <thead className="bg-gray-50">
                <tr className="text-left whitespace-nowrap">
                  <Th>날짜</Th><Th>담당</Th><Th>건물유형</Th><Th>임대료</Th><Th>세입자거주</Th>
                  <Th>주소</Th><Th>층/호</Th><Th>전용면적</Th><Th>방/욕</Th><Th>계약만기</Th>
                  <Th>엘베</Th><Th>주차</Th><Th>임대(차)인</Th><Th>연락처</Th><Th>임대사업자</Th><Th>비고</Th><Th>저장</Th>
                </tr>
              </thead>
              <tbody>
                {saved.map((l) => <Row key={l.id} l={l} onSave={toggleSave} showManager={showManager} />)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 전체 매물 (가로 꽉 채움) */}
      <div className="text-sm font-semibold mb-1">전체 매물</div>
      <div className="overflow-x-auto">
        <table className="min-w-[1400px] w-full text-sm border">
          <thead className="bg-gray-50">
            <tr className="text-left whitespace-nowrap">
              <Th>날짜</Th><Th>담당</Th><Th>건물유형</Th><Th>임대료</Th><Th>세입자거주</Th>
              <Th>주소</Th><Th>층/호</Th><Th>전용면적</Th><Th>방/욕</Th><Th>계약만기</Th>
              <Th>엘베</Th><Th>주차</Th><Th>임대(차)인</Th><Th>연락처</Th><Th>임대사업자</Th><Th>비고</Th><Th>저장</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => <Row key={l.id} l={l} onSave={toggleSave} showManager={showManager} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** ====== 테이블 컴포넌트 ====== */
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 border-b">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode, className?: string }) {
  return <td className={px("px-3 py-2 border-b align-middle whitespace-nowrap", className)}>{children}</td>;
}

function Row({
  l,
  onSave,
  showManager,
}: {
  l: Listing;
  onSave: (id: string) => void;
  showManager: (name?: string) => string;
}) {
  const done = l.status === "거래완료";
  const mgr = showManager(l.manager);
  return (
    <tr className={px("border-b", rowBg(l), done && "border-white/20")}>
      <Td>{l.date}</Td>
      <Td>{mgr || ""}</Td>
      <Td>{l.type}</Td>
      <Td>{won(l.deposit)} / {won(l.rent)}</Td>
      <Td>{l.tenantLives ? "거주중" : "공실"}</Td>
      <Td className="whitespace-normal">{l.address}</Td>
      <Td>
        {(l.floor ?? "-")}층 / {l.dong ? `${l.dong}동` : "-"} / {l.ho ? `${l.ho}호` : "-"}
      </Td>
      <Td>{l.areaExclusive ? `${l.areaExclusive.toFixed(1)}㎡` : "-"}</Td>
      <Td>{(l.rooms ?? 0)} / {(l.baths ?? 0)}</Td>
      <Td>{l.contractEnd || "-"}</Td>
      <Td>{l.elevator ? "Y" : "N"}</Td>
      <Td>{l.parking ?? "-"}</Td>
      <Td>{l.landlord ?? "-"}</Td>
      <Td>{l.landlordPhone ?? "-"}</Td>
      <Td>{l.lho ?? "-"}</Td>
      <Td className="whitespace-normal">{l.memo ?? "-"}</Td>
      <Td>
        <button
          onClick={() => onSave(l.id)}
          className={px(
            "text-xs rounded px-2 py-1 border",
            l.saved ? "bg-amber-200/70 border-amber-400" : "bg-white hover:bg-gray-50"
          )}
          title={l.saved ? "저장 해제" : "저장"}
        >
          {l.saved ? "저장됨" : "저장"}
        </button>
      </Td>
    </tr>
  );
}
