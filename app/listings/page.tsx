"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withBase, getClientBaseUrl } from "../lib/base";

/** ===== 타입 ===== */
type Deal = "월세" | "전세" | "매매";
type Listing = {
  _id?: string;
  id?: string;
  createdAt: string;
  agent: string;
  code: string;
  dealType: Deal;
  buildingType: string;
  deposit?: number;
  rent?: number;
  mgmt?: number;
  tenantInfo: string;
  address: string;
  addressSub?: string;
  areaM2?: number;
  rooms?: number;
  baths?: number;
  elevator?: "Y" | "N";
  parking?: "가능" | "불가";
  pets?: "가능" | "불가";
  landlord?: string;
  tenant?: string;
  contact1?: string;
  contact2?: string;
  isBiz?: "Y" | "N";
  memo?: string;
  vacant: boolean;
  completed: boolean;
  labelColor?: string;
  loft?: boolean;
  illegal?: boolean;
  photos?: { name: string; dataUrl: string }[];
  lat?: number;
  lng?: number;
};

/** ===== 유틸 ===== */
const fmtWon = (v?: number) =>
  v === 0 || typeof v === "number" ? v.toLocaleString("ko-KR") : "-";
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
};
const setQS = (k: string, v: string | null) => {
  const u = new URL(window.location.href);
  if (!v) u.searchParams.delete(k);
  else u.searchParams.set(k, v);
  history.replaceState(null, "", u.toString());
};
const getQS = (sp: URLSearchParams, k: string, d = "") => sp.get(k) ?? d;

function useDebounced<T>(val: T, ms = 200) {
  const [v, setV] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setV(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return v;
}

// 비고 2줄 표시
function TwoLineCell({
  text,
  firstLen = 30,
  secondLen = 30,
}: {
  text?: string;
  firstLen?: number;
  secondLen?: number;
}) {
  const t = (text ?? "").trim();
  if (!t) return <span>-</span>;
  const arr = Array.from(t);
  const first = arr.slice(0, firstLen).join("");
  const rest = arr.slice(firstLen);
  const second = rest.slice(0, secondLen).join("");
  const over = rest.length > secondLen;
  return (
    <div className="leading-snug">
      <div className="whitespace-nowrap overflow-hidden text-ellipsis">{first}</div>
      {second && (
        <div className="text-[11px] text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
          {second}
          {over ? "…" : ""}
        </div>
      )}
    </div>
  );
}

// 세입자 셀
function TenantCell({ info }: { info?: string }) {
  const s = (info ?? "").trim();
  if (!s) return <span>-</span>;
  const m = s.match(/(\d{4}[./-]\d{2}[./-]\d{2})/);
  const date = m?.[1]?.replace(/[./]/g, "-");
  const label = date ? s.replace(m![1], "").trim() || "이사가능일" : s;
  return (
    <div className="leading-snug">
      <div className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
      {date && <div className="text-[11px] text-gray-600">{date}</div>}
    </div>
  );
}

const toPyeong = (m2: number) => m2 / 3.3058;

function fmtPhone(raw?: string) {
  const d = (raw ?? "").replace(/\D/g, "");
  if (!d) return "-";
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 7) return `${d.slice(0, d.length - 4)}-${d.slice(-4)}`;
  return raw || "-";
}

/** ===== 분류 ===== */
const TABS = [
  "월세매물장",
  "전세매물장",
  "매매매물장",
  "상가/사무실매물장",
  "재개발매물장",
] as const;
type Tab = "" | (typeof TABS)[number];

const BT_CATS = [
  { label: "아파트", match: ["아파트"] },
  { label: "오피스텔", match: ["오피스텔"] },
  { label: "단독/다가구(상가주택)", match: ["단독", "다가구", "상가주택"] },
  { label: "상가/사무실", match: ["상가", "사무실", "상가/사무실"] },
  { label: "빌라/다세대", match: ["빌라", "다세대"] },
  { label: "재개발/재건축", match: ["재개발", "재건축"] },
] as const;
type BtCat = (typeof BT_CATS)[number]["label"];
const catOf = (bt?: string): BtCat | "기타" => {
  const s = (bt ?? "").toLowerCase();
  return (
    BT_CATS.find((c) => c.match.some((m) => s.includes(m.toLowerCase())))?.label ??
    "기타"
  );
};

// 메모/텍스트에서 LH/SH, HUG/HF 추론
function guessToken(listing: Listing, token: "LH" | "SH" | "HUG" | "HF") {
  const hay = [listing.memo, listing.tenantInfo, listing.code, listing.buildingType]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  return hay.includes(token);
}

/** ===== 페이지 ===== */
export default function ListingsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [items, setItems] = useState<Listing[]>([]);
  const [loadErr, setLoadErr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // 승인된 담당자(3글자) 목록
  const [agents, setAgents] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = withBase("/api/staff?approved=1", getClientBaseUrl());
        const res = await fetch(url, { cache: "no-store" });
        const list = (await res.json()) as string[];
        const only3 = (Array.isArray(list) ? list : []).filter(
          (s) => typeof s === "string" && s.trim().length === 3
        );
        if (alive) setAgents(only3);
      } catch {
        if (alive) setAgents([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 목록 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadErr("");
      try {
        const url = withBase("/api/listings", getClientBaseUrl());
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = (await res.json()) as Listing[];
        if (!alive) return;
        arr.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setItems(arr);
      } catch (e: any) {
        if (!alive) return;
        console.error("load listings error", e);
        setLoadErr("매물 목록을 불러오지 못했습니다. (오프라인/서버 오류)");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** ===== 필터 상태 & URL 동기화 ===== */
  const [tab, setTab] = useState<Tab>((getQS(sp, "tab") as Tab) || "");
  const [q, setQ] = useState(getQS(sp, "q"));
  const [lhsh, setLhsh] = useState(getQS(sp, "lhsh"));
  const [guar, setGuar] = useState(getQS(sp, "guar"));
  const [onlyVacant, setOnlyVacant] = useState(getQS(sp, "vacant") === "1");
  const [hideCompleted, setHideCompleted] = useState(
    getQS(sp, "hideDone") === "1"
  );
  const [agentSel, setAgentSel] = useState(getQS(sp, "agent"));

  const [advOpen, setAdvOpen] = useState(false);

  const [depMin, setDepMin] = useState(getQS(sp, "depMin"));
  const [depMax, setDepMax] = useState(getQS(sp, "depMax"));
  const [rentMin, setRentMin] = useState(getQS(sp, "rentMin"));
  const [rentMax, setRentMax] = useState(getQS(sp, "rentMax"));
  const [areaMin, setAreaMin] = useState(getQS(sp, "areaMin"));
  const [areaMax, setAreaMax] = useState(getQS(sp, "areaMax"));
  const [roomsMin, setRoomsMin] = useState(getQS(sp, "roomsMin"));
  const [roomsMax, setRoomsMax] = useState(getQS(sp, "roomsMax"));
  const [bathsMin, setBathsMin] = useState(getQS(sp, "bathsMin"));
  const [bathsMax, setBathsMax] = useState(getQS(sp, "bathsMax"));

  const [elevYes, setElevYes] = useState(getQS(sp, "elevYes") === "1");
  const [parkYes, setParkYes] = useState(getQS(sp, "parkYes") === "1");
  const [petsYes, setPetsYes] = useState(getQS(sp, "petsYes") === "1");

  const [btSel, setBtSel] = useState<string[]>(
    () => (getQS(sp, "bt") ? (getQS(sp, "bt") as string).split("|") : [])
  );

  useEffect(() => setQS("tab", tab || null), [tab]);
  useEffect(() => setQS("q", q || null), [q]);
  useEffect(() => setQS("lhsh", lhsh || null), [lhsh]);
  useEffect(() => setQS("guar", guar || null), [guar]);
  useEffect(() => setQS("vacant", onlyVacant ? "1" : null), [onlyVacant]);
  useEffect(() => setQS("hideDone", hideCompleted ? "1" : null), [hideCompleted]);
  useEffect(() => setQS("agent", agentSel || null), [agentSel]);

  useEffect(() => setQS("depMin", depMin || null), [depMin]);
  useEffect(() => setQS("depMax", depMax || null), [depMax]);
  useEffect(() => setQS("rentMin", rentMin || null), [rentMin]);
  useEffect(() => setQS("rentMax", rentMax || null), [rentMax]);
  useEffect(() => setQS("areaMin", areaMin || null), [areaMin]);
  useEffect(() => setQS("areaMax", areaMax || null), [areaMax]);
  useEffect(() => setQS("roomsMin", roomsMin || null), [roomsMin]);
  useEffect(() => setQS("roomsMax", roomsMax || null), [roomsMax]);
  useEffect(() => setQS("bathsMin", bathsMin || null), [bathsMin]);
  useEffect(() => setQS("bathsMax", bathsMax || null), [bathsMax]);

  useEffect(() => setQS("elevYes", elevYes ? "1" : null), [elevYes]);
  useEffect(() => setQS("parkYes", parkYes ? "1" : null), [parkYes]);
  useEffect(() => setQS("petsYes", petsYes ? "1" : null), [petsYes]);

  useEffect(() => setQS("bt", btSel.length ? btSel.join("|") : null), [btSel]);

  /** ===== 필터 ===== */
  const tabFilter = (x: Listing) => {
    switch (tab) {
      case "월세매물장":
        return x.dealType === "월세";
      case "전세매물장":
        return x.dealType === "전세";
      case "매매매물장":
        return x.dealType === "매매";
      case "상가/사무실매물장":
        return catOf(x.buildingType) === "상가/사무실";
      case "재개발매물장":
        return catOf(x.buildingType) === "재개발/재건축";
      default:
        return true;
    }
  };

  const qDeb = useDebounced(q, 200);

  const rows = useMemo(() => {
    let r = items.filter(tabFilter);

    const needle = (qDeb || "").trim().toLowerCase();
    const searching = needle.length > 0;

    if (needle) {
      r = r.filter(
        (x) =>
          (x.address ?? "").toLowerCase().includes(needle) ||
          (x.memo ?? "").toLowerCase().includes(needle) ||
          (x.code ?? "").toLowerCase().includes(needle) ||
          (x.buildingType ?? "").toLowerCase().includes(needle)
      );
    }

    // 텍스트 기반 추론 필터
    if (lhsh === "LH") r = r.filter((x) => guessToken(x, "LH"));
    if (lhsh === "SH") r = r.filter((x) => guessToken(x, "SH"));
    if (guar === "HUG") r = r.filter((x) => guessToken(x, "HUG"));
    if (guar === "HF") r = r.filter((x) => guessToken(x, "HF"));

    if (agentSel) r = r.filter((x) => x.agent === agentSel);

    if (onlyVacant) r = r.filter((x) => x.vacant);
    if (hideCompleted && !searching) r = r.filter((x) => !x.completed);

    const num = (s: string) => (s ? Number(s) : undefined);
    const _depMin = num(depMin),
      _depMax = num(depMax);
    const _rentMin = num(rentMin),
      _rentMax = num(rentMax);
    const _areaMin = num(areaMin),
      _areaMax = num(areaMax);
    const _roomsMin = num(roomsMin),
      _roomsMax = num(roomsMax);
    const _bathsMin = num(bathsMin),
      _bathsMax = num(bathsMax);

    r = r.filter((x) => {
      const passDep =
        (_depMin === undefined || (x.deposit ?? 0) >= _depMin) &&
        (_depMax === undefined || (x.deposit ?? 0) <= _depMax);
      const passRent =
        (_rentMin === undefined || (x.rent ?? 0) >= _rentMin) &&
        (_rentMax === undefined || (x.rent ?? 0) <= _rentMax);
      const passArea =
        (_areaMin === undefined || (x.areaM2 ?? 0) >= _areaMin) &&
        (_areaMax === undefined || (x.areaM2 ?? 0) <= _areaMax);
      const passRooms =
        (_roomsMin === undefined || (x.rooms ?? 0) >= _roomsMin) &&
        (_roomsMax === undefined || (x.rooms ?? 0) <= _roomsMax);
      const passBaths =
        (_bathsMin === undefined || (x.baths ?? 0) >= _bathsMin) &&
        (_bathsMax === undefined || (x.baths ?? 0) <= _bathsMax);
      const passElev = !elevYes || x.elevator === "Y";
      const passPark = !parkYes || x.parking === "가능";
      const passPets = !petsYes || x.pets === "가능";
      const passBT =
        btSel.length === 0 || btSel.includes(catOf(x.buildingType));
      return (
        passDep &&
        passRent &&
        passArea &&
        passRooms &&
        passBaths &&
        passElev &&
        passPark &&
        passPets &&
        passBT
      );
    });

    return r;
  }, [
    items,
    tab,
    qDeb,
    onlyVacant,
    hideCompleted,
    depMin,
    depMax,
    rentMin,
    rentMax,
    areaMin,
    areaMax,
    roomsMin,
    roomsMax,
    bathsMin,
    bathsMax,
    elevYes,
    parkYes,
    petsYes,
    btSel,
    lhsh,
    guar,
    agentSel,
  ]);

  const resetAdvanced = () => {
    setDepMin("");
    setDepMax("");
    setRentMin("");
    setRentMax("");
    setAreaMin("");
    setAreaMax("");
    setRoomsMin("");
    setRoomsMax("");
    setBathsMin("");
    setBathsMax("");
    setElevYes(false);
    setParkYes(false);
    setPetsYes(false);
    setBtSel([]);
    setLhsh("");
    setGuar("");
  };

  const routerToEdit = (r: Listing) => {
    const realId = (r as any)._id as string | undefined;
    if (!realId) return;
    router.push(`/listings/${realId}/edit`);
  };

  const L = ({ children }: { children: any }) => (
    <div className="text-xs font-medium text-gray-600 mb-1">{children}</div>
  );

  return (
    <main className="w-full max-w-none px-2 md:px-4 py-5">
      {/* 에러 배너 */}
      {loadErr && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadErr}
          <button
            className="ml-3 rounded border px-2 py-0.5 text-red-800"
            onClick={() => location.reload()}
          >
            새로고침
          </button>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <button
          className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
          onClick={() => router.push("/dashboard")}
        >
          ← 뒤로가기
        </button>
        <h1 className="text-2xl font-bold">매물관리</h1>
        <button
          className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white hover:opacity-90"
          onClick={() => router.push("/listings/new")}
        >
          + 매물등록
        </button>
      </div>

      {/* 탭/버튼 줄 */}
      <div className="flex flex-wrap items-center justify-start gap-2 mb-3">
        <button
          onClick={() => setAdvOpen(true)}
          className="px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50"
        >
          상세검색
        </button>

        {TABS.map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={
              "px-3 py-1.5 rounded-full border " +
              (tab === name ? "bg-black text-white" : "bg-white hover:bg-gray-50")
            }
          >
            {name}
          </button>
        ))}

        {/* 주소및호실상태 이동 */}
        <button
          onClick={() => router.push("/listings/units")}
          title="주소 및 호실 상태 화면으로 이동"
          className="px-3 py-1.5 rounded-full border bg-amber-500 text-white hover:opacity-90"
        >
          주소및호실상태
        </button>

        {/* ✅ 전용 지도 페이지로 이동 */}
        <button
          onClick={() => router.push("/listings/map")}
          title="우리 매물만 지도로 보기"
          className="px-3 py-1.5 rounded-full border bg-emerald-600 text-white hover:opacity-90"
        >
          매물지도
        </button>
      </div>

      {/* 상단 필터 */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-gray-700 mr-1">
            표시 <b>{rows.length}</b>건 / 전체 <b>{items.length}</b>건
            {loading ? (
              <span className="ml-2 text-gray-500">(로딩중…)</span>
            ) : null}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="주소·메모·코드·유형 검색"
            className="border rounded-lg px-3 py-1.5 w-64"
          />
          {/* 담당자 */}
          <select
            value={agentSel}
            onChange={(e) => setAgentSel(e.target.value)}
            className="border rounded-lg px-2 py-1.5"
            title="담당자 필터(설정에서 승인된 3글자만 표시)"
          >
            <option value="">
              {agents.length ? "담당자(전체)" : "담당자(없음)"}
            </option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={lhsh}
            onChange={(e) => setLhsh(e.target.value)}
            className="border rounded-lg px-2 py-1.5"
          >
            <option value="">LH/SH</option>
            <option>LH</option>
            <option>SH</option>
          </select>
          <select
            value={guar}
            onChange={(e) => setGuar(e.target.value)}
            className="border rounded-lg px-2 py-1.5"
          >
            <option value="">HUG/HF</option>
            <option>HUG</option>
            <option>HF</option>
          </select>
          <button
            className="px-2.5 py-1.5 border rounded-lg"
            onClick={() => alert("보증보험가는 추후 연동 예정입니다.")}
          >
            보증보험가
          </button>
          <button
            className="px-2.5 py-1.5 border rounded-lg"
            onClick={() => location.reload()}
          >
            새로고침
          </button>
        </div>
        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 select-none">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={onlyVacant}
              onChange={(e) => setOnlyVacant(e.target.checked)}
            />
            <span>공실만</span>
          </label>
          <label className="inline-flex items-center gap-2 select-none">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
            />
            <span>거래완료 숨기기(검색시 표시)</span>
          </label>
        </div>
      </div>

      {/* 테이블 */}
      <div className="border-y">
        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[34px]" />
              <col className="w-[110px]" />
              <col className="w-[70px]" />
              <col className="w-[80px]" />
              <col className="w-[80px]" />
              <col className="w-[110px]" />
              <col className="w-[140px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
              <col className="w-[90px]" />
              <col className="w-[70px]" />
              <col className="w-[48px]" />
              <col className="w-[60px]" />
              <col className="w-[130px]" />
              <col className="w-[150px]" />
              <col className="w-[70px]" />
              <col className="w-[400px]" />
            </colgroup>

            <thead className="bg-gray-100">
              <tr className="text-left">
                <th className="px-2 py-2"> </th>
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">담당</th>
                <th className="px-3 py-2">코드번호</th>
                <th className="px-3 py-2">거래유형</th>
                <th className="px-3 py-2">건물유형</th>
                <th className="px-3 py-2">임대료(보/월/관)</th>
                <th className="px-3 py-2">세입자</th>
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
              {rows.map((r, idx) => {
                const hasPhoto = !!(r as any).photos?.length;
                const clickable = !!(r as any)._id;
                const isDone = !!r.completed;

                const baseStyle = isDone
                  ? { background: "#0b0b0b", color: "#cfcfcf" }
                  : r.labelColor
                  ? { background: r.labelColor }
                  : undefined;

                return (
                  <tr
                    key={`${(r as any)._id ?? r.id ?? idx}`}
                    onClick={() => clickable && routerToEdit(r)}
                    className={
                      "border-t " +
                      (clickable
                        ? "cursor-pointer hover:bg-blue-50 "
                        : "opacity-90 ")
                    }
                    title={clickable ? "클릭하여 수정하기" : undefined}
                    style={baseStyle}
                  >
                    <td className="px-2 py-2">
                      {hasPhoto ? <span title="사진 있음">📷</span> : null}
                    </td>
                    <td className="px-3 py-2 font-medium truncate">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-3 py-2 truncate">{r.agent || "-"}</td>
                    <td className="px-3 py-2 truncate">{r.code || "-"}</td>
                    <td className="px-3 py-2 truncate">{r.dealType}</td>
                    <td className="px-3 py-2 truncate">{r.buildingType}</td>
                    <td className="px-3 py-2 truncate">{`${fmtWon(
                      r.deposit
                    )} / ${fmtWon(r.rent)} / ${fmtWon(r.mgmt)}`}</td>
                    <td className="px-3 py-2">
                      <TenantCell info={r.tenantInfo} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="truncate">{r.address}</div>
                      {r.addressSub && (
                        <div className="text-xs text-gray-500 truncate">
                          {r.addressSub}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="truncate">
                        {typeof r.areaM2 === "number" && !isNaN(r.areaM2)
                          ? `${r.areaM2.toFixed(1)}㎡`
                          : "-"}
                      </div>
                      {typeof r.areaM2 === "number" && !isNaN(r.areaM2) && (
                        <div className="text-[11px] text-gray-600">
                          ≈ {toPyeong(r.areaM2).toFixed(1)}평
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 truncate">
                      {r.rooms ?? 0} / {r.baths ?? 0}
                    </td>
                    <td className="px-3 py-2 truncate">{r.elevator ?? "-"}</td>
                    <td className="px-3 py-2 truncate">{r.parking ?? "-"}</td>
                    <td className="px-3 py-2">
                      <div className="text-xs truncate">
                        임대 {r.landlord || "-"}
                      </div>
                      <div className="text-xs truncate">
                        임차 {r.tenant || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs truncate">
                        {fmtPhone(r.contact1)}
                      </div>
                      {r.contact2 ? (
                        <div className="text-xs truncate">
                          {fmtPhone(r.contact2)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 truncate">{r.isBiz ?? "-"}</td>
                    <td className="px-3 py-2 align-top">
                      <TwoLineCell text={r.memo} firstLen={20} secondLen={20} />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={17}
                    className="px-3 py-10 text-center text-gray-500"
                  >
                    {loading ? "불러오는 중…" : "조건에 맞는 매물이 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 상세검색 모달 ===== */}
      {advOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setAdvOpen(false)}
        >
          <div
            className="bg-white w-[880px] max-w-[100%] max-h-[90vh] rounded-2xl shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">상세검색</h2>
              <button
                className="px-2 py-1 border rounded-lg"
                onClick={() => setAdvOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="p-5 overflow-auto space-y-5">
              {/* 금액 / 면적 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  금액 / 면적
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <L>보증금(만원)</L>
                    <div className="flex items-center gap-2">
                      <input
                        value={depMin}
                        onChange={(e: any) =>
                          setDepMin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최소"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        value={depMax}
                        onChange={(e: any) =>
                          setDepMax(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최대"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <L>월세(만원)</L>
                    <div className="flex items-center gap-2">
                      <input
                        value={rentMin}
                        onChange={(e: any) =>
                          setRentMin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최소"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        value={rentMax}
                        onChange={(e: any) =>
                          setRentMax(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최대"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <L>면적(㎡)</L>
                    <div className="flex items-center gap-2">
                      <input
                        value={areaMin}
                        onChange={(e: any) =>
                          setAreaMin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최소"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        value={areaMax}
                        onChange={(e: any) =>
                          setAreaMax(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최대"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 건물유형 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  건물유형
                </div>
                <div className="flex flex-wrap gap-2">
                  {BT_CATS.map((c) => {
                    const active = btSel.includes(c.label);
                    return (
                      <button
                        key={c.label}
                        onClick={() =>
                          setBtSel((s) =>
                            active ? s.filter((v) => v !== c.label) : [...s, c.label]
                          )
                        }
                        className={
                          "px-3 py-1.5 rounded-full border text-sm " +
                          (active
                            ? "bg-black text-white"
                            : "bg-white hover:bg-gray-50")
                        }
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 구조 / 설비 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  구조 / 설비
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <L>방(최소~최대)</L>
                    <div className="flex items-center gap-2">
                      <input
                        value={roomsMin}
                        onChange={(e: any) =>
                          setRoomsMin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최소"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        value={roomsMax}
                        onChange={(e: any) =>
                          setRoomsMax(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최대"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <L>욕실(최소~최대)</L>
                    <div className="flex items-center gap-2">
                      <input
                        value={bathsMin}
                        onChange={(e: any) =>
                          setBathsMin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최소"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        value={bathsMax}
                        onChange={(e: any) =>
                          setBathsMax(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="최대"
                        className="border rounded px-2 h-9 text-sm w-full"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="inline-flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={elevYes}
                        onChange={(e) => setElevYes(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">엘리베이터 있음</span>
                    </label>
                    <label className="inline-flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={parkYes}
                        onChange={(e) => setParkYes(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">주차 가능</span>
                    </label>
                    <label className="inline-flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={petsYes}
                        onChange={(e) => setPetsYes(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">반려동물 가능</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* 기관 / 서류 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  기관 / 서류
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <L>LH/SH</L>
                    <select
                      value={lhsh}
                      onChange={(e: any) => setLhsh(e.target.value)}
                      className="border rounded px-2 h-9 text-sm w-full"
                    >
                      <option value="">전체</option>
                      <option>LH</option>
                      <option>SH</option>
                    </select>
                  </div>
                  <div>
                    <L>보증기관(HUG/HF)</L>
                    <select
                      value={guar}
                      onChange={(e: any) => setGuar(e.target.value)}
                      className="border rounded px-2 h-9 text-sm w-full"
                    >
                      <option value="">전체</option>
                      <option>HUG</option>
                      <option>HF</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-between">
              <button
                className="px-3 py-1.5 border rounded-lg"
                onClick={resetAdvanced}
              >
                초기화
              </button>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 border rounded-lg"
                  onClick={() => setAdvOpen(false)}
                >
                  취소
                </button>
                <button
                  className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white"
                  onClick={() => setAdvOpen(false)}
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
