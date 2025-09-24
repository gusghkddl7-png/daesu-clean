"use client";

import React, { useMemo, useState } from "react";

/** 담당자 고정 */
const AGENTS = ["김부장","김과장","강실장","소장","공동","프리중"] as const;
type Agent = typeof AGENTS[number];

type DealType = "월세" | "전세" | "매매";
type ListingType =
  | "아파트" | "오피스텔"
  | "단독/다가구" | "빌라/다세대"
  | "상가" | "상가주택" | "사무실"
  | "토지";

type MoveInPeriod = "초순" | "중순" | "하순" | "";

export interface Listing {
  id: string;
  createdAt: string;
  dealType: DealType;
  code?: string;

  address: string;
  buildingName?: string;
  dong?: string;
  floor?: number;
  ho?: string;
  type: ListingType;

  areaExclusive?: number;  // ㎡
  rooms?: number;
  baths?: number;

  deposit?: number;        // 만원
  rent?: number;           // 만원
  maintenanceFee?: number; // 만원
  maintenanceNote?: string;// 표에는 안 보임

  elevator?: boolean;
  parking?: "가능" | "불가" | "문의";
  options?: string[];      // ["복층","급매","세안고","풀옵션","올수리"]

  vacant: boolean;
  moveInDate?: string;     // YYYY-MM-DD
  moveInPeriod?: MoveInPeriod;

  memo?: string;

  agent?: Agent;
  status: "공개" | "비공개" | "거래중" | "거래완료";

  // 연락처(목록엔 임대/임차만 노출)
  lessorName?: string;   lessorPhone?: string;
  lesseeName?: string;   lesseePhone?: string;
  managerName?: string;  managerPhone?: string;

  // 플래그
  pets?: boolean;
  flags?: {
    lhsh?: boolean; hug?: boolean; hf?: boolean;
    insurance?: boolean; biz?: boolean;
  };
}

/* 샘플 */
const SEED: Listing[] = [
  {
    id: "L-1",
    createdAt: "2025-09-05",
    dealType: "월세",
    code: "BO-0009",
    address: "서울 강동구 천호동 166-82",
    buildingName: "대수타워",
    dong: "101", floor: 12, ho: "1203",
    type: "오피스텔",
    areaExclusive: 44.2, rooms: 1, baths: 1,
    deposit: 1000, rent: 65, maintenanceFee: 7,
    elevator: true, parking: "가능",
    options: ["풀옵션"],
    vacant: true,
    memo: "즉시입주, 로열층",
    agent: "김부장", status: "공개",
    lessorName: "홍길동", lessorPhone: "010-1234-5678",
    flags: { biz:false, lhsh:false, hf:false, hug:false, insurance:false },
  },
  {
    id: "L-2",
    createdAt: "2025-08-28",
    dealType: "월세",
    code: "BO-0002",
    address: "서울 강동구 길동 123-45",
    buildingName: "길동리버뷰",
    type: "아파트",
    areaExclusive: 84.97, rooms: 3, baths: 2,
    floor: 7,
    deposit: 3000, rent: 120, maintenanceFee: 12,
    elevator: true, parking: "가능",
    options: ["반려동물","풀옵션"],
    vacant: false, moveInDate: "2025-09-15", moveInPeriod: "중순",
    memo: "거래중, 9/15 퇴거예정",
    agent: "김부장", status: "거래중",
    lessorName: "김임대", lessorPhone: "010-2222-3333",
    lesseeName: "박차임", lesseePhone: "010-4444-5555",
    flags: { biz:true, lhsh:false, hf:false, hug:true, insurance:true },
  },
  {
    id: "L-3",
    createdAt: "2025-07-15",
    dealType: "월세",
    code: "BO-0003",
    address: "서울 강동구 성내동 55-3",
    buildingName: "성내스퀘어",
    type: "상가",
    areaExclusive: 23.1, rooms: 0, baths: 1,
    floor: 1,
    deposit: 2000, rent: 180,
    elevator: false, parking: "문의",
    options: ["올수리"],
    vacant: true,
    memo: "노출천장, 코너",
    agent: "소장", status: "비공개",
    managerName: "관리리", managerPhone: "010-7777-8888",
    flags: { biz:false, lhsh:false, hf:false, hug:false, insurance:false },
  },
];

const won = (n?: number) => (n == null ? "-" : n.toLocaleString("ko-KR"));
const pyeong = (m2?: number) => (m2 == null ? "-" : (m2 * 0.3025).toFixed(1));
const clsx = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");

function rowTint(r: Listing) {
  if (r.status === "거래완료") return "bg-black text-white/70";
  if ((r.agent ?? "").includes("공동")) return "bg-green-50";
  if ((r.agent ?? "").includes("김부장")) return "bg-blue-50";
  if ((r.agent ?? "").includes("김과장")) return "bg-yellow-50";
  if ((r.agent ?? "").includes("강실장")) return "bg-pink-50";
  return "";
}
function tenantInfo(r: Listing) {
  if (r.vacant) return "공실";
  if (!r.vacant) {
    if (r.moveInDate) {
      if (r.moveInPeriod && r.moveInDate.length >= 7) {
        const ym = r.moveInDate.slice(0, 7).replace("-", ".");
        return `이사가능일 ${ym} ${r.moveInPeriod}`;
      }
      return `이사가능일 ${r.moveInDate}`;
    }
    return "거주중";
  }
  return "공실";
}

/** 코드 자동부여 */
function nextCode(rows: Listing[], dealType: DealType) {
  const prefix = dealType === "월세" ? "BO" : dealType === "전세" ? "BL" : "BM";
  const max = rows.reduce((acc, r) => {
    if (!r.code) return acc;
    const m = r.code.match(/^([A-Z]{2})-(\d{4})$/);
    if (!m) return acc;
    if (m[1] !== prefix) return acc;
    const num = Number(m[2]);
    return Math.max(acc, num);
  }, 0);
  const n = (max + 1).toString().padStart(4, "0");
  return `${prefix}-${n}`;
}

/** 전화번호 입력 포맷(010- + 8자리, 4자리 후 하이픈) */
function usePhoneFormatter(setter: (v: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, "");
    let tail = onlyDigits.replace(/^010/, "");
    if (tail.length > 8) tail = tail.slice(0, 8);
    let formatted = "010-";
    if (tail.length <= 4) formatted += tail;
    else formatted += tail.slice(0, 4) + "-" + tail.slice(4);
    setter(formatted);
  };
}

/** 상세검색 상태 */
type DetailFilter = {
  priceMin?: number; priceMax?: number;      // 월세 기준(임대료 전체 보려면 공백)
  depositMin?: number; depositMax?: number;  // 보증
  areaMin?: number; areaMax?: number;        // ㎡
  roomsMin?: number;
  parking?: "가능" | "불가" | "문의" | "";
  options?: string[]; // ["복층","급매","세안고","풀옵션","올수리"]
  pets?: boolean;
};

type Tab = "전체" | "월세" | "전세" | "매매";

export default function ListingsPage() {
  const [tab, setTab] = useState<Tab>("전체");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Listing[]>(SEED);
  const [vacantOnly, setVacantOnly] = useState(false);

  const [selected, setSelected] = useState<Listing | null>(null);
  const [draft, setDraft] = useState<Listing | null>(null);

  const [showDetail, setShowDetail] = useState(false);
  const [df, setDf] = useState<DetailFilter>({ options: [] });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "전체" && r.dealType !== tab) return false;
      if (vacantOnly && !r.vacant) return false;

      // 상세검색
      if (df.priceMin != null && (r.rent ?? 0) < df.priceMin) return false;
      if (df.priceMax != null && (r.rent ?? 0) > df.priceMax) return false;
      if (df.depositMin != null && (r.deposit ?? 0) < df.depositMin) return false;
      if (df.depositMax != null && (r.deposit ?? 0) > df.depositMax) return false;
      if (df.areaMin != null && (r.areaExclusive ?? 0) < df.areaMin) return false;
      if (df.areaMax != null && (r.areaExclusive ?? 0) > df.areaMax) return false;
      if (df.roomsMin != null && (r.rooms ?? 0) < df.roomsMin) return false;
      if (df.parking && (r.parking ?? "") !== df.parking) return false;
      if (df.pets && !r.pets) return false;
      if (df.options && df.options.length) {
        const hasAll = df.options.every((o) => r.options?.includes(o));
        if (!hasAll) return false;
      }

      const hay = `${r.address} ${r.buildingName ?? ""} ${r.dong ?? ""} ${r.ho ?? ""} ${r.agent ?? ""} ${r.memo ?? ""}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [rows, tab, vacantOnly, q, df]);

  function openNew() {
    const base: Listing = {
      id: "L-" + Date.now(),
      createdAt: new Date().toISOString().slice(0,10),
      dealType: "월세",
      code: "", // 저장 시 자동
      address: "",
      type: "아파트",
      vacant: true,
      status: "공개",
      agent: "김부장",
      parking: "문의",
      elevator: false,
      pets: false,
      flags: {}
    };
    setSelected(base);
    setDraft(base);
  }
  function openEdit(r: Listing) {
    setSelected(r);
    setDraft({ ...r });
  }
  function closePanel() {
    setSelected(null);
    setDraft(null);
  }
  function save() {
    if (!draft) return;
    const copy = { ...draft };

    // 코드 자동부여(비어있으면)
    if (!copy.code) copy.code = nextCode(rows, copy.dealType);

    setRows((prev) => {
      const i = prev.findIndex((p) => p.id === copy.id);
      if (i === -1) return [copy, ...prev];
      const arr = [...prev]; arr[i] = copy; return arr;
    });
    setSelected(copy);
    setDraft(copy);
  }
  function remove() {
    if (!selected) return;
    if (!confirm("정말 삭제할까요?")) return;
    setRows((prev) => prev.filter((p) => p.id !== selected.id));
    closePanel();
  }

  return (
    <div className="max-w-screen-2xl w-full mx-auto px-6 py-6 space-y-4">
      {/* Top */}
      <div className="flex items-center gap-2">
        <button className="border rounded-lg px-3 py-2" onClick={() => history.back()}>← 뒤로가기</button>
        <h1 className="flex-1 text-center text-2xl font-bold">매물관리</h1>
        <div className="flex items-center gap-2">
          {(["월세","전세","매매"] as DealType[]).map((d) => (
            <button
              key={d}
              className={clsx("border rounded-lg px-3 py-2", tab===d && "bg-gray-900 text-white")}
              onClick={() => setTab(d)}
            >
              {d}매물장
            </button>
          ))}
          <button className="border rounded-lg px-3 py-2" onClick={()=>setShowDetail(true)}>상세검색</button>
          <button className="bg-blue-600 text-white rounded-lg px-3 py-2" onClick={openNew}>+ 매물등록</button>
        </div>
      </div>

      {/* 필터 줄 */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={vacantOnly} onChange={(e)=>setVacantOnly(e.target.checked)} />
          <span>공실만</span>
        </label>
        <div className="ml-auto flex items-center gap-3">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="주소·메모 검색"
            className="border rounded-lg px-3 py-2 w-[340px] outline-none focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-gray-500 text-sm">표시 {filtered.length}건 / 전체 {rows.length}건</span>
        </div>
      </div>

      {/* 표 */}
      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>날짜</th>
              <th>담당</th>
              <th>코드</th>
              <th>거래</th>
              <th>주소</th>
              <th>전용(㎡/평)</th>
              <th>방/욕</th>
              <th>보증/월세/관리비</th>
              <th>세입자정보</th>
              <th>주차</th>
              <th>옵션</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r)=>(
              <tr key={r.id} className={clsx("border-b last:border-b-0 cursor-pointer hover:bg-gray-50", rowTint(r))} onClick={()=>openEdit(r)}>
                <td className="px-3 py-2">{r.createdAt}</td>
                <td className="px-3 py-2">{r.agent ?? "-"}</td>
                <td className="px-3 py-2">{r.code ?? "-"}</td>
                <td className="px-3 py-2">{r.dealType}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.address}</div>
                  <div className="text-xs text-gray-500">
                    {r.buildingName ?? "-"} {r.dong ? `· ${r.dong}동` : ""} {r.floor ? `${r.floor}층` : ""} {r.ho ? `${r.ho}호` : ""}
                  </div>
                </td>
                <td className="px-3 py-2">{r.areaExclusive ?? "-"}㎡ ({pyeong(r.areaExclusive)}평)</td>
                <td className="px-3 py-2">{r.rooms ?? 0} / {r.baths ?? 0}</td>
                <td className="px-3 py-2">{won(r.deposit)} / {won(r.rent)} / {won(r.maintenanceFee)}</td>
                <td className="px-3 py-2">
                  <div>{tenantInfo(r)}</div>
                </td>
                <td className="px-3 py-2">{r.parking ?? "-"}</td>
                <td className="px-3 py-2 text-xs">
                  {r.elevator ? "엘베 " : ""}{r.pets ? "반려동물 " : ""}{(r.options ?? []).join(" ")}
                </td>
                <td className="px-3 py-2"><div className="clamp2">{r.memo ?? "-"}</div></td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={12}>조건에 맞는 매물이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 상세검색 패널 */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={()=>setShowDetail(false)}>
          <div className="w-[420px] h-full bg-white p-5 space-y-4" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-bold">상세검색</div>

            {/* 핵심(바로 입력) */}
            <div className="space-y-3">
              <label className="block text-sm text-gray-600">월세(만원)</label>
              <div className="flex gap-2">
                <input className="input" type="number" placeholder="최소" value={df.priceMin ?? ""} onChange={(e)=>setDf(p=>({...p,priceMin:e.target.value===""?undefined:Number(e.target.value)}))}/>
                <input className="input" type="number" placeholder="최대" value={df.priceMax ?? ""} onChange={(e)=>setDf(p=>({...p,priceMax:e.target.value===""?undefined:Number(e.target.value)}))}/>
              </div>

              <label className="block text-sm text-gray-600">보증금(만원)</label>
              <div className="flex gap-2">
                <input className="input" type="number" placeholder="최소" value={df.depositMin ?? ""} onChange={(e)=>setDf(p=>({...p,depositMin:e.target.value===""?undefined:Number(e.target.value)}))}/>
                <input className="input" type="number" placeholder="최대" value={df.depositMax ?? ""} onChange={(e)=>setDf(p=>({...p,depositMax:e.target.value===""?undefined:Number(e.target.value)}))}/>
              </div>

              <label className="block text-sm text-gray-600">면적(㎡)</label>
              <div className="flex gap-2">
                <input className="input" type="number" placeholder="최소" value={df.areaMin ?? ""} onChange={(e)=>setDf(p=>({...p,areaMin:e.target.value===""?undefined:Number(e.target.value)}))}/>
                <input className="input" type="number" placeholder="최대" value={df.areaMax ?? ""} onChange={(e)=>setDf(p=>({...p,areaMax:e.target.value===""?undefined:Number(e.target.value)}))}/>
              </div>

              <label className="block text-sm text-gray-600">방 갯수 (이상)</label>
              <input className="input" type="number" value={df.roomsMin ?? ""} onChange={(e)=>setDf(p=>({...p,roomsMin:e.target.value===""?undefined:Number(e.target.value)}))}/>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!df.pets} onChange={(e)=>setDf(p=>({...p,pets:e.target.checked}))}/><span>반려동물</span></label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">주차</span>
                  <select className="input" value={df.parking ?? ""} onChange={(e)=>setDf(p=>({...p,parking:e.target.value as any}))}>
                    <option value="">전체</option><option>가능</option><option>불가</option><option>문의</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">옵션</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {["복층","급매","세안고","풀옵션","올수리"].map(o=>(
                    <label key={o} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!df.options?.includes(o)}
                        onChange={(e)=>{
                          setDf(p=>{
                            const set = new Set(p.options ?? []);
                            if (e.target.checked) set.add(o); else set.delete(o);
                            return {...p, options: Array.from(set)};
                          });
                        }}
                      />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button className="border rounded-lg px-3 py-2" onClick={()=>setDf({ options: [] })}>초기화</button>
                <button className="bg-blue-600 text-white rounded-lg px-3 py-2" onClick={()=>setShowDetail(false)}>적용</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 오른쪽 수정 패널 */}
      {selected && draft && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[900px] max-w-full h-full bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">매물 정보</h2>
              <div className="flex items-center gap-2">
                <button className="border rounded-lg px-3 py-2" onClick={closePanel}>← 뒤로가기</button>
                <button className="border border-red-500 text-red-600 rounded-lg px-3 py-2" onClick={remove}>삭제</button>
                <button className="bg-blue-600 text-white rounded-lg px-3 py-2" onClick={save}>저장</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="날짜">
                <input className="input" type="date" value={draft.createdAt} onChange={(e)=>setDraft({...draft,createdAt:e.target.value})}/>
              </Field>

              <Field label="담당">
                <select className="input" value={draft.agent ?? "김부장"} onChange={(e)=>setDraft({...draft,agent:e.target.value as Agent})}>
                  {AGENTS.map(a=> <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>

              <Field label="거래유형">
                <select
                  className="input"
                  value={draft.dealType}
                  onChange={(e)=>{
                    const dt = e.target.value as DealType;
                    setDraft((d)=>{
                      const next = {...(d as Listing), dealType: dt};
                      // 코드가 비어있으면 미리 미리 만들어 줌(저장 시에도 한번 더 보정)
                      if (!next.code) next.code = nextCode(rows, dt);
                      return next;
                    });
                  }}
                >
                  <option>월세</option><option>전세</option><option>매매</option>
                </select>
              </Field>

              <Field label="코드번호">
                <div className="flex gap-2">
                  <input className="input flex-1" value={draft.code ?? ""} readOnly />
                  <button
                    className="border rounded-lg px-3 py-2"
                    onClick={()=>setDraft((d)=> ({...(d as Listing), code: ""}))}
                    title="수정(초기화) → 저장 시 자동부여"
                  >
                    수정
                  </button>
                </div>
              </Field>

              <Field label="건물유형">
                <select className="input" value={draft.type} onChange={(e)=>setDraft({...draft, type: e.target.value as ListingType})}>
                  {["아파트","오피스텔","단독/다가구","빌라/다세대","상가","상가주택","사무실","토지"].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="주소">
                <input className="input" value={draft.address} onChange={(e)=>setDraft({...draft,address:e.target.value})}/>
              </Field>

              {/* 동 / 층수 / 호 (순서 고정) */}
              <Field label="동 / 층수 / 호">
                <div className="flex gap-2">
                  <input className="input w-28" placeholder="동" value={draft.dong ?? ""} onChange={(e)=>setDraft({...draft,dong:e.target.value})}/>
                  <input className="input w-28" type="number" placeholder="층" value={draft.floor ?? "" as any} onChange={(e)=>setDraft({...draft,floor: e.target.value===""?undefined:Number(e.target.value)})}/>
                  <input className="input w-28" placeholder="호" value={draft.ho ?? ""} onChange={(e)=>setDraft({...draft,ho:e.target.value})}/>
                </div>
              </Field>

              <Field label="전용면적(㎡)">
                <div>
                  <input className="input" type="number" step="0.01" value={draft.areaExclusive ?? "" as any} onChange={(e)=>setDraft({...draft,areaExclusive:e.target.value===""?undefined:Number(e.target.value)})}/>
                  <div className="text-xs text-gray-500 mt-1">
                    {draft.areaExclusive ? `≈ ${(draft.areaExclusive*0.3025).toFixed(1)} 평` : "㎡ 입력 시 평 자동계산"}
                  </div>
                </div>
              </Field>

              <Field label="방 / 욕">
                <div className="flex gap-2">
                  <input className="input w-28" type="number" value={draft.rooms ?? 0} onChange={(e)=>setDraft({...draft,rooms:Number(e.target.value)})}/>
                  <input className="input w-28" type="number" value={draft.baths ?? 0} onChange={(e)=>setDraft({...draft,baths:Number(e.target.value)})}/>
                </div>
              </Field>

              <Field label="임대료(만원) — 보증 / 월세 / 관리비">
                <div className="grid grid-cols-3 gap-2">
                  <input className="input" type="number" value={draft.deposit ?? 0} onChange={(e)=>setDraft({...draft,deposit:Number(e.target.value)})}/>
                  <input className="input" type="number" value={draft.rent ?? 0} onChange={(e)=>setDraft({...draft,rent:Number(e.target.value)})}/>
                  <input className="input" type="number" value={draft.maintenanceFee ?? 0} onChange={(e)=>setDraft({...draft,maintenanceFee:Number(e.target.value)})}/>
                </div>
                <input
                  className="input mt-2"
                  placeholder="(관리비포함사항 수기입력)"
                  value={draft.maintenanceNote ?? ""}
                  onChange={(e)=>setDraft({...draft,maintenanceNote:e.target.value})}
                />
              </Field>

              {/* 세입자정보 */}
              <Field label="세입자정보">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={draft.vacant} onChange={(e)=>setDraft({...draft,vacant:e.target.checked})} />
                    <span>공실</span>
                  </label>

                  {!draft.vacant && (
                    <>
                      <input className="input w-40" type="date" value={draft.moveInDate ?? ""} onChange={(e)=>setDraft({...draft,moveInDate:e.target.value})}/>
                      <div className="flex items-center gap-3 text-sm">
                        {(["초순","중순","하순"] as MoveInPeriod[]).map(p=>(
                          <label key={p} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={draft.moveInPeriod===p}
                              onChange={(e)=>setDraft({...draft, moveInPeriod: e.target.checked ? p : "" })}
                            />
                            <span>{p}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </Field>

              {/* 연락처: 임대/임차/관리 (가로 한 줄: 성함 작게, 연락처 길게) */}
              <Field label="임대인">
                <div className="flex items-center gap-2">
                  <input className="input w-40" placeholder="ex) 성함,별칭" value={draft.lessorName ?? ""} onChange={(e)=>setDraft({...draft,lessorName:e.target.value})}/>
                  <input
                    className="input flex-1"
                    placeholder="0000 - 0000"
                    value={draft.lessorPhone ?? "010-"}
                    onFocus={()=>{ if(!draft.lessorPhone) setDraft({...draft, lessorPhone:"010-"}); }}
                    onChange={usePhoneFormatter((v)=>setDraft({...draft, lessorPhone:v }))}
                  />
                </div>
              </Field>

              <Field label="임차인">
                <div className="flex items-center gap-2">
                  <input className="input w-40" placeholder="ex) 성함,별칭" value={draft.lesseeName ?? ""} onChange={(e)=>setDraft({...draft,lesseeName:e.target.value})}/>
                  <input
                    className="input flex-1"
                    placeholder="0000 - 0000"
                    value={draft.lesseePhone ?? "010-"}
                    onFocus={()=>{ if(!draft.lesseePhone) setDraft({...draft, lesseePhone:"010-"}); }}
                    onChange={usePhoneFormatter((v)=>setDraft({...draft, lesseePhone:v }))}
                  />
                </div>
              </Field>

              <Field label="관리자(표시 안함)">
                <div className="flex items-center gap-2">
                  <input className="input w-40" placeholder="ex) 성함,별칭" value={draft.managerName ?? ""} onChange={(e)=>setDraft({...draft,managerName:e.target.value})}/>
                  <input
                    className="input flex-1"
                    placeholder="0000 - 0000"
                    value={draft.managerPhone ?? "010-"}
                    onFocus={()=>{ if(!draft.managerPhone) setDraft({...draft, managerPhone:"010-"}); }}
                    onChange={usePhoneFormatter((v)=>setDraft({...draft, managerPhone:v }))}
                  />
                </div>
              </Field>

              <div className="col-span-2 border-t pt-3" />

              {/* 하단 체크군(주차/엘리베이터/반려동물 + 보증/기관) */}
              <Field label="주차">
                <select className="input" value={draft.parking ?? "문의"} onChange={(e)=>setDraft({...draft, parking: e.target.value as any})}>
                  <option>가능</option><option>불가</option><option>문의</option>
                </select>
              </Field>
              <Field label="엘리베이터">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!draft.elevator} onChange={(e)=>setDraft({...draft,elevator:e.target.checked})}/>
                  <span>있음</span>
                </label>
              </Field>
              <Field label="반려동물">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!draft.pets} onChange={(e)=>setDraft({...draft,pets:e.target.checked})}/>
                  <span>가능</span>
                </label>
              </Field>
              <Field label="옵션">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {["복층","급매","세안고","풀옵션","올수리"].map(o=>(
                    <label key={o} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!draft.options?.includes(o)}
                        onChange={(e)=>{
                          const set = new Set(draft.options ?? []);
                          if (e.target.checked) set.add(o); else set.delete(o);
                          setDraft({...draft, options: Array.from(set)});
                        }}
                      />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <div className="col-span-2 grid grid-cols-2 gap-4">
                {[
                  ["LH·SH","lhsh"],
                  ["HUG","hug"],
                  ["HF","hf"],
                  ["보증보험","insurance"],
                  ["주택임대사업자","biz"],
                ].map(([label,key])=>(
                  <Field key={key} label={label}>
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={!!draft.flags?.[key as keyof NonNullable<Listing["flags"]>]}
                      onChange={(e)=>setDraft({...draft, flags:{...(draft.flags ?? {}), [key]: e.target.checked}})}
                    />
                  </Field>
                ))}
              </div>

              <div className="col-span-2">
                <Field label="비고(알아야될 정보 + 특징)">
                  <textarea className="input h-24" value={draft.memo ?? ""} onChange={(e)=>setDraft({...draft,memo:e.target.value})}/>
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input { @apply w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300; }
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

function Field({label, children}:{label:string; children:React.ReactNode}) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
