"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Deal = "월세" | "전세" | "매매";
type Listing = {
  id: string; createdAt: string; agent: string; code: string;
  dealType: Deal; buildingType: string;
  deposit?: number; rent?: number; mgmt?: number;
  tenantInfo: string; address: string; addressSub?: string;
  areaM2?: number; rooms?: number; baths?: number;
  elevator?: "Y" | "N"; parking?: "가능" | "불가";
  pets?: "가능" | "불가";
  landlord?: string; tenant?: string; contact1?: string; contact2?: string;
  isBiz?: "Y" | "N"; memo?: string; vacant: boolean; completed: boolean;
};

const RAW: Listing[] = [
  { id:"R-0001", createdAt:"2025-09-05", agent:"강실장", code:"BO-0004", dealType:"월세", buildingType:"오피스텔",
    deposit:1000, rent:65, mgmt:7, tenantInfo:"공실", address:"서울 강동구 천호동 166-82", addressSub:"대스타워 · 101동 1203호",
    areaM2:44.2, rooms:1, baths:1, elevator:"Y", parking:"가능", pets:"가능", landlord:"홍길동", tenant:"",
    contact1:"010-1234-5678", contact2:"", isBiz:"N", memo:"즉시입주, 로드뷰 양호", vacant:true, completed:false },
  { id:"R-0002", createdAt:"2025-08-28", agent:"김부장", code:"BO-1234", dealType:"월세", buildingType:"아파트",
    deposit:3000, rent:120, mgmt:12, tenantInfo:"이사가능일 2025-09-15", address:"서울 강동구 길동 123-45", addressSub:"길동리버뷰",
    areaM2:85.0, rooms:3, baths:2, elevator:"Y", parking:"가능", pets:"불가", landlord:"김임대", tenant:"박차임",
    contact1:"010-2222-3333", contact2:"010-4444-5555", isBiz:"Y", memo:"거래중, 9/15", vacant:false, completed:false },
  { id:"R-0003", createdAt:"2025-07-15", agent:"소장", code:"BO-5678", dealType:"월세", buildingType:"상가주택",
    deposit:2000, rent:180, mgmt:0, tenantInfo:"공실", address:"서울 강동구 성내동 55-3", addressSub:"성내스퀘어",
    areaM2:23.1, rooms:0, baths:1, elevator:"N", parking:"불가", pets:"가능", landlord:"", tenant:"",
    contact1:"", contact2:"", isBiz:"N", memo:"노출천장, 코너", vacant:true, completed:false },
];

const fmtWon = (v?: number) => (v ?? v === 0) ? v.toLocaleString("ko-KR") : "-";
const fmtDate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toISOString().slice(0,10); };
const setQS = (k: string, v: string | null) => { const u = new URL(window.location.href); if (!v) u.searchParams.delete(k); else u.searchParams.set(k, v); history.replaceState(null, "", u.toString()); };
const getQS = (sp: URLSearchParams, k: string, d = "") => sp.get(k) ?? d;

// 탭(좌정렬)
const TABS = ["월세매물장","전세매물장","매매매물장","상가/사무실매물장","재개발매물장"] as const;
type Tab = "" | typeof TABS[number];

// 건물유형 카테고리(표시 순서/라벨)
const BT_CATS = [
  { label: "아파트",              match: ["아파트"] },
  { label: "오피스텔",            match: ["오피스텔"] },
  { label: "단독/다가구(상가주택)", match: ["단독","다가구","상가주택"] },
  { label: "빌라/다세대",          match: ["빌라","다세대"] },
  { label: "상가/사무실",          match: ["상가","사무실"] },
  { label: "재개발/재건축",        match: ["재개발","재건축"] },
] as const;
type BtCat = typeof BT_CATS[number]["label"];
const catOf = (bt: string): BtCat | "기타" => (BT_CATS.find(c => c.match.includes(bt))?.label ?? "기타");

export default function ListingsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // URL 복원
  const [tab, setTab] = useState<Tab>((getQS(sp,"tab") as Tab) || "");
  const [q, setQ] = useState(getQS(sp,"q"));
  const [lhsh, setLhsh] = useState(getQS(sp,"lhsh"));   // LH/SH
  const [guar, setGuar] = useState(getQS(sp,"guar"));   // HUG/HF
  const [onlyVacant, setOnlyVacant] = useState(getQS(sp,"vacant")==="1");
  const [hideCompleted, setHideCompleted] = useState(getQS(sp,"hideDone")==="1");

  // 상세검색 모달
  const [advOpen, setAdvOpen] = useState(false);

  // 범위 & 조건
  const [depMin, setDepMin]   = useState(getQS(sp,"depMin"));
  const [depMax, setDepMax]   = useState(getQS(sp,"depMax"));
  const [rentMin, setRentMin] = useState(getQS(sp,"rentMin"));
  const [rentMax, setRentMax] = useState(getQS(sp,"rentMax"));
  const [areaMin, setAreaMin] = useState(getQS(sp,"areaMin"));
  const [areaMax, setAreaMax] = useState(getQS(sp,"areaMax"));
  const [roomsMin, setRoomsMin] = useState(getQS(sp,"roomsMin"));
  const [roomsMax, setRoomsMax] = useState(getQS(sp,"roomsMax"));
  const [bathsMin, setBathsMin] = useState(getQS(sp,"bathsMin"));
  const [bathsMax, setBathsMax] = useState(getQS(sp,"bathsMax"));

  // 체크박스형 옵션(같은 줄)
  const [elevYes, setElevYes] = useState(getQS(sp,"elevYes")==="1");
  const [parkYes, setParkYes] = useState(getQS(sp,"parkYes")==="1");
  const [petsYes, setPetsYes] = useState(getQS(sp,"petsYes")==="1");

  // 건물유형(카테고리 라벨 저장)
  const [btSel, setBtSel] = useState<string[]>(() => (getQS(sp,"bt") ? (getQS(sp,"bt") as string).split("|") : []));

  // 쿼리 동기화
  useEffect(()=>{ setQS("tab", tab || null); }, [tab]);
  useEffect(()=>{ setQS("q", q || null); }, [q]);
  useEffect(()=>{ setQS("lhsh", lhsh || null); }, [lhsh]);
  useEffect(()=>{ setQS("guar", guar || null); }, [guar]);
  useEffect(()=>{ setQS("vacant", onlyVacant ? "1" : null); }, [onlyVacant]);
  useEffect(()=>{ setQS("hideDone", hideCompleted ? "1" : null); }, [hideCompleted]);

  useEffect(()=>{ setQS("depMin", depMin || null); }, [depMin]);
  useEffect(()=>{ setQS("depMax", depMax || null); }, [depMax]);
  useEffect(()=>{ setQS("rentMin", rentMin || null); }, [rentMin]);
  useEffect(()=>{ setQS("rentMax", rentMax || null); }, [rentMax]);
  useEffect(()=>{ setQS("areaMin", areaMin || null); }, [areaMin]);
  useEffect(()=>{ setQS("areaMax", areaMax || null); }, [areaMax]);
  useEffect(()=>{ setQS("roomsMin", roomsMin || null); }, [roomsMin]);
  useEffect(()=>{ setQS("roomsMax", roomsMax || null); }, [roomsMax]);
  useEffect(()=>{ setQS("bathsMin", bathsMin || null); }, [bathsMin]);
  useEffect(()=>{ setQS("bathsMax", bathsMax || null); }, [bathsMax]);

  useEffect(()=>{ setQS("elevYes", elevYes ? "1" : null); }, [elevYes]);
  useEffect(()=>{ setQS("parkYes", parkYes ? "1" : null); }, [parkYes]);
  useEffect(()=>{ setQS("petsYes", petsYes ? "1" : null); }, [petsYes]);

  useEffect(()=>{ setQS("bt", btSel.length ? btSel.join("|") : null); }, [btSel]);

  // 탭 프리필터
  const tabFilter = (x: Listing) => {
    switch (tab) {
      case "월세매물장": return x.dealType === "월세";
      case "전세매물장": return x.dealType === "전세";
      case "매매매물장": return x.dealType === "매매";
      case "상가/사무실매물장": return /상가|사무/.test(x.buildingType);
      case "재개발매물장": return true;
      default: return true;
    }
  };

  // 최종 필터
  const rows = useMemo(() => {
    let r = RAW.filter(tabFilter);
    const needle = q.trim().toLowerCase();
    const searching = needle.length > 0;

    if (needle) {
      r = r.filter(x =>
        x.address.toLowerCase().includes(needle) ||
        (x.memo ?? "").toLowerCase().includes(needle)
      );
    }
    if (onlyVacant) r = r.filter(x => x.vacant);
    if (hideCompleted && !searching) r = r.filter(x => !x.completed);

    const num = (s: string) => s ? Number(s) : undefined;
    const _depMin = num(depMin), _depMax = num(depMax);
    const _rentMin = num(rentMin), _rentMax = num(rentMax);
    const _areaMin = num(areaMin), _areaMax = num(areaMax);
    const _roomsMin = num(roomsMin), _roomsMax = num(roomsMax);
    const _bathsMin = num(bathsMin), _bathsMax = num(bathsMax);

    r = r.filter(x => {
      const passDep  = (_depMin===undefined || (x.deposit ?? 0) >= _depMin) && (_depMax===undefined || (x.deposit ?? 0) <= _depMax);
      const passRent = (_rentMin===undefined || (x.rent ?? 0) >= _rentMin)   && (_rentMax===undefined || (x.rent ?? 0) <= _rentMax);
      const passArea = (_areaMin===undefined || (x.areaM2 ?? 0) >= _areaMin) && (_areaMax===undefined || (x.areaM2 ?? 0) <= _areaMax);
      const passRooms = (_roomsMin===undefined || (x.rooms ?? 0) >= _roomsMin) && (_roomsMax===undefined || (x.rooms ?? 0) <= _roomsMax);
      const passBaths = (_bathsMin===undefined || (x.baths ?? 0) >= _bathsMin) && (_bathsMax===undefined || (x.baths ?? 0) <= _bathsMax);

      const passElev  = (!elevYes || x.elevator === "Y");
      const passPark  = (!parkYes || x.parking === "가능");
      const passPets  = (!petsYes || x.pets === "가능");

      const passBT    = (btSel.length===0 || btSel.includes(catOf(x.buildingType)));

      return passDep && passRent && passArea && passRooms && passBaths &&
             passElev && passPark && passPets && passBT;
    });

    return r;
  }, [
    tab,q,onlyVacant,hideCompleted,
    depMin,depMax,rentMin,rentMax,areaMin,areaMax,
    roomsMin,roomsMax,bathsMin,bathsMax,
    elevYes,parkYes,petsYes,btSel
  ]);

  // 초기화
  const resetAdvanced = () => {
    setDepMin(""); setDepMax(""); setRentMin(""); setRentMax(""); setAreaMin(""); setAreaMax("");
    setRoomsMin(""); setRoomsMax(""); setBathsMin(""); setBathsMax("");
    setElevYes(false); setParkYes(false); setPetsYes(false);
    setBtSel([]);
  };

  // 공통 스타일
  const L = ({children}:{children:any}) => (
    <div className="text-xs font-medium text-gray-600 mb-1">{children}</div>
  );
  const Input = (props: any) => <input {...props} className={"border rounded px-2 h-9 text-sm w-full " + (props.className||"")} />;
  const Select = (props: any) => <select {...props} className={"border rounded px-2 h-9 text-sm w-full " + (props.className||"")} />;

  return (
    <main className="w-full max-w-none px-2 md:px-4 py-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <button className="px-3 py-1.5 border rounded-lg hover:bg-gray-50" onClick={()=>router.push("/dashboard")}>← 뒤로가기</button>
        <h1 className="text-2xl font-bold">매물관리</h1>
        <button className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white hover:opacity-90" onClick={()=>router.push("/listings/new")}>+ 매물등록</button>
      </div>

      {/* 탭/버튼 줄 */}
      <div className="flex flex-wrap items-center justify-start gap-2 mb-3">
        <button onClick={()=> setAdvOpen(true)} className={"px-3 py-1.5 rounded-full border " + (advOpen ? "bg-black text-white" : "bg-white hover:bg-gray-50")}>상세검색</button>
        {TABS.map(name => (
          <button key={name} onClick={()=> setTab(name)} className={"px-3 py-1.5 rounded-full border " + (tab===name ? "bg-black text-white" : "bg-white hover:bg-gray-50")}>{name}</button>
        ))}
      </div>

      {/* 검색/필터 + 체크박스 */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-gray-700 mr-1">표시 <b>{rows.length}</b>건 / 전체 <b>{RAW.length}</b>건</div>
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="주소·메모 검색" className="border rounded-lg px-3 py-1.5 w-64" />
          <select value={lhsh} onChange={e=>setLhsh(e.target.value)} className="border rounded-lg px-2 py-1.5">
            <option value="">LH/SH</option><option>LH</option><option>SH</option>
          </select>
          <select value={guar} onChange={e=>setGuar(e.target.value)} className="border rounded-lg px-2 py-1.5">
            <option value="">HUG/HF</option><option>HUG</option><option>HF</option>
          </select>
          <button className="px-2.5 py-1.5 border rounded-lg" onClick={()=>alert("보증보험가: 추후 연결")}>보증보험가</button>
          <button className="px-2.5 py-1.5 border rounded-lg" onClick={()=>location.reload()}>새로고침</button>
        </div>
        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 select-none">
            <input type="checkbox" className="w-4 h-4" checked={onlyVacant} onChange={e=>setOnlyVacant(e.target.checked)} />
            <span>공실만</span>
          </label>
          <label className="inline-flex items-center gap-2 select-none">
            <input type="checkbox" className="w-4 h-4" checked={hideCompleted} onChange={e=>setHideCompleted(e.target.checked)} />
            <span>거래완료 숨기기(검색시 표시)</span>
          </label>
        </div>
      </div>

      {/* 테이블 */}
      <div className="border-y">
        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left">
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">담당</th>
                <th className="px-3 py-2">코드번호</th>
                <th className="px-3 py-2">거래유형</th>
                <th className="px-3 py-2">건물유형</th>
                <th className="px-3 py-2">임대료(만원)</th>
                <th className="px-3 py-2">세입자정보</th>
                <th className="px-3 py-2">주소</th>
                <th className="px-3 py-2">전용면적</th>
                <th className="px-3 py-2">방/욕</th>
                <th className="px-3 py-2">엘.</th>
                <th className="px-3 py-2">주차</th>
                <th className="px-3 py-2">임대/임차인</th>
                <th className="px-3 py-2">연락처</th>
                <th className="px-3 py-2">임대사.</th>
                <th className="px-3 py-2">비고</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
<tr key={r.id}
    onClick={()=>{
      try{ sessionStorage.setItem("editRecord", JSON.stringify(r)); }catch(e){}
      router.push(`/listings/edit?id=${encodeURIComponent(r.id)}`);
    }}
    className={"border-t cursor-pointer hover:opacity-90 " + (r.vacant ? "bg-pink-50" : "")}>
                  <td className="px-3 py-2 font-medium">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.agent}</td>
                  <td className="px-3 py-2">{r.code}</td>
                  <td className="px-3 py-2">{r.dealType}</td>
                  <td className="px-3 py-2">{r.buildingType}</td>
                  <td className="px-3 py-2">
                    {r.dealType==="월세"
                      ? `${fmtWon(r.deposit)} / ${fmtWon(r.rent)} / ${fmtWon(r.mgmt ?? 0)}`
                      : r.dealType==="전세"
                      ? `${fmtWon(r.deposit)}`
                      : `${fmtWon(r.deposit)}`
                    }
                  </td>
                  <td className="px-3 py-2">{r.tenantInfo}</td>
                  <td className="px-3 py-2">
                    <div>{r.address}</div>
                    {r.addressSub && <div className="text-xs text-gray-500">{r.addressSub}</div>}
                  </td>
                  <td className="px-3 py-2">{r.areaM2 ? `${r.areaM2.toFixed(1)}㎡` : "-"}</td>
                  <td className="px-3 py-2">{(r.rooms ?? 0)} / {(r.baths ?? 0)}</td>
                  <td className="px-3 py-2">{r.elevator ?? "-"}</td>
                  <td className="px-3 py-2">{r.parking ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="text-xs">임대 {r.landlord || "-"}</div>
                    <div className="text-xs">임차 {r.tenant || "-"}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{r.contact1 || "-"}</div>
                    <div className="text-xs">{r.contact2 || ""}</div>
                  </td>
                  <td className="px-3 py-2">{r.isBiz ?? "-"}</td>
                  <td className="px-3 py-2">{r.memo ?? "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={16} className="px-3 py-10 text-center text-gray-500">조건에 맞는 매물이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 상세검색 모달 ===== */}
      {advOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={()=>setAdvOpen(false)}>
          <div className="bg-white w-[880px] max-w-[100%] max-h-[90vh] rounded-2xl shadow-lg overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">상세검색</h2>
              <button className="px-2 py-1 border rounded-lg" onClick={()=>setAdvOpen(false)}>닫기</button>
            </div>

            <div className="p-5 overflow-auto space-y-5">
              {/* 금액 / 면적 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">금액 / 면적</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <L>보증금(만원)</L>
                    <div className="flex items-center gap-2">
                      <Input value={depMin} onChange={(e:any)=>setDepMin(e.target.value.replace(/\D/g,""))} placeholder="최소" />
                      <span className="text-gray-400">~</span>
                      <Input value={depMax} onChange={(e:any)=>setDepMax(e.target.value.replace(/\D/g,""))} placeholder="최대" />
                    </div>
                  </div>
                  <div>
                    <L>월세(만원)</L>
                    <div className="flex items-center gap-2">
                      <Input value={rentMin} onChange={(e:any)=>setRentMin(e.target.value.replace(/\D/g,""))} placeholder="최소" />
                      <span className="text-gray-400">~</span>
                      <Input value={rentMax} onChange={(e:any)=>setRentMax(e.target.value.replace(/\D/g,""))} placeholder="최대" />
                    </div>
                  </div>
                  <div>
                    <L>면적(㎡)</L>
                    <div className="flex items-center gap-2">
                      <Input value={areaMin} onChange={(e:any)=>setAreaMin(e.target.value.replace(/\D/g,""))} placeholder="최소" />
                      <span className="text-gray-400">~</span>
                      <Input value={areaMax} onChange={(e:any)=>setAreaMax(e.target.value.replace(/\D/g,""))} placeholder="최대" />
                    </div>
                  </div>
                </div>
              </section>

              {/* 건물유형 (금액/면적과 구조/설비 사이) */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">건물유형</div>
                <div className="flex flex-wrap gap-2">
                  {BT_CATS.map(c => {
                    const active = btSel.includes(c.label);
                    return (
                      <button
                        key={c.label}
                        onClick={()=> setBtSel(s => active ? s.filter(v=>v!==c.label) : [...s,c.label])}
                        className={"px-3 py-1.5 rounded-full border text-sm " + (active ? "bg-black text-white" : "bg-white hover:bg-gray-50")}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 구조 / 설비 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">구조 / 설비</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <L>방(최소~최대)</L>
                    <div className="flex items-center gap-2">
                      <Input value={roomsMin} onChange={(e:any)=>setRoomsMin(e.target.value.replace(/\D/g,""))} placeholder="최소" />
                      <span className="text-gray-400">~</span>
                      <Input value={roomsMax} onChange={(e:any)=>setRoomsMax(e.target.value.replace(/\D/g,""))} placeholder="최대" />
                    </div>
                  </div>
                  <div>
                    <L>욕실(최소~최대)</L>
                    <div className="flex items-center gap-2">
                      <Input value={bathsMin} onChange={(e:any)=>setBathsMin(e.target.value.replace(/\D/g,""))} placeholder="최소" />
                      <span className="text-gray-400">~</span>
                      <Input value={bathsMax} onChange={(e:any)=>setBathsMax(e.target.value.replace(/\D/g,""))} placeholder="최대" />
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="inline-flex items-center gap-2 select-none">
                      <input type="checkbox" className="w-4 h-4" checked={elevYes} onChange={(e)=>setElevYes(e.target.checked)} />
                      <span className="text-sm text-gray-700">엘리베이터 있음</span>
                    </label>
                    <label className="inline-flex items-center gap-2 select-none">
                      <input type="checkbox" className="w-4 h-4" checked={parkYes} onChange={(e)=>setParkYes(e.target.checked)} />
                      <span className="text-sm text-gray-700">주차 가능</span>
                    </label>
                    <label className="inline-flex items-center gap-2 select-none">
                      <input type="checkbox" className="w-4 h-4" checked={petsYes} onChange={(e)=>setPetsYes(e.target.checked)} />
                      <span className="text-sm text-gray-700">반려동물 가능</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* 기관 / 서류 (LH/SH, HUG/HF만) */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">기관 / 서류</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <L>LH/SH</L>
                    <Select value={lhsh} onChange={(e:any)=>setLhsh(e.target.value)}>
                      <option value="">전체</option><option>LH</option><option>SH</option>
                    </Select>
                  </div>
                  <div>
                    <L>보증기관(HUG/HF)</L>
                    <Select value={guar} onChange={(e:any)=>setGuar(e.target.value)}>
                      <option value="">전체</option><option>HUG</option><option>HF</option>
                    </Select>
                  </div>
                </div>
              </section>
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-between">
              <button className="px-3 py-1.5 border rounded-lg" onClick={resetAdvanced}>초기화</button>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border rounded-lg" onClick={()=>setAdvOpen(false)}>취소</button>
                <button className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white" onClick={()=>setAdvOpen(false)}>적용</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

