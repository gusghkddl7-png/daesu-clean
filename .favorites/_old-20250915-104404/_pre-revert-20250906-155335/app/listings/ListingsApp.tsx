"use client";

import { useMemo, useState } from "react";

export type ListingStatus = "공개" | "비공개" | "거래중" | "거래완료";
export type ListingType = "아파트" | "오피스텔" | "빌라" | "다세대" | "다가구" | "상가" | "사무실";
export type DealType = "월세" | "전세" | "매매";

const PREFIX: Record<DealType, string> = { 월세: "BO", 전세: "BL", 매매: "BM" };

export interface Listing {
  id: string;
  code?: string;          // 코드번호 (BO/BL/BM-0001…)
  dealType?: DealType;    // 거래유형
  createdAt: string;      // 날짜
  address: string;
  buildingName?: string;
  dong?: string;
  ho?: string;
  type: ListingType;      // 건물유형
  areaExclusive?: number; // 전용(㎡)
  floor?: number;
  rooms?: number;         // 방
  baths?: number;         // 욕
  deposit?: number;       // 보증(만원)
  rent?: number;          // 월세(만원)
  maintenanceFee?: number;
  parking?: "가능" | "불가" | "문의";
  elevator?: boolean;
  options?: string[];
  vacant?: boolean;       // 공실 여부
  moveInDate?: string;    // 이사가능일 (거주중일 때)
  memo?: string;          // 비고
  agent?: string;         // 담당
  status: ListingStatus;  // 상태
  phone?: string;         // 연락처
  business?: "Y" | "N";   // 임대사업자
  contractEnd?: string;   // 세입자 계약만기일
  landlordName?: string;  // 임대(차)인 성함
  landlordPhone?: string; // 임대(차)인 연락처
}

const DATA0: Listing[] = [
  {
    id: "L-2025-0001",
    code: "BO-0001", dealType: "월세",
    createdAt: "2025-09-05",
    address: "서울 강동구 천호동 166-82",
    buildingName: "대수타워",
    dong: "101", ho: "1203",
    type: "오피스텔",
    areaExclusive: 44.2,
    floor: 12, rooms: 1, baths: 1,
    deposit: 1000, rent: 65, maintenanceFee: 7,
    parking: "가능", elevator: true,
    options: ["에어컨","냉장고","세탁기"],
    vacant: true,
    memo: "즉시입주, 로열층",
    agent: "강실장",
    status: "공개",
    phone: "010-1234-5678",
    business: "N",
    landlordName: "홍길동",
    landlordPhone: "010-1234-5678",
  },
  {
    id: "L-2025-0002",
    code: "BO-0002", dealType: "월세",
    createdAt: "2025-08-28",
    address: "서울 강동구 길동 123-45",
    buildingName: "길동리버뷰",
    type: "아파트",
    areaExclusive: 84.97, floor: 7,
    rooms: 3, baths: 2,
    deposit: 3000, rent: 120, maintenanceFee: 12,
    parking: "가능", elevator: true,
    vacant: false, moveInDate: "2025-09-15",
    memo: "거래중, 9/15 퇴거예정",
    agent: "김부장",
    status: "거래중",
    phone: "010-2222-3333",
    business: "Y",
    contractEnd: "2025-09-15",
    landlordName: "김임대",
    landlordPhone: "010-2222-3333",
  },
  {
    id: "L-2025-0003",
    code: "BO-0003", dealType: "월세",
    createdAt: "2025-07-15",
    address: "서울 강동구 성내동 55-3",
    buildingName: "성내스퀘어",
    type: "상가",
    areaExclusive: 23.1, floor: 1,
    rooms: 0, baths: 1,
    deposit: 2000, rent: 180, maintenanceFee: 0,
    parking: "문의", elevator: false,
    vacant: true,
    memo: "노출천장, 코너",
    agent: "소장",
    status: "비공개",
    phone: "010-7777-8888",
    business: "N",
    landlordName: "박사장",
    landlordPhone: "010-7777-8888",
  },
];

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
function tenantInfo(row: Listing) {
  if (row.vacant) return "공실";
  if (!row.vacant && row.moveInDate) return `이사가능일 ${row.moveInDate}`;
  return "거주중";
}

function nextCode(rows: Listing[], dealType: DealType) {
  const prefix = PREFIX[dealType];
  let max = 0;
  for (const r of rows) {
    if (!r.code) continue;
    if (r.code.startsWith(prefix + "-")) {
      const n = parseInt(r.code.split("-")[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  const num = String(max + 1).padStart(4, "0");
  return `${prefix}-${num}`;
}

type EditMode = "view" | "edit";

export default function ListingsApp() {
  const [q, setQ] = useState("");
  const [vacantOnly, setVacantOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);

  const [rows, setRows] = useState<Listing[]>(DATA0);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [mode, setMode] = useState<EditMode>("view");
  const [draft, setDraft] = useState<Listing | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (vacantOnly && !r.vacant) return false;
      if (hideCompleted && r.status === "거래완료") return false;
      const hay = `${r.address} ${r.buildingName ?? ""} ${r.dong ?? ""} ${r.ho ?? ""} ${r.agent ?? ""} ${r.memo ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q, rows, vacantOnly, hideCompleted]);

  function openEdit(row: Listing) {
    setSelected(row);
    setDraft({ ...row });
    setMode("view");
  }

  function update<K extends keyof Listing>(key: K, val: Listing[K]) {
    if (!draft) return;
    setDraft({ ...draft, [key]: val });
  }

  function changeDealType(t: DealType) {
    setDraft((prev) => {
      if (!prev) return prev;
      const needNew = !prev.code || !prev.code.startsWith(PREFIX[t] + "-");
      return { ...prev, dealType: t, code: needNew ? nextCode(rows, t) : prev.code };
    });
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

  return (
    <div className="w-full px-6 py-6 space-y-4">{/* 전체 폭 사용 */}
      {/* Top bar: 좌(대수부동산) / 중앙(매물관리) / 우(뒤로가기, 매물등록, 주소검색) */}
      <div className="flex items-center gap-3">
        <div className="min-w-[120px] text-lg font-semibold">대수부동산</div>
        <h1 className="flex-1 text-center text-2xl font-bold">매물관리</h1>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => history.back()}>← 뒤로가기</button>
          <button
            className="btn-primary"
            onClick={() => {
              const nid = `L-${Date.now()}`;
              const dt: DealType = "월세";
              const code = nextCode(rows, dt);
              const item: Listing = {
                id: nid,
                code,
                dealType: dt,
                createdAt: new Date().toISOString().slice(0, 10),
                address: "",
                type: "아파트",
                status: "공개",
                vacant: true,
              };
              setRows((p) => [item, ...p]);
              openEdit(item);
              setMode("edit");
            }}
          >
            + 매물등록
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="주소검색"
            className="input w-[320px]"
          />
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={vacantOnly} onChange={(e) => setVacantOnly(e.target.checked)} />
          <span>공실만</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
          <span>거래완료 숨기기(검색 시 표시)</span>
        </label>
        <div className="ml-auto text-gray-500">
          표시 {filtered.length}건 / 전체 {rows.length}건
        </div>
      </div>

      {/* 표: 가로 꽉 채우기 */}
      <div className="border rounded-xl overflow-x-auto w-full">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>날짜</th>
              <th>담당</th>
              <th>코드번호</th>
              <th>거래유형</th>
              <th>건물유형</th>
              <th>임대료(만원)</th>
              <th>세입자정보</th>
              <th>주소</th>
              <th>층/호</th>
              <th>전용면적</th>
              <th>방/욕</th>
              <th>계약만기</th>
              <th>엘베</th>
              <th>주차</th>
              <th>임대(차)인</th>
              <th>연락처</th>
              <th>임대사업자</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const done = r.status === "거래완료";
              const tint = rowTint(r);
              return (
                <tr
                  key={r.id}
                  className={`border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${tint}`}
                  onClick={() => openEdit(r)}
                >
                  <td className="px-3 py-2">{fmt(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.agent ?? "-"}</td>
                  <td className="px-3 py-2">{r.code ?? "-"}</td>
                  <td className="px-3 py-2">{r.dealType ?? "-"}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{won(r.deposit)} / {won(r.rent)}</td>
                  <td className="px-3 py-2">{tenantInfo(r)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.address}</div>
                    <div className={`text-xs ${done ? "text-white/60" : "text-gray-500"}`}>
                      {r.buildingName ?? "-"} {r.dong ? `· ${r.dong}동` : ""} {r.ho ? `${r.ho}호` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.floor ?? "-"}층 / {r.ho ?? "-"}</td>
                  <td className="px-3 py-2">{r.areaExclusive ?? "-"}㎡ ({pyeong(r.areaExclusive)}평)</td>
                  <td className="px-3 py-2">{r.rooms ?? 0} / {r.baths ?? 0}</td>
                  <td className="px-3 py-2">{fmt(r.contractEnd)}</td>
                  <td className="px-3 py-2">{r.elevator ? "Y" : "N"}</td>
                  <td className="px-3 py-2">{r.parking ?? "-"}</td>
                  <td className="px-3 py-2">{r.landlordName ?? "-"}</td>
                  <td className="px-3 py-2">{r.landlordPhone ?? r.phone ?? "-"}</td>
                  <td className="px-3 py-2">{r.business ?? "-"}</td>
                  <td className="px-3 py-2">{r.memo ?? "-"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={18}>조건에 맞는 매물이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 수정 패널 */}
      {selected && draft && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[min(1200px,100vw)] h-full bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">매물 정보</h2>
              <div className="flex gap-2">
                <button className="btn" onClick={() => { setSelected(null); setDraft(null); }}>← 뒤로가기</button>
                <button className="btn border-red-500 text-red-600" onClick={removeSelected}>삭제</button>
                <button className="btn" onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))}>
                  {mode === "view" ? "수정" : "수정취소"}
                </button>
                <button className={`btn-primary ${mode !== "edit" ? "opacity-50 cursor-not-allowed" : ""}`} disabled={mode !== "edit"} onClick={saveDraft}>
                  저장
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="날짜">
                <input className="input" type="date" disabled={mode === "view"} value={draft.createdAt ?? ""} onChange={(e) => update("createdAt", e.target.value)} />
              </Field>

              <Field label="담당">
                <input className="input" disabled={mode === "view"} value={draft.agent ?? ""} onChange={(e) => update("agent", e.target.value)} />
              </Field>

              <Field label="코드번호">
                <input className="input" disabled value={draft.code ?? ""} />
              </Field>

              <Field label="거래유형">
                <select className="input" disabled={mode === "view"} value={draft.dealType ?? "월세"} onChange={(e) => changeDealType(e.target.value as DealType)}>
                  {(["월세","전세","매매"] as DealType[]).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="건물유형">
                <select className="input" disabled={mode === "view"} value={draft.type} onChange={(e) => update("type", e.target.value as ListingType)}>
                  {["아파트","오피스텔","빌라","다세대","다가구","상가","사무실"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="주소">
                <input className="input" disabled={mode === "view"} value={draft.address ?? ""} onChange={(e) => update("address", e.target.value)} />
              </Field>

              <Field label="동">
                <input className="input" disabled={mode === "view"} value={draft.dong ?? ""} onChange={(e) => update("dong", e.target.value)} />
              </Field>

              <Field label="호">
                <input className="input" disabled={mode === "view"} value={draft.ho ?? ""} onChange={(e) => update("ho", e.target.value)} />
              </Field>

              <Field label="층수">
                <input className="input" type="number" disabled={mode === "view"} value={draft.floor ?? ("" as any)} onChange={(e) => update("floor", Number(e.target.value))} />
              </Field>

              <Field label="전용면적(㎡)">
                <div>
                  <input className="input" type="number" step="0.01" disabled={mode === "view"} value={draft.areaExclusive ?? ("" as any)} onChange={(e) => update("areaExclusive", e.target.value === "" ? undefined : Number(e.target.value))} />
                  <div className="text-xs text-gray-500 mt-1">
                    {draft.areaExclusive ? `≈ ${pyeong(draft.areaExclusive)} 평` : "㎡ 입력 시 평 자동계산"}
                  </div>
                </div>
              </Field>

              <Field label="방 / 욕">
                <div className="flex gap-2">
                  <input className="input" type="number" disabled={mode === "view"} value={draft.rooms ?? 0} onChange={(e) => update("rooms", Number(e.target.value))} />
                  <input className="input" type="number" disabled={mode === "view"} value={draft.baths ?? 0} onChange={(e) => update("baths", Number(e.target.value))} />
                </div>
              </Field>

              <Field label="보증 / 월세 (만원)">
                <div className="flex gap-2">
                  <input className="input" type="number" disabled={mode === "view"} value={draft.deposit ?? 0} onChange={(e) => update("deposit", Number(e.target.value))} />
                  <input className="input" type="number" disabled={mode === "view"} value={draft.rent ?? 0} onChange={(e) => update("rent", Number(e.target.value))} />
                </div>
              </Field>

              <Field label="세입자정보">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" disabled={mode === "view"} checked={!!draft.vacant} onChange={(e) => update("vacant", e.target.checked)} />
                    <span>공실</span>
                  </label>
                  {!draft.vacant && (
                    <input className="input" type="date" disabled={mode === "view"} value={draft.moveInDate ?? ""} onChange={(e) => update("moveInDate", e.target.value)} placeholder="이사가능일" />
                  )}
                </div>
              </Field>

              <Field label="계약만기">
                <input className="input" type="date" disabled={mode === "view"} value={draft.contractEnd ?? ""} onChange={(e) => update("contractEnd", e.target.value)} />
              </Field>

              <Field label="엘리베이터">
                <select className="input" disabled={mode === "view"} value={draft.elevator ? "Y" : "N"} onChange={(e) => update("elevator", e.target.value === "Y")}>
                  <option value="Y">Y</option><option value="N">N</option>
                </select>
              </Field>

              <Field label="주차">
                <select className="input" disabled={mode === "view"} value={draft.parking ?? "문의"} onChange={(e) => update("parking", e.target.value as any)}>
                  <option>가능</option><option>불가</option><option>문의</option>
                </select>
              </Field>

              <Field label="임대(차)인 성함">
                <input className="input" disabled={mode === "view"} value={draft.landlordName ?? ""} onChange={(e) => update("landlordName", e.target.value)} />
              </Field>

              <Field label="임대(차)인 연락처">
                <input className="input" disabled={mode === "view"} value={draft.landlordPhone ?? ""} onChange={(e) => update("landlordPhone", e.target.value)} />
              </Field>

              <Field label="임대사업자">
                <select className="input" disabled={mode === "view"} value={draft.business ?? "N"} onChange={(e) => update("business", e.target.value as any)}>
                  <option value="Y">Y</option><option value="N">N</option>
                </select>
              </Field>

              <div className="col-span-2">
                <Field label="비고(알아야될 정보 + 특징)">
                  <textarea className="input h-24" disabled={mode === "view"} value={draft.memo ?? ""} onChange={(e) => update("memo", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
