"use client";

import React, { useMemo, useState } from "react";

/** 담당자 고정 옵션 */
const AGENTS = ["김부장","김과장","강실장","소장","공동","프리중"] as const;
type Agent = typeof AGENTS[number];

export type ListingStatus = "공개" | "비공개" | "거래중" | "거래완료";
export type ListingType =
  | "아파트" | "오피스텔" | "빌라/다세대" | "단독/다가구" | "상가" | "상가주택" | "사무실" | "토지";

interface Flags {
  lhsh?: boolean;
  hug?: boolean;
  hf?: boolean;
  insurance?: boolean;
  biz?: boolean;
}

export interface Listing {
  id: string;
  createdAt: string;
  dealType?: "월세" | "전세" | "매매";
  code?: string;
  address: string;
  buildingName?: string;
  dong?: string;
  ho?: string;
  floor?: number;

  type: ListingType;
  areaExclusive?: number;
  rooms?: number;
  baths?: number;

  deposit?: number;
  rent?: number;
  maintenanceFee?: number;
  maintenanceIncludes?: string;

  parking?: "가능" | "불가" | "문의";
  elevator?: boolean;

  pets?: boolean;
  flags?: Flags;

  vacant?: boolean;
  moveInDate?: string;
  moveInPeriod?: "초순" | "중순" | "하순";

  memo?: string;
  agent?: Agent;
  status: ListingStatus;

  lessorName?: string;
  lessorPhone?: string;
  lesseeName?: string;
  lesseePhone?: string;
  managerName?: string;
  managerPhone?: string;
}

/* 샘플 데이터 */
const DATA0: Listing[] = [
  {
    id: "L-2025-0001",
    createdAt: "2025-09-05",
    dealType: "월세",
    code: "BO-0004",
    address: "서울 강동구 천호동 166-82",
    buildingName: "대수타워", dong: "101", ho: "1203", floor: 12,
    type: "오피스텔",
    areaExclusive: 44.2, rooms: 1, baths: 1,
    deposit: 1000, rent: 65, maintenanceFee: 7,
    parking: "가능", elevator: true,
    vacant: true, memo: "즉시입주, 로열층",
    agent: "강실장", status: "공개",
    lessorName: "홍길동", lessorPhone: "010-1234-5678",
    pets: false, flags: { biz: false, lhsh: false, hug: false, hf: false, insurance: false },
  },
  {
    id: "L-2025-0002",
    createdAt: "2025-08-28",
    dealType: "월세",
    code: "BO-0002",
    address: "서울 강동구 길동 123-45",
    buildingName: "길동리버뷰", floor: 7,
    type: "아파트",
    areaExclusive: 84.97, rooms: 3, baths: 2,
    deposit: 3000, rent: 120, maintenanceFee: 12,
    parking: "가능", elevator: true,
    vacant: false, moveInDate: "2025-09-15", moveInPeriod: "중순",
    memo: "거래중, 9/15 퇴거예정",
    agent: "김부장", status: "거래중",
    lessorName: "김임대", lessorPhone: "010-2222-3333",
    lesseeName: "박차임", lesseePhone: "010-4444-5555",
    pets: true, flags: { biz: true, lhsh: false, hug: true, hf: false, insurance: true },
  },
  {
    id: "L-2025-0003",
    createdAt: "2025-07-15",
    dealType: "월세",
    code: "BO-0003",
    address: "서울 강동구 성내동 55-3",
    buildingName: "성내스퀘어", floor: 1,
    type: "상가",
    areaExclusive: 23.1, rooms: 0, baths: 1,
    deposit: 2000, rent: 180,
    parking: "문의", elevator: false,
    vacant: true, memo: "노출천장, 코너",
    agent: "소장", status: "비공개",
    managerName: "관리리", managerPhone: "010-7777-8888",
    pets: false, flags: { biz: false, lhsh: false, hug: false, hf: false, insurance: false },
  },
];

/* 유틸 */
const won = (n?: number) => (n == null ? "-" : n.toLocaleString("ko-KR"));
const fmt = (d?: string) => (d ? d : "-");
const pyeong = (m2?: number) => (m2 == null ? "-" : (m2 * 0.3025).toFixed(1));
const INPUT = "w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300";

function rowTint(row: Listing) {
  if (row.status === "거래완료") return "bg-black text-white/70";
  if ((row.agent ?? "").includes("공동")) return "bg-green-50";
  if ((row.agent ?? "").includes("김부장")) return "bg-blue-50";
  if ((row.agent ?? "").includes("김과장")) return "bg-yellow-50";
  if ((row.agent ?? "").includes("강실장")) return "bg-pink-50";
  return "";
}
function tenantInfo(row: Listing) {
  if (row.vacant) return "공실";
  return "이사가능일";
}

/* 상세검색 상태 */
type DetailFilter = {
  pets?: boolean;
  lhsh?: boolean;
  hug?: boolean;
  hf?: boolean;
  insurance?: boolean;
  biz?: boolean;
  parkingOk?: boolean;

  minDeposit?: number;
  maxDeposit?: number;
  minRent?: number;
  maxRent?: number;
  minArea?: number;
  maxArea?: number;
  rooms?: number;
};

type EditMode = "view" | "edit";
type Book = "전체" | "월세" | "전세" | "매매";

export default function ListingsPage() {
  const [q, setQ] = useState("");
  const [vacantOnly, setVacantOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);

  const [rows, setRows] = useState<Listing[]>(DATA0);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [mode, setMode] = useState<EditMode>("view");
  const [draft, setDraft] = useState<Listing | null>(null);

  const [showDetail, setShowDetail] = useState(false);
  const [df, setDf] = useState<DetailFilter>({});
  const [activeBook, setActiveBook] = useState<Book>("전체");

  // 전화번호 입력 포맷터
  function handlePhoneChange<K extends "lessorPhone" | "lesseePhone" | "managerPhone">(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const onlyDigits = e.target.value.replace(/\D/g, "");
      let tail = onlyDigits.replace(/^010/, "");
      if (tail.length > 8) tail = tail.slice(0, 8);
      let formatted = "010-";
      if (tail.length <= 4) formatted += tail;
      else formatted += tail.slice(0, 4) + "-" + tail.slice(4);
      setDraft((prev) => (prev ? { ...prev, [key]: formatted } as Listing : prev));
    };
  }

  // 코드 자동 채번
  function nextCode(dealType: NonNullable<Listing["dealType"]>) {
    const prefix = dealType === "월세" ? "BO" : dealType === "전세" ? "BL" : "BM";
    let max = 0;
    rows.forEach((r) => {
      if (!r.code) return;
      const m = r.code.match(/^([A-Z]{2})-(\d{4})$/);
      if (m && m[1] === prefix) {
        const n = parseInt(m[2], 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    const n = (max + 1).toString().padStart(4, "0");
    return `${prefix}-${n}`;
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (vacantOnly && !r.vacant) return false;
      if (hideCompleted && r.status === "거래완료") return false;
      if (activeBook !== "전체" && r.dealType !== activeBook) return false;

      const F = r.flags ?? {};
      if (df.pets && !r.pets) return false;
      if (df.parkingOk && r.parking !== "가능") return false;
      if (df.lhsh && !F.lhsh) return false;
      if (df.hug && !F.hug) return false;
      if (df.hf && !F.hf) return false;
      if (df.insurance && !F.insurance) return false;
      if (df.biz && !F.biz) return false;

      const dep = r.deposit ?? 0, rent = r.rent ?? 0, area = r.areaExclusive ?? 0;
      if (df.minDeposit != null && dep < df.minDeposit) return false;
      if (df.maxDeposit != null && dep > df.maxDeposit) return false;
      if (df.minRent != null && rent < df.minRent) return false;
      if (df.maxRent != null && rent > df.maxRent) return false;
      if (df.minArea != null && area < df.minArea) return false;
      if (df.maxArea != null && area > df.maxArea) return false;
      if (df.rooms != null && (r.rooms ?? 0) < df.rooms) return false;

      const hay = (
        (r.address || "") + " " +
        (r.buildingName || "") + " " +
        (r.dong || "") + " " +
        (r.ho || "") + " " +
        (r.agent || "") + " " +
        (r.memo || "")
      ).toLowerCase();
      return hay.includes(query);
    });
  }, [rows, q, vacantOnly, hideCompleted, df, activeBook]);

  function openEdit(row: Listing) {
    setSelected(row);
    setDraft({ ...row });
    setMode("view");
  }
  function update<K extends keyof Listing>(key: K, val: Listing[K]) {
    setDraft((prev) => (prev ? ({ ...prev, [key]: val } as Listing) : prev));
  }
  function updateFlags<K extends keyof Flags>(key: K, val: Flags[K]) {
    setDraft((prev) => (prev ? ({ ...prev, flags: { ...(prev.flags ?? {}), [key]: val } } as Listing) : prev));
  }
  function saveDraft() {
    if (!draft) return;
    const data = { ...draft };
    if (!data.code && data.dealType) data.code = nextCode(data.dealType);
    setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)));
    setSelected(data);
    setMode("view");
  }
  function removeSelected() {
    if (!selected) return;
    if (!confirm("정말 삭제하시겠어요?")) return;
    setRows((prev) => prev.filter((r) => r.id !== selected.id));
    setSelected(null);
    setDraft(null);
  }
  function addNew() {
    const nid = "L-" + Date.now();
    const item: Listing = {
      id: nid,
      createdAt: new Date().toISOString().slice(0, 10),
      dealType: "월세", code: "", address: "",
      type: "아파트", status: "공개",
      agent: "김부장", vacant: true, pets: false, flags: {},
      parking: "가능", elevator: false,
      lessorPhone: "010-", lesseePhone: "010-", managerPhone: "010-",
    };
    setRows((p) => [item, ...p]);
    openEdit(item);
    setMode("edit");
  }

  function moveInLabel(r: Listing) {
    if (r.vacant) return "";
    const hasDate = !!r.moveInDate;
    if (hasDate && r.moveInPeriod) return r.moveInDate + " (" + r.moveInPeriod + ")";
    if (hasDate) return r.moveInDate!;
    return "";
  }

  return (
    <div className="max-w-[1340px] mx-auto px-6 py-6 space-y-4">
      {/* 상단바 */}
      <div className="flex items-center gap-3">
        <button className="border px-3 py-2 rounded-lg" onClick={() => history.back()}>← 뒤로가기</button>
        <h1 className="flex-1 text-center text-2xl font-bold">매물관리</h1>
        <div className="flex items-center gap-2">
          <button className="border px-3 py-2 rounded-lg" onClick={() => setShowDetail(true)}>상세검색</button>
          <button className={"border px-3 py-2 rounded-lg " + (activeBook==="월세"?"bg-gray-100":"")} onClick={()=>setActiveBook("월세")}>월세매물장</button>
          <button className={"border px-3 py-2 rounded-lg " + (activeBook==="전세"?"bg-gray-100":"")} onClick={()=>setActiveBook("전세")}>전세매물장</button>
          <button className={"border px-3 py-2 rounded-lg " + (activeBook==="매매"?"bg-gray-100":"")} onClick={()=>setActiveBook("매매")}>매매매물장</button>
          <button className="bg-blue-600 text-white px-3 py-2 rounded-lg" onClick={addNew}>+ 매물등록</button>
        </div>
      </div>

      {/* 필터줄 */}
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={vacantOnly} onChange={(e) => setVacantOnly(e.target.checked)} />
          <span>공실만</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
          <span>거래완료 숨기기(검색 시 표시)</span>
        </label>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-gray-500">표시 {filtered.length}건 / 전체 {rows.length}건</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="주소검색" className={INPUT + " w-[320px]"} />
        </div>
      </div>

      {/* 표 */}
      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>날짜</th><th>담당</th><th>코드번호</th><th>거래유형</th><th>건물유형</th>
              <th>임대료(만원)</th><th>세입자정보</th><th>주소</th><th>전용면적</th>
              <th>방/욕</th><th>엘베</th><th>주차</th><th>임대/임차인</th><th>연락처</th><th>임대사업자</th><th>비고</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={"border-b last:border-b-0 cursor-pointer hover:bg-gray-50 " + rowTint(r)} onClick={() => openEdit(r)}>
                <td className="px-3 py-2">{fmt(r.createdAt)}</td>
                <td className="px-3 py-2">{r.agent ?? "-"}</td>
                <td className="px-3 py-2">{r.code ?? "-"}</td>
                <td className="px-3 py-2">{r.dealType ?? "-"}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{won(r.deposit)} / {won(r.rent)} / {won(r.maintenanceFee)}</td>
                <td className="px-3 py-2">
                  <div>{tenantInfo(r)}</div>
                  {!r.vacant && <div className="text-xs text-gray-500">{moveInLabel(r)}</div>}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.address}</div>
                  <div className="text-xs text-gray-500">
                    {(r.buildingName ?? "-")} {(r.dong ? "· " + r.dong + "동" : "")} {(r.ho ? r.ho + "호" : "")}
                  </div>
                </td>
                <td className="px-3 py-2">{r.areaExclusive ?? "-"}㎡ ({pyeong(r.areaExclusive)}평)</td>
                <td className="px-3 py-2">{r.rooms ?? 0} / {r.baths ?? 0}</td>
                <td className="px-3 py-2">{r.elevator ? "Y" : "N"}</td>
                <td className="px-3 py-2">{r.parking ?? "-"}</td>
                <td className="px-3 py-2">
                  <div><span className="text-xs text-gray-500 mr-1">임대</span>{r.lessorName ?? "-"}</div>
                  <div><span className="text-xs text-gray-500 mr-1">임차</span>{r.lesseeName ?? "-"}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{r.lessorPhone ?? "-"}</div>
                  <div>{r.lesseePhone ?? "-"}</div>
                </td>
                <td className="px-3 py-2">{(r.flags?.biz ? "Y" : "N")}</td>
                <td className="px-3 py-2"><div className="clamp2">{r.memo ?? "-"}</div></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={16}>조건에 맞는 매물이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 상세검색 패널 */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={() => setShowDetail(false)}>
          <div className="w-[420px] max-w-full h-full bg-white p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold">상세검색</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">보증(만)</div>
                <div className="flex gap-2">
                  <input className={INPUT} type="number" placeholder="최소" onChange={(e)=>setDf(p=>({...p,minDeposit:e.target.value===""?undefined:Number(e.target.value)}))}/>
                  <input className={INPUT} type="number" placeholder="최대" onChange={(e)=>setDf(p=>({...p,maxDeposit:e.target.value===""?undefined:Number(e.target.value)}))}/>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">월세(만)</div>
                <div className="flex gap-2">
                  <input className={INPUT} type="number" placeholder="최소" onChange={(e)=>setDf(p=>({...p,minRent:e.target.value===""?undefined:Number(e.target.value)}))}/>
                  <input className={INPUT} type="number" placeholder="최대" onChange={(e)=>setDf(p=>({...p,maxRent:e.target.value===""?undefined:Number(e.target.value)}))}/>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">면적(㎡)</div>
                <div className="flex gap-2">
                  <input className={INPUT} type="number" placeholder="최소" onChange={(e)=>setDf(p=>({...p,minArea:e.target.value===""?undefined:Number(e.target.value)}))}/>
                  <input className={INPUT} type="number" placeholder="최대" onChange={(e)=>setDf(p=>({...p,maxArea:e.target.value===""?undefined:Number(e.target.value)}))}/>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">방 갯수 이상</div>
                <input className={INPUT} type="number" placeholder="예: 2" onChange={(e)=>setDf(p=>({...p,rooms:e.target.value===""?undefined:Number(e.target.value)}))}/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2"><input type="checkbox" onChange={(e)=>setDf(p=>({...p,pets:e.target.checked}))}/><span>반려동물</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" onChange={(e)=>setDf(p=>({...p,parkingOk:e.target.checked}))}/><span>주차 가능</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" onChange={(e)=>setDf(p=>({...p,lhsh:e.target.checked}))}/><span>LH·SH</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" onChange={(e)=>setDf(p=>({...p,hug:e.target.checked}))}/><span>HUG</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" onChange={(e)=>setDf(p=>({...p,hf:e.target.checked}))}/><span>HF</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" onChange={(e)=>setDf(p=>({...p,insurance:e.target.checked}))}/><span>보증보험</span></label>
              <label className="flex items-center gap-2 col-span-2"><input type="checkbox" onChange={(e)=>setDf(p=>({...p,biz:e.target.checked}))}/><span>주택임대사업자</span></label>
            </div>

            <div className="flex gap-2 pt-3">
              <button className="border px-3 py-2 rounded-lg" onClick={()=>{setDf({});}}>초기화</button>
              <button className="bg-blue-600 text-white px-3 py-2 rounded-lg" onClick={()=>setShowDetail(false)}>적용</button>
            </div>
          </div>
        </div>
      )}

      {/* 오른쪽 수정 패널 — 더 넓게 */}
      {selected && draft && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[1100px] max-w-full h-full bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">매물 정보</h2>
              <div className="flex gap-2">
                <button className="border px-3 py-2 rounded-lg" onClick={() => { setSelected(null); setDraft(null); }}>← 뒤로가기</button>
                <button className="border border-red-500 text-red-600 px-3 py-2 rounded-lg" onClick={removeSelected}>삭제</button>
                <button className="bg-blue-600 text-white px-3 py-2 rounded-lg" onClick={saveDraft}>저장</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="날짜">
                <input className={INPUT} type="date" value={draft.createdAt ?? ""} onChange={(e) => update("createdAt", e.target.value)} />
              </Field>

              <Field label="담당">
                <select className={INPUT} value={draft.agent ?? "김부장"} onChange={(e)=>update("agent", e.target.value as Agent)}>
                  {AGENTS.map(a=> <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>

              <Field label="거래유형">
                <select className={INPUT} value={draft.dealType ?? "월세"} onChange={(e)=>update("dealType", e.target.value as any)}>
                  <option>월세</option><option>전세</option><option>매매</option>
                </select>
              </Field>

              <Field label="코드번호">
                <div className="flex items-center gap-2">
                  <input className={INPUT + " flex-1"} value={draft.code ?? ""} onChange={(e)=>update("code", e.target.value)} />
                  <button className="border px-3 py-2 rounded-lg" onClick={()=>{ if (draft.dealType) update("code", nextCode(draft.dealType)); }}>수정</button>
                </div>
              </Field>

              <Field label="건물유형">
                <select className={INPUT} value={draft.type} onChange={(e)=>update("type", e.target.value as ListingType)}>
                  {["아파트","오피스텔","빌라/다세대","단독/다가구","상가","상가주택","사무실","토지"].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="주소">
                <input className={INPUT} value={draft.address ?? ""} onChange={(e) => update("address", e.target.value)} />
              </Field>

              {/* 동/층수/호 (순서: 동/층수/호) */}
              <Field label="동 / 층수 / 호">
                <div className="flex gap-2">
                  <input className={INPUT + " w-28"} placeholder="동" value={draft.dong ?? ""} onChange={(e)=>update("dong", e.target.value)} />
                  <input className={INPUT + " w-28"} placeholder="층수" type="number" value={draft.floor ?? ""} onChange={(e)=>update("floor", Number(e.target.value))} />
                  <input className={INPUT + " w-28"} placeholder="호" value={draft.ho ?? ""} onChange={(e)=>update("ho", e.target.value)} />
                </div>
              </Field>

              <Field label="전용면적(㎡)">
                <div>
                  <input className={INPUT} type="number" step="0.01" value={draft.areaExclusive ?? ""} onChange={(e)=>update("areaExclusive", e.target.value===""?undefined:Number(e.target.value))} />
                  <div className="text-xs text-gray-500 mt-1">{draft.areaExclusive ? "≈ " + (draft.areaExclusive*0.3025).toFixed(1) + " 평" : "㎡ 입력 시 평 자동계산"}</div>
                </div>
              </Field>

              {/* 임대료 → 방/욕 순서 (관리비 포함, 포함사항 입력) */}
              <Field label="보증 / 월세 / 관리비 (만원)">
                <div className="flex gap-2">
                  <input className={INPUT} type="number" value={draft.deposit ?? 0} onChange={(e)=>update("deposit", Number(e.target.value))} />
                  <input className={INPUT} type="number" value={draft.rent ?? 0} onChange={(e)=>update("rent", Number(e.target.value))} />
                  <input className={INPUT} type="number" value={draft.maintenanceFee ?? 0} onChange={(e)=>update("maintenanceFee", Number(e.target.value))} />
                </div>
                <input className={INPUT + " mt-2"} placeholder="(관리비포함사항 수기입력)" value={draft.maintenanceIncludes ?? ""} onChange={(e)=>update("maintenanceIncludes", e.target.value)} />
              </Field>

              <Field label="방 / 욕">
                <div className="flex gap-2">
                  <input className={INPUT} type="number" value={draft.rooms ?? 0} onChange={(e)=>update("rooms", Number(e.target.value))} />
                  <input className={INPUT} type="number" value={draft.baths ?? 0} onChange={(e)=>update("baths", Number(e.target.value))} />
                </div>
              </Field>

              {/* 세입자정보: 공실 옆 날짜 + 초/중/하순 */}
              <Field label="세입자정보">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!draft.vacant} onChange={(e)=>update("vacant", e.target.checked)} />
                    <span>공실</span>
                  </label>
                  {!draft.vacant && (
                    <>
                      <span className="text-sm text-gray-600">세입자만기일/이사가능일</span>
                      <input className={INPUT + " w-44"} type="date" value={draft.moveInDate ?? ""} onChange={(e)=>update("moveInDate", e.target.value)} />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input type="radio" name="period" checked={draft.moveInPeriod==="초순"} onChange={()=>update("moveInPeriod","초순")} />초순
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="radio" name="period" checked={draft.moveInPeriod==="중순"} onChange={()=>update("moveInPeriod","중순")} />중순
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="radio" name="period" checked={draft.moveInPeriod==="하순"} onChange={()=>update("moveInPeriod","하순")} />하순
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </Field>

              {/* 연락처: 가로 한 줄 (성함 작게, 연락처 길게 + 010- 자동포맷) */}
              <Field label="임대인">
                <div className="flex items-center gap-2">
                  <input className={INPUT + " w-40"} placeholder="ex) 성함,별칭" value={draft.lessorName ?? ""} onChange={(e)=>update("lessorName", e.target.value)} />
                  <input className={INPUT + " flex-1"} placeholder="0000 - 0000" value={draft.lessorPhone ?? "010-"} onFocus={()=>{ if(!draft.lessorPhone) update("lessorPhone","010-"); }} onChange={handlePhoneChange("lessorPhone")} />
                </div>
              </Field>
              <Field label="임차인">
                <div className="flex items-center gap-2">
                  <input className={INPUT + " w-40"} placeholder="ex) 성함,별칭" value={draft.lesseeName ?? ""} onChange={(e)=>update("lesseeName", e.target.value)} />
                  <input className={INPUT + " flex-1"} placeholder="0000 - 0000" value={draft.lesseePhone ?? "010-"} onFocus={()=>{ if(!draft.lesseePhone) update("lesseePhone","010-"); }} onChange={handlePhoneChange("lesseePhone")} />
                </div>
              </Field>
              <Field label="관리자(표시 안함)">
                <div className="flex items-center gap-2">
                  <input className={INPUT + " w-40"} placeholder="ex) 성함,별칭" value={draft.managerName ?? ""} onChange={(e)=>update("managerName", e.target.value)} />
                  <input className={INPUT + " flex-1"} placeholder="0000 - 0000" value={draft.managerPhone ?? "010-"} onFocus={()=>{ if(!draft.managerPhone) update("managerPhone","010-"); }} onChange={handlePhoneChange("managerPhone")} />
                </div>
              </Field>

              {/* 체크박스 묶음 */}
              <div className="col-span-2 border-t pt-3" />
              <Field label="추가 옵션">
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.pets} onChange={(e)=>update("pets", e.target.checked)} /><span>반려동물</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={draft.parking==="가능"} onChange={(e)=>update("parking", e.target.checked?"가능":"불가")} /><span>주차 가능</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.elevator} onChange={(e)=>update("elevator", e.target.checked)} /><span>엘리베이터</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.flags?.lhsh} onChange={(e)=>updateFlags("lhsh", e.target.checked)} /><span>LH·SH</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.flags?.hug} onChange={(e)=>updateFlags("hug", e.target.checked)} /><span>HUG</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.flags?.hf} onChange={(e)=>updateFlags("hf", e.target.checked)} /><span>HF</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.flags?.insurance} onChange={(e)=>updateFlags("insurance", e.target.checked)} /><span>보증보험</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.flags?.biz} onChange={(e)=>updateFlags("biz", e.target.checked)} /><span>주택임대사업자</span></label>
                </div>
              </Field>

              <div className="col-span-2">
                <Field label="비고(알아야될 정보 + 특징)">
                  <textarea className={INPUT + " h-24"} value={draft.memo ?? ""} onChange={(e)=>update("memo", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .clamp2{
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
          word-break:break-all;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
