"use client";

import { useMemo, useState, useEffect } from "react";

/** 담당자 고정 옵션 */
const AGENTS = ["김부장","김과장","강실장","소장","공동","프리중"] as const;
type Agent = typeof AGENTS[number];

export type ListingStatus = "공개" | "비공개" | "거래중" | "거래완료";
export type ListingType =
  | "아파트" | "오피스텔" | "빌라" | "다세대" | "다가구" | "상가" | "사무실";

export interface Listing {
  id: string;
  createdAt: string;     // 날짜
  dealType?: "월세" | "전세" | "매매";
  code?: string;         // 코드번호
  address: string;
  buildingName?: string;
  dong?: string;
  ho?: string;
  type: ListingType;     // 건물유형
  areaExclusive?: number;// 전용(㎡)
  floor?: number;
  rooms?: number;        // 방
  baths?: number;        // 욕
  deposit?: number;      // 보증(만원)
  rent?: number;         // 월세(만원)
  maintenanceFee?: number; // 관리비(만원)
  parking?: "가능" | "불가" | "문의";
  elevator?: boolean;
  vacant?: boolean;      // 공실 여부
  moveInDate?: string;   // 이사가능일(거주중)
  memo?: string;         // 비고
  agent?: Agent;         // 담당
  status: ListingStatus; // 상태

  // 사람/연락처(표시)
  lessorName?: string;   // 임대인
  lessorPhone?: string;
  lesseeName?: string;   // 임차인
  lesseePhone?: string;

  // 관리자(목록에는 미표시)
  managerName?: string;
  managerPhone?: string;

  // 플래그(일부만 사용)
  flags?: {
    biz?: boolean;       // 주택임대사업자
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
    deposit: 1000, rent: 65, maintenanceFee: 7,
    parking: "가능", elevator: true,
    vacant: true, memo: "즉시입주, 로열층",
    agent: "강실장", status: "공개",
    lessorName: "홍길동", lessorPhone: "010-1234-5678",
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
    deposit: 3000, rent: 120, maintenanceFee: 12,
    parking: "가능", elevator: true,
    vacant: false, moveInDate: "2025-09-15",
    memo: "거래중, 9/15 퇴거예정",
    agent: "김부장", status: "거래중",
    lessorName: "김임대", lessorPhone: "010-2222-3333",
    lesseeName: "박차임", lesseePhone: "010-4444-5555",
    flags: { biz: true },
  },
  {
    id: "L-2025-0003",
    createdAt: "2025-07-15",
    dealType: "월세",
    code: "BO-0003",
    address: "서울 강동구 성내동 55-3",
    buildingName: "성내스퀘어",
    type: "상가",
    areaExclusive: 23.1, floor: 1, rooms: 0, baths: 1,
    deposit: 2000, rent: 180,
    parking: "문의", elevator: false,
    vacant: true, memo: "노출천장, 코너",
    agent: "소장", status: "비공개",
    managerName: "관리리", managerPhone: "010-7777-8888",
  },
];

/* 유틸 */
const won = (n?: number) => (n == null ? "-" : n.toLocaleString("ko-KR"));
const fmt = (d?: string) => (d ? d : "-");
const pyeong = (m2?: number) => (m2 == null ? "-" : (m2 * 0.3025).toFixed(1));
const clsx = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");

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
  if (!row.vacant && row.moveInDate) return "이사가능일";
  return "거주중";
}

type EditMode = "view" | "edit";

export default function ListingsPage() {
  // 검색/필터
  const [q, setQ] = useState("");
  const [vacantOnly, setVacantOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);

  // 데이터/선택/수정
  const [rows, setRows] = useState<Listing[]>(DATA0);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [mode, setMode] = useState<EditMode>("view");
  const [draft, setDraft] = useState<Listing | null>(null);

  // 관심(즐겨찾기) — 로컬 저장
  const USER_KEY = "anon";
  const FAV_LS_KEY = `ds:listings:fav:v1:${USER_KEY}`;
  const [favs, setFavs] = useState<string[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(FAV_LS_KEY) : null;
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  useEffect(() => {
    try { localStorage.setItem(FAV_LS_KEY, JSON.stringify(favs)); } catch {}
  }, [favs]);

  function toggleFav(id: string, on?: boolean) {
    setFavs((prev) => {
      const has = prev.includes(id);
      const willOn = on == null ? !has : on;
      if (willOn && !has) return [id, ...prev];
      if (!willOn && has) return prev.filter((x) => x !== id);
      return prev;
    });
  }

  // 검색 + 필터
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (vacantOnly && !r.vacant) return false;
      if (hideCompleted && r.status === "거래완료") return false;

      const hay = [
        r.address, r.buildingName, r.dong, r.ho, r.agent, r.memo,
        r.code, r.dealType, r.type,
        r.lessorName, r.lesseeName, r.managerName,
        r.lessorPhone, r.lesseePhone, r.managerPhone,
        (r.deposit != null ? String(r.deposit) : ""),
        (r.rent != null ? String(r.rent) : ""),
        (r.maintenanceFee != null ? String(r.maintenanceFee) : "")
      ].filter(Boolean).join(" ").toLowerCase();
      const hay2 = hay.replace(/[-\s]/g, "");
      const q2 = query.replace(/[-\s]/g, "");

      return hay.includes(query) || hay2.includes(q2);
    });
  }, [q, rows, vacantOnly, hideCompleted]);

  const favFiltered = useMemo(
    () => filtered.filter((r) => favs.includes(r.id)),
    [filtered, favs]
  );

  function openEdit(row: Listing) {
    setSelected(row);
    setDraft({ ...row });
    setMode("view");
  }
  function update<K extends keyof Listing>(key: K, val: Listing[K]) {
    if (!draft) return;
    setDraft({ ...draft, [key]: val });
  }
  function saveDraft() {
    if (!draft) return;
    setRows((prev) => prev.map((r) => (r.id === draft.id ? { ...draft } : r)));
    setSelected({ ...draft });
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
    const nid = `L-${Date.now()}`;
    const item: Listing = {
      id: nid, createdAt: new Date().toISOString().slice(0,10),
      dealType: "월세", code: "", address: "", type: "아파트", status: "공개",
      agent: "김부장", vacant: true
    };
    setRows((p) => [item, ...p]);
    openEdit(item);
    setMode("edit");
  }

  return (
    <div className="max-w-[1340px] mx-auto px-6 py-6 space-y-4">
      {/* 상단바 */}
      <div className="flex items-center gap-3">
        <button className="border px-3 py-2 rounded-lg" onClick={() => history.back()}>← 뒤로가기</button>
        <h1 className="flex-1 text-center text-2xl font-bold">매물관리</h1>
        <div className="flex items-center gap-2">
          <button className="border px-3 py-2 rounded-lg">상세검색</button>
          <button className="border px-3 py-2 rounded-lg">월세매물장</button>
          <button className="border px-3 py-2 rounded-lg">전세매물장</button>
          <button className="border px-3 py-2 rounded-lg">매매매물장</button>
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
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="주소/코드/이름/전화 검색"
            className="border rounded-lg px-3 py-2 w-[320px] outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* 관심매물 섹션(복사 표시) */}
      {favFiltered.length > 0 && (
        <div className="border rounded-xl overflow-x-auto">
          <div className="px-3 py-2 text-sm font-semibold bg-amber-50 border-b">관심매물 {favFiltered.length}건</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                <th className="w-10 text-center">★</th>
                <th>날짜</th>
                <th>담당</th>
                <th>코드번호</th>
                <th>거래유형</th>
                <th>건물유형</th>
                <th>임대료(만원)</th>
                <th>세입자정보</th>
                <th>주소</th>
                <th>전용면적</th>
                <th>방/욕</th>
                <th>엘베</th>
                <th>주차</th>
                <th>임대/임차인</th>
                <th>연락처</th>
                <th>임대사업자</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {favFiltered.map((r) => {
                const tint = rowTint(r);
                return (
                  <tr
                    key={`fav-${r.id}`}
                    className={clsx("border-b last:border-b-0 cursor-pointer hover:bg-gray-50", tint)}
                    onClick={() => openEdit(r)}
                  >
                    <td className="px-3 py-2 text-center" onClick={(e)=>e.stopPropagation()}>
                      <input type="checkbox" checked={favs.includes(r.id)} onChange={(e)=>toggleFav(r.id, e.target.checked)} />
                    </td>
                    <td className="px-3 py-2">{fmt(r.createdAt)}</td>
                    <td className="px-3 py-2">{r.agent ?? "-"}</td>
                    <td className="px-3 py-2">{r.code ?? "-"}</td>
                    <td className="px-3 py-2">{r.dealType ?? "-"}</td>
                    <td className="px-3 py-2">{r.type}</td>
                    <td className="px-3 py-2">{won(r.deposit)} / {won(r.rent)} / {won(r.maintenanceFee)}</td>
                    <td className="px-3 py-2">
                      <div>{tenantInfo(r)}</div>
                      {!r.vacant && r.moveInDate && (
                        <div className="text-xs text-gray-500">{r.moveInDate}</div>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 일반 목록 */}
      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th className="w-10 text-center">★</th>
              <th>날짜</th>
              <th>담당</th>
              <th>코드번호</th>
              <th>거래유형</th>
              <th>건물유형</th>
              <th>임대료(만원)</th>
              <th>세입자정보</th>
              <th>주소</th>
              <th>전용면적</th>
              <th>방/욕</th>
              <th>엘베</th>
              <th>주차</th>
              <th>임대/임차인</th>
              <th>연락처</th>
              <th>임대사업자</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tint = rowTint(r);
              return (
                <tr
                  key={r.id}
                  className={clsx("border-b last:border-b-0 cursor-pointer hover:bg-gray-50", tint)}
                  onClick={() => openEdit(r)}
                >
                  <td className="px-3 py-2 text-center" onClick={(e)=>e.stopPropagation()}>
                    <input type="checkbox" checked={favs.includes(r.id)} onChange={(e)=>toggleFav(r.id, e.target.checked)} />
                  </td>
                  <td className="px-3 py-2">{fmt(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.agent ?? "-"}</td>
                  <td className="px-3 py-2">{r.code ?? "-"}</td>
                  <td className="px-3 py-2">{r.dealType ?? "-"}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{won(r.deposit)} / {won(r.rent)} / {won(r.maintenanceFee)}</td>
                  <td className="px-3 py-2">
                    <div>{tenantInfo(r)}</div>
                    {!r.vacant && r.moveInDate && (
                      <div className="text-xs text-gray-500">{r.moveInDate}</div>
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
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={17}>
                  조건에 맞는 매물이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 오른쪽 수정 패널 */}
      {selected && draft && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[780px] max-w-full h-full bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">매물 정보</h2>
              <div className="flex items-center gap-2">
                <button className="border px-3 py-2 rounded-lg" onClick={() => { setSelected(null); setDraft(null); }}>← 뒤로가기</button>
                <button className="border border-red-500 text-red-600 px-3 py-2 rounded-lg" onClick={removeSelected}>삭제</button>

                {/* 매물종료 토글 → status=거래완료 / 해제시 공개로 */}
                <label className="ml-2 mr-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.status === "거래완료"}
                    onChange={(e) => update("status", e.target.checked ? "거래완료" : "공개")}
                  />
                  <span>매물종료</span>
                </label>

                <button
                  className={clsx("px-3 py-2 rounded-lg", mode === "edit" ? "bg-blue-600 text-white" : "bg-blue-600 text-white")}
                  onClick={saveDraft}
                >
                  저장
                </button>
              </div>
            </div>

            {/* 간단 폼 (핵심 필드만 유지) */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="날짜">
                <input className="input" type="date" value={draft.createdAt ?? ""} onChange={(e) => update("createdAt", e.target.value)} />
              </Field>

              <Field label="담당">
                <select className="input" value={draft.agent ?? "김부장"} onChange={(e)=>update("agent", e.target.value as Agent)}>
                  {AGENTS.map(a=> <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>

              <Field label="거래유형">
                <select className="input" value={draft.dealType ?? "월세"} onChange={(e)=>update("dealType", e.target.value as any)}>
                  <option>월세</option><option>전세</option><option>매매</option>
                </select>
              </Field>

              <Field label="코드번호">
                <input className="input" value={draft.code ?? ""} onChange={(e)=>update("code", e.target.value)} />
              </Field>

              <Field label="건물유형">
                <select className="input" value={draft.type} onChange={(e)=>update("type", e.target.value as ListingType)}>
                  {["아파트","오피스텔","빌라","다세대","다가구","상가","사무실"].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="주소">
                <input className="input" value={draft.address ?? ""} onChange={(e) => update("address", e.target.value)} />
              </Field>

              <Field label="동 / 호 / 층">
                <div className="flex gap-2">
                  <input className="input" placeholder="동" value={draft.dong ?? ""} onChange={(e)=>update("dong", e.target.value)} />
                  <input className="input" placeholder="호" value={draft.ho ?? ""} onChange={(e)=>update("ho", e.target.value)} />
                  <input className="input" placeholder="층" type="number" value={draft.floor ?? ("" as any)} onChange={(e)=>update("floor", Number(e.target.value))} />
                </div>
              </Field>

              <Field label="전용면적(㎡)">
                <div>
                  <input className="input" type="number" step="0.01" value={draft.areaExclusive ?? ("" as any)} onChange={(e)=>update("areaExclusive", e.target.value===""?undefined:Number(e.target.value))} />
                  <div className="text-xs text-gray-500 mt-1">
                    {draft.areaExclusive ? `≈ ${(draft.areaExclusive*0.3025).toFixed(1)} 평` : "㎡ 입력 시 평 자동계산"}
                  </div>
                </div>
              </Field>

              <Field label="방 / 욕">
                <div className="flex gap-2">
                  <input className="input" type="number" value={draft.rooms ?? 0} onChange={(e)=>update("rooms", Number(e.target.value))} />
                  <input className="input" type="number" value={draft.baths ?? 0} onChange={(e)=>update("baths", Number(e.target.value))} />
                </div>
              </Field>

              <Field label="보증 / 월세 / 관리비 (만원)">
                <div className="flex gap-2">
                  <input className="input" type="number" value={draft.deposit ?? 0} onChange={(e)=>update("deposit", Number(e.target.value))} />
                  <input className="input" type="number" value={draft.rent ?? 0} onChange={(e)=>update("rent", Number(e.target.value))} />
                  <input className="input" type="number" value={draft.maintenanceFee ?? 0} onChange={(e)=>update("maintenanceFee", Number(e.target.value))} />
                </div>
              </Field>

              <Field label="세입자정보">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!draft.vacant} onChange={(e)=>update("vacant", e.target.checked)} />
                    <span>공실</span>
                  </label>
                  {!draft.vacant && (
                    <input className="input" type="date" value={draft.moveInDate ?? ""} onChange={(e)=>update("moveInDate", e.target.value)} placeholder="이사가능일"/>
                  )}
                </div>
              </Field>

              <Field label="엘리베이터">
                <select className="input" value={draft.elevator ? "Y":"N"} onChange={(e)=>update("elevator", e.target.value==="Y")}>
                  <option value="Y">Y</option><option value="N">N</option>
                </select>
              </Field>

              <Field label="주차">
                <select className="input" value={draft.parking ?? "문의"} onChange={(e)=>update("parking", e.target.value as any)}>
                  <option>가능</option><option>불가</option><option>문의</option>
                </select>
              </Field>

              <div className="col-span-2 border-t pt-3" />

              {/* 연락처(표시용) */}
              <Field label="임대인 성함">
                <input className="input" value={draft.lessorName ?? ""} onChange={(e)=>update("lessorName", e.target.value)} />
              </Field>
              <Field label="임대인 연락처">
                <input className="input" value={draft.lessorPhone ?? ""} onChange={(e)=>update("lessorPhone", e.target.value)} />
              </Field>

              <Field label="임차인 성함">
                <input className="input" value={draft.lesseeName ?? ""} onChange={(e)=>update("lesseeName", e.target.value)} />
              </Field>
              <Field label="임차인 연락처">
                <input className="input" value={draft.lesseePhone ?? ""} onChange={(e)=>update("lesseePhone", e.target.value)} />
              </Field>

              <div className="col-span-2">
                <Field label="비고(알아야될 정보 + 특징)">
                  <textarea className="input h-24" value={draft.memo ?? ""} onChange={(e)=>update("memo", e.target.value)} />
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

function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
