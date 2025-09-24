"use client";

import React, { useMemo, useState } from "react";

/** 담당자 고정 옵션 */
const AGENTS = ["김부장","김과장","강실장","소장","공동","프리중"] as const;
type Agent = typeof AGENTS[number];
type DealType = "월세" | "전세" | "매매";

/** 건물유형(묶음 포함) */
export type ListingType =
  | "아파트"
  | "오피스텔"
  | "단독/다가구"
  | "빌라/다세대"
  | "상가주택"
  | "상가"
  | "사무실"
  | "토지";

export type ListingStatus = "공개" | "비공개" | "거래중" | "거래완료";
type MoveInQualifier = "초순" | "중순" | "하순";

export interface Listing {
  id: string;
  createdAt: string;
  dealType?: DealType;
  code?: string;
  address: string;
  buildingName?: string;
  dong?: string;
  ho?: string;
  type: ListingType;
  areaExclusive?: number;
  floor?: number;
  rooms?: number;
  baths?: number;

  deposit?: number;
  rent?: number;
  maintenanceFee?: number;
  maintenanceNote?: string;

  parkingOk?: boolean;
  elevator?: boolean;
  options?: string[];

  vacant?: boolean;
  occupancyLabel?: "세입자만기일" | "이사가능일";
  moveInDate?: string;
  moveInQualifier?: MoveInQualifier;

  memo?: string;
  agent?: Agent;
  status: ListingStatus;

  lessorName?: string;  lessorPhone?: string;
  lesseeName?: string;  lesseePhone?: string;
  managerName?: string; managerPhone?: string;

  pets?: boolean;
  flags?: {
    lhsh?: boolean;
    hug?: boolean;
    hf?: boolean;
    insurance?: boolean;
    biz?: boolean;
  };
}

/* 샘플 데이터 */
const DATA0: Listing[] = [
  {
    id: "L-2025-0001",
    createdAt: "2025-09-05",
    dealType: "월세",
    code: "BO-0004",
    address: "서울 강동구 천호동 166-82",
    buildingName: "대수타워", dong: "101", ho: "1203",
    type: "오피스텔",
    areaExclusive: 44.2, floor: 12, rooms: 1, baths: 1,
    deposit: 1000, rent: 65, maintenanceFee: 7, maintenanceNote: "인터넷, TV 포함",
    parkingOk: true, elevator: true,
    vacant: true, memo: "즉시입주, 로열층",
    agent: "강실장", status: "공개",
    lessorName: "홍길동", lessorPhone: "010-1234-5678",
    pets: false, flags: { biz: false, lhsh: false, hug: false, hf: false, insurance: false },
    options: ["풀옵션"]
  },
  {
    id: "L-2025-0002",
    createdAt: "2025-08-28",
    dealType: "월세",
    code: "BO-0002",
    address: "서울 강동구 길동 123-45",
    buildingName: "길동리버뷰",
    type: "아파트",
    areaExclusive: 84.97, floor: 7, rooms: 3, baths: 2,
    deposit: 3000, rent: 120, maintenanceFee: 12, maintenanceNote: "공용관리 포함",
    parkingOk: true, elevator: true,
    vacant: false,
    occupancyLabel: "이사가능일",
    moveInDate: "2025-09-15",
    moveInQualifier: "중순",
    memo: "거래중, 9/15 퇴거예정",
    agent: "김부장", status: "거래중",
    lessorName: "김임대", lessorPhone: "010-2222-3333",
    lesseeName: "박차임", lesseePhone: "010-4444-5555",
    pets: true, flags: { biz: true, lhsh: false, hug: true, hf: false, insurance: true },
    options: ["올수리","급매"]
  },
  {
    id: "L-2025-0003",
    createdAt: "2025-07-15",
    dealType: "월세",
    code: "BO-0003",
    address: "서울 강동구 성내동 55-3",
    buildingName: "성내스퀘어",
    type: "상가주택",
    areaExclusive: 23.1, floor: 1, rooms: 0, baths: 1,
    deposit: 2000, rent: 180, maintenanceFee: 0,
    parkingOk: false, elevator: false,
    vacant: true, memo: "노출천장, 코너",
    agent: "소장", status: "비공개",
    managerName: "관리리", managerPhone: "010-7777-8888",
    pets: false, flags: { biz: false, lhsh: false, hug: false, hf: false, insurance: false },
    options: ["세안고"]
  },
];

/* 유틸 */
const won = (n?: number) => (n == null ? "-" : n.toLocaleString("ko-KR"));
const fmt = (d?: string) => (d ? d : "-");
const pyeong = (m2?: number) => (m2 == null ? "-" : (m2 * 0.3025).toFixed(1));

function rowTint(row: Listing) {
  if (row.status === "거래완료") return "bg-black text-white/70";
  if ((row.agent ?? "").includes("공동")) return "bg-green-50";
  if ((row.agent ?? "").includes("김부장")) return "bg-blue-50";
  if ((row.agent ?? "").includes("김과장")) return "bg-yellow-50";
  if ((row.agent ?? "").includes("강실장")) return "bg-pink-50";
  return "";
}
function codePrefix(dt: DealType) { return dt === "월세" ? "BO" : dt === "전세" ? "BL" : "BM"; }
function nextCode(dt: DealType, rows: Listing[]) {
  const pref = codePrefix(dt) + "-";
  let max = 0;
  for (const r of rows) {
    if (!r.code) continue;
    if (r.code.startsWith(pref)) {
      const n = parseInt(r.code.slice(pref.length), 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  const nxt = (max + 1).toString().padStart(4, "0");
  return `${pref}${nxt}`;
}
function tenantLabel(row: Listing) {
  if (row.vacant) return "공실";
  return row.occupancyLabel ?? "이사가능일";
}
function prettyMoveIn(row: Listing) {
  if (!row.moveInDate) return "";
  const [y, m, d] = row.moveInDate.split("-").map(n => parseInt(n, 10));
  if (!y || !m) return row.moveInDate;
  if (row.moveInQualifier) return `${y}년 ${m}월 ${row.moveInQualifier}`;
  return d ? `${y}년 ${m}월 ${d}일` : `${y}년 ${m}월`;
}

/* 상세검색(간단 버전 유지) */
type DetailFilter = {
  pets?: boolean; parkingOk?: boolean;
  depositMin?: number; depositMax?: number;
  rentMin?: number; rentMax?: number;
  areaMin?: number; areaMax?: number;
  roomsMin?: number; bathsMin?: number;
  options?: string[];
  lhsh?: boolean; hug?: boolean; hf?: boolean; insurance?: boolean; biz?: boolean;
};
type EditMode = "view" | "edit";
type BookFilter = "전체" | DealType;

/* 연락처 입력: 010- 고정 + 8자리 제한 + 4자리 후 자동 '-' */
function format010(input: string | undefined): string {
  const digits = (input ?? "").replace(/\D/g, "");
  // 보정: 접두사 010 유지
  let rest = digits.startsWith("010") ? digits.slice(3) : digits;
  rest = rest.replace(/^010/, ""); // 사용자가 010을 또 치는 경우 정리
  rest = rest.slice(0, 8); // 최대 8자리
  if (rest.length <= 4) return "010-" + rest;
  return "010-" + rest.slice(0, 4) + "-" + rest.slice(4);
}
type PhoneInputProps = {
  value?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
};
function PhoneInput({ value, disabled, onChange, className, placeholder }: PhoneInputProps) {
  const display = value ? format010(value) : "010-";
  return (
    <input
      className={className ?? "input"}
      disabled={disabled}
      value={display}
      placeholder={placeholder ?? "0000-0000"}
      onChange={(e) => {
        // 입력 전체에서 숫자만 취득하여 정규화
        const raw = e.target.value.replace(/\D/g, "");
        // 강제로 010 접두
        const rest = raw.startsWith("010") ? raw.slice(3) : raw;
        const trimmed = rest.slice(0, 8);
        const formatted = trimmed.length <= 4
          ? "010-" + trimmed
          : "010-" + trimmed.slice(0, 4) + "-" + trimmed.slice(4);
        onChange(formatted);
      }}
      onBlur={(e) => {
        // 비었더라도 최소 "010-" 유지
        if (!e.target.value) onChange("010-");
      }}
    />
  );
}

export default function ListingsPage() {
  const [q, setQ] = useState("");
  const [vacantOnly, setVacantOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);

  const [rows, setRows] = useState<Listing[]>(DATA0);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [mode, setMode] = useState<EditMode>("view");
  const [draft, setDraft] = useState<Listing | null>(null);

  const [book, setBook] = useState<BookFilter>("전체");
  const [showDetail, setShowDetail] = useState(false);
  const [df, setDf] = useState<DetailFilter>({ options: [] });

  const [codeEdit, setCodeEdit] = useState(false); // 코드번호 개별 수정 토글

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (book !== "전체" && r.dealType !== book) return false;
      if (vacantOnly && !r.vacant) return false;
      if (hideCompleted && r.status === "거래완료") return false;

      if (df.pets && !r.pets) return false;
      if (df.parkingOk && !r.parkingOk) return false;
      if (df.depositMin != null && (r.deposit ?? 0) < df.depositMin) return false;
      if (df.depositMax != null && (r.deposit ?? 0) > df.depositMax) return false;
      if (df.rentMin != null && (r.rent ?? 0) < df.rentMin) return false;
      if (df.rentMax != null && (r.rent ?? 0) > df.rentMax) return false;
      if (df.areaMin != null && (r.areaExclusive ?? 0) < df.areaMin) return false;
      if (df.areaMax != null && (r.areaExclusive ?? 0) > df.areaMax) return false;
      if (df.roomsMin != null && (r.rooms ?? 0) < df.roomsMin) return false;
      if (df.bathsMin != null && (r.baths ?? 0) < df.bathsMin) return false;

      if (df.options && df.options.length > 0) {
        const have = new Set(r.options ?? []);
        for (const op of df.options) if (!have.has(op)) return false;
      }
      const F = r.flags ?? {};
      if (df.lhsh && !F.lhsh) return false;
      if (df.hug && !F.hug) return false;
      if (df.hf && !F.hf) return false;
      if (df.insurance && !F.insurance) return false;
      if (df.biz && !F.biz) return false;

      const hay = `${r.address} ${r.buildingName ?? ""} ${r.dong ?? ""} ${r.ho ?? ""} ${r.agent ?? ""} ${r.memo ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q, rows, book, vacantOnly, hideCompleted, df]);

  function openEdit(row: Listing) {
    setSelected(row);
    setDraft({ ...row });
    setMode("view");
    setCodeEdit(false);
  }
  function update<K extends keyof Listing>(key: K, val: Listing[K]) {
    if (!draft) return;
    setDraft({ ...draft, [key]: val });
  }
  function updateFlags<K extends keyof NonNullable<Listing["flags"]>>(key: K, val: NonNullable<Listing["flags"]>[K]) {
    if (!draft) return;
    setDraft({ ...draft, flags: { ...(draft.flags ?? {}), [key]: val } });
  }
  function toggleOption(option: string) {
    if (!draft) return;
    const set = new Set(draft.options ?? []);
    if (set.has(option)) set.delete(option); else set.add(option);
    setDraft({ ...draft, options: Array.from(set) });
  }
  function saveDraft() {
    if (!draft) return;
    setRows((prev) => prev.map((r) => (r.id === draft.id ? { ...draft } : r)));
    setSelected({ ...draft });
    setMode("view");
    setCodeEdit(false);
  }
  function removeSelected() {
    if (!selected) return;
    if (!confirm("정말 삭제하시겠어요?")) return;
    setRows((prev) => prev.filter((r) => r.id !== selected.id));
    setSelected(null);
    setDraft(null);
  }
  function addNew() {
    const nid = `L-${Date.now()}`;
    const defaultDeal: DealType = "월세";
    const item: Listing = {
      id: nid,
      createdAt: new Date().toISOString().slice(0,10),
      dealType: defaultDeal,
      code: nextCode(defaultDeal, rows),
      address: "",
      type: "아파트",
      status: "공개",
      agent: "김부장",
      vacant: true,
      pets: false,
      flags: {},
      parkingOk: false,
      elevator: false,
      occupancyLabel: "이사가능일",
      lessorPhone: "010-"  // 기본값
    };
    setRows((p) => [item, ...p]);
    openEdit(item);
    setMode("edit");
  }

  const ALL_OPTIONS = ["복층","급매","세안고","풀옵션","올수리"];

  return (
    <div className="max-w-none w-full mx-auto px-6 py-6 space-y-4">
      {/* 상단바 */}
      <div className="flex items-center gap-3">
        <button className="border px-3 py-2 rounded-lg" onClick={() => history.back()}>← 뒤로가기</button>
        <h1 className="flex-1 text-center text-2xl font-bold">매물관리</h1>
        <div className="flex items-center gap-2">
          <button className="border px-3 py-2 rounded-lg" onClick={() => setShowDetail(true)}>상세검색</button>
          {(["월세","전세","매매"] as const).map(t => (
            <button
              key={t}
              className={`px-3 py-2 rounded-lg border ${book===t ? "bg-blue-600 text-white border-blue-600" : ""}`}
              onClick={() => setBook(book===t ? "전체" : t)}
            >
              {t}매물장
            </button>
          ))}
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
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="주소검색"
            className="border rounded-lg px-3 py-2 w-[360px] outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* 표 */}
      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>날짜</th><th>담당</th><th>코드번호</th><th>거래유형</th>
              <th>건물유형</th><th>임대료(만원)</th><th>세입자정보</th><th>주소</th>
              <th>전용면적</th><th>방/욕</th><th>엘베</th><th>주차</th>
              <th>임대/임차인</th><th>연락처</th><th>임대사업자</th><th>비고</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tint = rowTint(r);
              return (
                <tr key={r.id} className={`border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${tint}`} onClick={() => openEdit(r)}>
                  <td className="px-3 py-2">{fmt(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.agent ?? "-"}</td>
                  <td className="px-3 py-2">{r.code ?? "-"}</td>
                  <td className="px-3 py-2">{r.dealType ?? "-"}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{won(r.deposit)} / {won(r.rent)} / {won(r.maintenanceFee)}</td>
                  <td className="px-3 py-2">
                    <div>{tenantLabel(r)}</div>
                    {!r.vacant && r.moveInDate && (
                      <div className="text-xs text-gray-500">{prettyMoveIn(r)}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.address}</div>
                    <div className="text-xs text-gray-500">
                      {r.buildingName ?? "-"} {r.dong ? `· ${r.dong}동` : ""} {r.ho ? `${r.ho}호` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.areaExclusive ?? "-"}㎡ ({pyeong(r.areaExclusive)}평)</td>
                  <td className="px-3 py-2">{r.rooms ?? 0} / {r.baths ?? 0}</td>
                  <td className="px-3 py-2">{r.elevator ? "Y" : "N"}</td>
                  <td className="px-3 py-2">{r.parkingOk==null ? "-" : (r.parkingOk ? "가능" : "불가")}</td>
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
              );
            })}
            {filtered.length === 0 && (
              <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={16}>조건에 맞는 매물이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 상세검색: 그대로 유지(생략) */}

      {/* 오른쪽 수정 패널 */}
      {selected && draft && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[900px] max-w-full h-full bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">매물 정보</h2>
              <div className="flex items-center gap-2">
                <button className="border px-3 py-2 rounded-lg" onClick={() => { setSelected(null); setDraft(null); }}>← 뒤로가기</button>
                <button className="border border-red-500 text-red-600 px-3 py-2 rounded-lg" onClick={removeSelected}>삭제</button>

                {/* 보기모드에서만 '수정' 표시, 편집모드에서는 같은 자리를 비워 spacing 유지 */}
                {mode === "view" ? (
                  <button className="border px-3 py-2 rounded-lg" onClick={() => setMode("edit")}>수정</button>
                ) : (
                  <div className="w-[76px]" /> /* 자리 유지용 */
                )}

                <button className={`px-3 py-2 rounded-lg ${mode === "edit" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`} disabled={mode !== "edit"} onClick={saveDraft}>저장</button>
              </div>
            </div>

            {/* 폼 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="날짜">
                <input className="input" type="date" disabled={mode === "view"} value={draft.createdAt ?? ""} onChange={(e) => update("createdAt", e.target.value)} />
              </Field>

              <Field label="담당">
                <select className="input" disabled={mode === "view"} value={draft.agent ?? "김부장"} onChange={(e)=>update("agent", e.target.value as Agent)}>
                  {AGENTS.map(a=> <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>

              <Field label="거래유형">
                <select
                  className="input"
                  disabled={mode === "view"}
                  value={draft.dealType ?? "월세"}
                  onChange={(e)=>{
                    const dt = e.target.value as DealType;
                    update("dealType", dt);
                    update("code", nextCode(dt, rows));
                  }}
                >
                  <option>월세</option><option>전세</option><option>매매</option>
                </select>
              </Field>

              <Field label={<span>코드번호 <button type="button" className="text-xs underline ml-1" disabled={mode!=="edit"} onClick={()=>setCodeEdit(v=>!v)}>{codeEdit? "수정완료":"수정"}</button></span>}>
                <input className="input" disabled={mode!=="edit" || !codeEdit} value={draft.code ?? ""} onChange={(e)=>update("code", e.target.value)} />
              </Field>

              <Field label="건물유형">
                <select className="input" disabled={mode === "view"} value={draft.type} onChange={(e)=>update("type", e.target.value as ListingType)}>
                  {["아파트","오피스텔","단독/다가구","빌라/다세대","상가주택","상가","사무실","토지"].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="주소">
                <input className="input" disabled={mode === "view"} value={draft.address ?? ""} onChange={(e) => update("address", e.target.value)} />
              </Field>

              {/* 동/층수/호 (순서 변경) */}
              <Field label="동 / 층수 / 호">
                <div className="flex gap-2">
                  <input className="input w-24" placeholder="동" disabled={mode === "view"} value={draft.dong ?? ""} onChange={(e)=>update("dong", e.target.value)} />
                  <input className="input w-24" placeholder="층" type="number" disabled={mode === "view"} value={draft.floor ?? ""} onChange={(e)=>update("floor", Number(e.target.value))} />
                  <input className="input w-24" placeholder="호" disabled={mode === "view"} value={draft.ho ?? ""} onChange={(e)=>update("ho", e.target.value)} />
                </div>
              </Field>

              <Field label="전용면적(㎡)">
                <div>
                  <input className="input" type="number" step="0.01" disabled={mode === "view"} value={draft.areaExclusive ?? ""} onChange={(e)=>update("areaExclusive", e.target.value===""?undefined:Number(e.target.value))} />
                  <div className="text-xs text-gray-500 mt-1">{draft.areaExclusive ? `≈ ${(draft.areaExclusive*0.3025).toFixed(1)} 평` : "㎡ 입력 시 평 자동계산"}</div>
                </div>
              </Field>

              {/* 임대료 */}
              <Field label="임대료 (만원) — 보증 / 월세 / 관리비">
                <div className="flex gap-2">
                  <input className="input" type="number" placeholder="보증" disabled={mode === "view"} value={draft.deposit ?? 0} onChange={(e)=>update("deposit", Number(e.target.value))} />
                  <input className="input" type="number" placeholder="월세" disabled={mode === "view"} value={draft.rent ?? 0} onChange={(e)=>update("rent", Number(e.target.value))} />
                  <input className="input" type="number" placeholder="관리비" disabled={mode === "view"} value={draft.maintenanceFee ?? 0} onChange={(e)=>update("maintenanceFee", Number(e.target.value))} />
                </div>
                <input className="input mt-2" disabled={mode === "view"} placeholder="(관리비포함사항 수기입력)" value={draft.maintenanceNote ?? ""} onChange={(e)=>update("maintenanceNote", e.target.value)} />
              </Field>

              {/* 방/욕 */}
              <Field label="방 / 욕">
                <div className="flex gap-2">
                  <input className="input" type="number" disabled={mode === "view"} value={draft.rooms ?? 0} onChange={(e)=>update("rooms", Number(e.target.value))} />
                  <input className="input" type="number" disabled={mode === "view"} value={draft.baths ?? 0} onChange={(e)=>update("baths", Number(e.target.value))} />
                </div>
              </Field>

              {/* 세입자정보 */}
              <Field label="세입자정보">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!draft.vacant} disabled={mode === "view"} onChange={(e)=>update("vacant", e.target.checked)} />
                    <span>공실</span>
                  </label>

                  {!draft.vacant && (
                    <>
                      <select
                        className="input w-40"
                        disabled={mode === "view"}
                        value={draft.occupancyLabel ?? "이사가능일"}
                        onChange={(e)=>update("occupancyLabel", e.target.value as Listing["occupancyLabel"])}
                      >
                        <option>세입자만기일</option>
                        <option>이사가능일</option>
                      </select>

                      <input
                        className="input"
                        type="date"
                        disabled={mode === "view"}
                        value={draft.moveInDate ?? ""}
                        onChange={(e)=>update("moveInDate", e.target.value)}
                      />

                      <div className="flex items-center gap-3 text-xs select-none">
                        {(["초순","중순","하순"] as MoveInQualifier[]).map(tag => (
                          <label key={tag} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              disabled={mode === "view"}
                              checked={draft.moveInQualifier === tag}
                              onChange={()=>{
                                update("moveInQualifier", draft.moveInQualifier===tag ? undefined : tag);
                              }}
                              style={{width:12,height:12}}
                            />
                            <span>{tag}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </Field>

              {/* 연락처: 가로 1줄 (이름 좁게, 연락처 넓게), 010- 자동포맷 */}
              <Field label="임대인">
                <div className="flex gap-2">
                  <input
                    className="input w-2/5"
                    placeholder="ex) 성함,별칭"
                    disabled={mode === "view"}
                    value={draft.lessorName ?? ""}
                    onChange={(e)=>update("lessorName", e.target.value)}
                  />
                  <PhoneInput
                    className="input flex-1"
                    placeholder="0000-0000"
                    disabled={mode === "view"}
                    value={draft.lessorPhone}
                    onChange={(v)=>update("lessorPhone", v)}
                  />
                </div>
              </Field>

              <Field label="임차인">
                <div className="flex gap-2">
                  <input
                    className="input w-2/5"
                    placeholder="ex) 성함,별칭"
                    disabled={mode === "view"}
                    value={draft.lesseeName ?? ""}
                    onChange={(e)=>update("lesseeName", e.target.value)}
                  />
                  <PhoneInput
                    className="input flex-1"
                    placeholder="0000-0000"
                    disabled={mode === "view"}
                    value={draft.lesseePhone}
                    onChange={(v)=>update("lesseePhone", v)}
                  />
                </div>
              </Field>

              <Field label="관리자(표시 안함)">
                <div className="flex gap-2">
                  <input
                    className="input w-2/5"
                    placeholder="ex) 성함,별칭"
                    disabled={mode === "view"}
                    value={draft.managerName ?? ""}
                    onChange={(e)=>update("managerName", e.target.value)}
                  />
                  <PhoneInput
                    className="input flex-1"
                    placeholder="0000-0000"
                    disabled={mode === "view"}
                    value={draft.managerPhone}
                    onChange={(v)=>update("managerPhone", v)}
                  />
                </div>
              </Field>

              <div className="col-span-2 border-t pt-2" />

              {/* 체크박스 묶음 */}
              <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!draft.parkingOk} onChange={(e)=>update("parkingOk", e.target.checked)} />
                  <span>주차가능</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!draft.pets} onChange={(e)=>update("pets", e.target.checked)} />
                  <span>반려동물</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!draft.elevator} onChange={(e)=>update("elevator", e.target.checked)} />
                  <span>엘리베이터</span>
                </label>

                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!(draft.options??[]).includes("풀옵션")} onChange={()=>toggleOption("풀옵션")} />
                  <span>풀옵션</span>
                </label>

                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!draft.flags?.lhsh} onChange={(e)=>updateFlags("lhsh", e.target.checked)} />
                  <span>LH·SH</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!draft.flags?.hug} onChange={(e)=>updateFlags("hug", e.target.checked)} />
                  <span>HUG</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!draft.flags?.hf} onChange={(e)=>updateFlags("hf", e.target.checked)} />
                  <span>HF</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!draft.flags?.insurance} onChange={(e)=>updateFlags("insurance", e.target.checked)} />
                  <span>보증보험</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={mode === "view"} checked={!!draft.flags?.biz} onChange={(e)=>updateFlags("biz", e.target.checked)} />
                  <span>주택임대사업자</span>
                </label>
              </div>

              <div className="col-span-2">
                <Field label="비고(알아야될 정보 + 특징)">
                  <textarea className="input h-24" disabled={mode === "view"} value={draft.memo ?? ""} onChange={(e)=>update("memo", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.75rem; outline: none; }
        .input:focus { box-shadow: 0 0 0 2px rgba(59,130,246,0.4); border-color:#93c5fd; }
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

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode; }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
