"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ===== 타입 ===== */
type Stage = "가계약" | "본계약" | "중도금" | "잔금및입주";
const STAGES: Stage[] = ["가계약", "본계약", "중도금", "잔금및입주"];
const DEFAULT_STAGE: Stage = "잔금및입주";

type Deal = "월세" | "전세" | "매매";
type Bldg =
  | "단독/다가구"
  | "다세대/빌라"
  | "아파트"
  | "오피스텔"
  | "상가/사무실"
  | "재개발/재건축";
type OfficeUsage = "주거용" | "상업용";

type Party = {
  dueStage: Stage;
  expect: string;       // 받을금액(만원) — 보통 '포함'으로 입력
  received: string;     // 실제받은 합계(만원) = 현금+계좌
  vatIncluded: boolean; // '부가세 포함' 체크
  receivedDate: string;
  receivedCash?: string;
  receivedBank?: string;
};

type Billing = {
  _id?: string;
  createdAt: string;

  /** ✅ 담당자 — 새 구조(여러명), 구버전 agent(단일)와 동시 보관/호환 */
  agent?: string;     // 구버전(단일) — 읽기 전용 호환
  agentL?: string[];  // 임대인측 담당자
  agentT?: string[];  // 임차인측 담당자

  buildingType?: Bldg;
  dealType?: Deal;
  officeUsage?: OfficeUsage;
  address?: string;
  depositMan?: string; // 매매가 or 보증금 (만원)
  rentMan?: string;    // 월세 (만원)
  datePrelim?: string;   // 가계약
  dateSign?: string;     // 본계약
  dateInterim?: string;  // 중도금
  dateClosing?: string;  // 잔금/입주
  landlord: Party;
  tenant: Party;
  memo?: string;

  /** 성함/연락처 */
  landlordName?: string;
  landlordPhone?: string;
  tenantName?: string;
  tenantPhone?: string;

  /** ✅ 상태 플래그 */
  paidDone?: boolean;       // 입금 완료
  receiptIssued?: boolean;  // 영수증 발급
};

/** ===== 컬럼 ===== */
const COL_W = { prelim: 80, agent: 110, address: 87, stages: 190, landlord: 140, tenant: 150, fee: 90, memo: 460 } as const;
const ROW_H = 60;
const CLAMP = "whitespace-nowrap overflow-hidden text-ellipsis";

/** ===== 숫자/포맷 ===== */
function cleanUpTo2(v: string) {
  let s = (v ?? "").toString().replace(/[^0-9.]/g, "");
  const idx = s.indexOf(".");
  if (idx === -1) return s.replace(/^0+(?=\d)/, "") || "0";
  const head = (s.slice(0, idx).replace(/^0+(?=\d)/, "") || "0").replace(/\./g, "");
  const tail = s.slice(idx + 1).replace(/\./g, "").slice(0, 2);
  return head + (tail.length ? "." + tail : ".");
}
const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const fmtMan2 = (n: number) => n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtManSmart(n: number) {
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return n.toLocaleString("ko-KR", { minimumFractionDigits: isInt ? 0 : 2, maximumFractionDigits: isInt ? 0 : 2 });
}
const asPlain = (n: number) => { const s = n.toFixed(2); return s.endsWith(".00") ? String(Math.round(n)) : s.replace(/\.?0$/, ""); };
const fmtDate10 = (iso?: string) => { if (!iso) return "-"; const d = new Date(iso); return isNaN(d.getTime()) ? "-" : d.toISOString().slice(0, 10); };

/** ===== VAT ===== */
function deriveVat(amountMan: number, included: boolean) {
  if (amountMan <= 0) return { supply: 0, vat: 0, total: 0 };
  if (included) {
    const supply = +(amountMan / 1.1).toFixed(2);
    const vat = +(amountMan - supply).toFixed(2);
    return { supply, vat, total: amountMan };
  } else {
    const vat = +(amountMan * 0.1).toFixed(2);
    const total = +(amountMan + vat).toFixed(2);
    return { supply: amountMan, vat, total };
  }
}

/** ===== 환산/보수 ===== */
function leaseBase(depositMan: number, rentMan: number) {
  const base100 = depositMan + rentMan * 100;
  const base = base100 < 5000 ? depositMan + rentMan * 70 : base100;
  return +base.toFixed(2);
}
function computeBrokerage(
  building: Bldg | undefined,
  deal: Deal | undefined,
  depositMan: number,
  rentMan: number,
  officeUsage?: OfficeUsage
) {
  if (!building || !deal) return { base: 0, fee: 0, rule: "—" };

  if (building === "상가/사무실") {
    const base = deal === "매매" ? depositMan : leaseBase(depositMan, rentMan);
    const fee = +(base * 0.009).toFixed(2);
    return { base, fee, rule: "상가 0.9‰ (상한없음)" };
  }

  if (building === "오피스텔") {
    if (deal === "매매") {
      const base = depositMan;
      const rate = officeUsage === "상업용" ? 0.009 : 0.005;
      const fee = +(base * rate).toFixed(2);
      return { base, fee, rule: `오피스텔(${officeUsage ?? "주거용"}) ${officeUsage === "상업용" ? "0.9‰" : "0.5‰"} (상한없음)` };
    } else {
      const base = leaseBase(depositMan, rentMan);
      const rate = officeUsage === "상업용" ? 0.009 : 0.004;
      const fee = +(base * rate).toFixed(2);
      return { base, fee, rule: `오피스텔(${officeUsage ?? "주거용"}) ${officeUsage === "상업용" ? "0.9‰" : "0.4‰"} (상한없음)` };
    }
  }

  if (deal !== "매매") {
    const base = leaseBase(depositMan, rentMan);
    const B5K = 5000, B1OK = 10000, B6OK = 60000, B12OK = 120000, B15OK = 150000;
    let rate = 0.003, cap: number | null = null;
    if (base < B5K) { rate = 0.005; cap = 20; }
    else if (base < B1OK) { rate = 0.004; cap = 30; }
    else if (base < B6OK) { rate = 0.003; }
    else if (base < B12OK) { rate = 0.004; }
    else if (base < B15OK) { rate = 0.005; }
    else { rate = 0.006; }
    let fee = +(base * rate).toFixed(2);
    if (cap !== null) fee = Math.min(fee, cap);
    const capTxt = cap !== null ? `, 상한 ${cap.toFixed(2)}만원` : "";
    return { base, fee, rule: `주택(월세) ${Math.round(rate * 1000) / 10}%o${capTxt}` };
  }

  const base = depositMan;
  const B5K = 5000, B2OK = 20000, B9OK = 90000, B12OK = 120000, B15OK = 150000;
  let rate = 0.004, cap: number | null = null, band = "";
  if (base < B5K) { rate = 0.006; cap = 25; band = "<5천만"; }
  else if (base < B2OK) { rate = 0.005; cap = 80; band = "5천만~2억"; }
  else if (base < B9OK) { rate = 0.004; band = "이억~구억"; }
  else if (base < B12OK) { rate = 0.005; band = "구억~십이억"; }
  else if (base < B15OK) { rate = 0.006; band = "십이억~십오억"; }
  else { rate = 0.007; band = "십오억~"; }
  let fee = +(base * rate).toFixed(2);
  if (cap !== null) fee = Math.min(fee, cap);
  const capTxt = cap !== null ? `, 상한 ${cap.toFixed(2)}만원` : "";
  return { base, fee, rule: `주택(매매) ${Math.round(rate * 1000) / 10}%o ${band}${capTxt}` };
}

/** 해당 날짜가 현재 선택한 month(YYYY-MM)에 속하는지 */
function isInMonth(dateStr?: string, month?: string) {
  if (!dateStr || !month) return false;
  const [yy, mm] = month.split("-").map((s) => parseInt(s, 10));
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getFullYear() === yy && d.getMonth() + 1 === mm;
}

/** ===== CSV ===== */
function downloadCSV(filename: string, rows: Record<string, any>[], headers: string[]) {
  try {
    const esc = (s = "") => `"${String(s).replace(/"/g, '""')}"`;
    const head = headers.map(esc).join(",");
    const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
  } catch {}
}

/** ===== 상태 기억 키 ===== */
const LS_KEY = "daesu:billing:viewstate";

export default function BillingPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  const [items, setItems] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);

  // 뷰 상태(검색/토글/월)
  const [month, setMonth] = useState<string>(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [q, setQ] = useState("");
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyNoReceipt, setOnlyNoReceipt] = useState(false);
  const [onlyThisMonth, setOnlyThisMonth] = useState(false); // 잔금/입주가 선택월인 것만

  // 모달(등록/수정)
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // ✅ 담당자: 임대/임차 각각 쉼표 구분 텍스트로 입력 → 저장시 배열로 변환
  const [agentLText, setAgentLText] = useState("");
  const [agentTText, setAgentTText] = useState("");
  const [address, setAddress] = useState("");
  const [depositMan, setDepositMan] = useState("0");
  const [rentMan, setRentMan] = useState("0");

  // 건물/거래유형
  const [buildingType, setBuildingType] = useState<Bldg | "">("");
  const [dealType, setDealType] = useState<Deal | "">("");
  const [officeUsage, setOfficeUsage] = useState<OfficeUsage>("주거용");

  // 날짜
  const [datePrelim, setDatePrelim] = useState("");
  const [dateSign, setDateSign] = useState("");
  const [dateInterim, setDateInterim] = useState("");
  const [dateClosing, setDateClosing] = useState("");

  // 당사자(금액/시점)
  const [land, setLand] = useState<Party>({
    dueStage: DEFAULT_STAGE, expect: "0", received: "0", vatIncluded: true,
    receivedDate: "", receivedCash: "0", receivedBank: "0",
  });
  const [ten, setTen] = useState<Party>({
    dueStage: DEFAULT_STAGE, expect: "0", received: "0", vatIncluded: true,
    receivedDate: "", receivedCash: "0", receivedBank: "0",
  });

  // 성함/연락처
  const [landlordName, setLandlordName] = useState("");
  const [landlordPhone, setLandlordPhone] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");

  // ✅ 상태 플래그 UI 상태
  const [paidDone, setPaidDone] = useState(false);
  const [receiptIssued, setReceiptIssued] = useState(false);

  const [memo, setMemo] = useState("");

  // 초기 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/billing`, { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`목록 조회 실패: ${res.status} ${res.statusText} ${t}`);
        }
        const arr = (await res.json()) as Billing[];
        if (!alive) return;
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(arr);
      } catch (e: any) {
        console.error(e); alert(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [baseUrl]);

  // 뷰상태 복원
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (s) {
        if (s.month) setMonth(s.month);
        if (typeof s.q === "string") setQ(s.q);
        if (typeof s.onlyUnpaid === "boolean") setOnlyUnpaid(s.onlyUnpaid);
        if (typeof s.onlyNoReceipt === "boolean") setOnlyNoReceipt(s.onlyNoReceipt);
        if (typeof s.onlyThisMonth === "boolean") setOnlyThisMonth(s.onlyThisMonth);
      }
    } catch {}
  }, []);
  // 뷰상태 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ month, q, onlyUnpaid, onlyNoReceipt, onlyThisMonth }));
    } catch {}
  }, [month, q, onlyUnpaid, onlyNoReceipt, onlyThisMonth]);

  // 잔금/입주 입력 시 수령일 자동복사
  useEffect(() => {
    if (dateClosing) {
      setLand((s) => ({ ...s, receivedDate: dateClosing }));
      setTen((s) => ({ ...s, receivedDate: dateClosing }));
    }
  }, [dateClosing]);

  // 중개보수 자동 계산
  const calc = useMemo(() => {
    const dep = num(depositMan);
    const rent = num(rentMan);
    return computeBrokerage(
      (buildingType || undefined) as Bldg | undefined,
      (dealType || undefined) as Deal | undefined,
      dep,
      rent,
      officeUsage
    );
  }, [buildingType, dealType, depositMan, rentMan, officeUsage]);

  // 받을금액 자동 제안(포함금액). 사용자가 값을 넣었으면 덮어쓰지 않음
  const lastAuto = useRef<number>(0);
  useEffect(() => {
    const supply = calc.fee;
    const included = deriveVat(supply, false).total;
    const landTouched = num(land.expect) !== lastAuto.current && num(land.expect) !== 0;
    const tenTouched  = num(ten.expect)  !== lastAuto.current && num(ten.expect)  !== 0;
    if (!landTouched) setLand((s) => ({ ...s, expect: asPlain(included) }));
    if (!tenTouched)  setTen((s)  => ({ ...s, expect: asPlain(included) }));
    lastAuto.current = included;
  }, [calc.fee]); // eslint-disable-line

  /** ===== 합계(전체) ===== */
  const totals = useMemo(() => {
    let expSupply=0, expVat=0, expTotal=0;
    let recSupply=0, recVat=0, recTotal=0;

    for (const it of items) {
      if (it.landlord) {
        const d = deriveVat(num(it.landlord.expect ?? "0"), true);
        expSupply += d.supply; expVat += d.vat; expTotal += d.total;
      }
      if (it.tenant) {
        const d = deriveVat(num(it.tenant.expect ?? "0"), true);
        expSupply += d.supply; expVat += d.vat; expTotal += d.total;
      }
      if (it.landlord) {
        const d = deriveVat(num(it.landlord.received ?? "0"), !!it.landlord.vatIncluded);
        recSupply += d.supply; recVat += d.vat; recTotal += d.total;
      }
      if (it.tenant) {
        const d = deriveVat(num(it.tenant.received ?? "0"), !!it.tenant.vatIncluded);
        recSupply += d.supply; recVat += d.vat; recTotal += d.total;
      }
    }
    return { expSupply, expVat, expTotal, recSupply, recVat, recTotal };
  }, [items]);

  /** ===== 월별 통계(잔금/입주 기준 입금액) & 계약건수(가계약 기준) ===== */
  const monthStats = useMemo(() => {
    if (!month) return { cnt: 0, supply: 0, vat: 0, total: 0 };

    const cnt = items.filter((it) => isInMonth(it.datePrelim, month)).length;
    const inMonthItems = items.filter((it) => isInMonth(it.dateClosing, month));

    let supply = 0, vat = 0, total = 0;
    for (const it of inMonthItems) {
      for (const p of [it.landlord, it.tenant]) {
        if (!p) continue;
        const d = deriveVat(num(p.received ?? "0"), !!p.vatIncluded);
        supply += d.supply; vat += d.vat; total += d.total;
      }
    }
    return { cnt, supply:+supply.toFixed(2), vat:+vat.toFixed(2), total:+total.toFixed(2) };
  }, [items, month]);

  /** ===== 리스트: 월/검색/토글 필터 ===== */
  const displayedItems = useMemo(() => {
    let arr = items.filter((it) => isInMonth(it.datePrelim, month));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const agentText = (arr: string[]|undefined) => (arr||[]).join(",").toLowerCase();
      arr = arr.filter((it) =>
        (it.address||"").toLowerCase().includes(needle) ||
        (it.memo||"").toLowerCase().includes(needle) ||
        agentText(it.agentL).includes(needle) ||
        agentText(it.agentT).includes(needle) ||
        (it.landlordName||"").toLowerCase().includes(needle) ||
        (it.tenantName||"").toLowerCase().includes(needle)
      );
    }
    if (onlyUnpaid) arr = arr.filter((it)=> !it.paidDone);
    if (onlyNoReceipt) arr = arr.filter((it)=> !it.receiptIssued);
    if (onlyThisMonth) arr = arr.filter((it)=> isInMonth(it.dateClosing, month));

    // 가계약일 최근순 정렬
    arr.sort((a,b)=> new Date(b.datePrelim||0).getTime() - new Date(a.datePrelim||0).getTime());
    return arr;
  }, [items, month, q, onlyUnpaid, onlyNoReceipt, onlyThisMonth]);

  /** ===== 입력 초기화 ===== */
  const resetInputs = () => {
    setAgentLText(""); setAgentTText(""); setAddress("");
    setDepositMan("0"); setRentMan("0");
    setBuildingType(""); setDealType(""); setOfficeUsage("주거용");
    setDatePrelim(""); setDateSign(""); setDateInterim(""); setDateClosing("");
    setLand({ dueStage: DEFAULT_STAGE, expect: "0", received: "0", vatIncluded: true, receivedDate: "", receivedCash: "0", receivedBank: "0" });
    setTen({  dueStage: DEFAULT_STAGE, expect: "0", received: "0", vatIncluded: true, receivedDate: "", receivedCash: "0", receivedBank: "0" });
    setLandlordName(""); setLandlordPhone(""); setTenantName(""); setTenantPhone("");
    setPaidDone(false); setReceiptIssued(false); setMemo("");
    lastAuto.current = 0;
  };

  /** ===== 수정용 값 채우기 ===== */
  const loadFromItem = (it: Billing) => {
    const lArr = Array.isArray(it.agentL) ? it.agentL : (it.agent ? [it.agent] : []);
    const tArr = Array.isArray(it.agentT) ? it.agentT : [];
    setAgentLText(lArr.join(",")); setAgentTText(tArr.join(","));
    setBuildingType((it.buildingType ?? "") as Bldg | ""); setDealType((it.dealType ?? "") as Deal | "");
    setOfficeUsage((it.officeUsage ?? "주거용") as OfficeUsage);
    setAddress(it.address ?? ""); setDepositMan(it.depositMan ?? "0"); setRentMan(it.rentMan ?? "0");
    setDatePrelim(it.datePrelim ?? ""); setDateSign(it.dateSign ?? ""); setDateInterim(it.dateInterim ?? ""); setDateClosing(it.dateClosing ?? "");
    setLand({
      dueStage: it.landlord?.dueStage ?? DEFAULT_STAGE,
      expect: it.landlord?.expect ?? "0",
      received: it.landlord?.received ?? "0",
      vatIncluded: !!it.landlord?.vatIncluded,
      receivedDate: it.landlord?.receivedDate ?? "",
      receivedCash: it.landlord?.receivedCash ?? "0",
      receivedBank: it.landlord?.receivedBank ?? "0",
    });
    setTen({
      dueStage: it.tenant?.dueStage ?? DEFAULT_STAGE,
      expect: it.tenant?.expect ?? "0",
      received: it.tenant?.received ?? "0",
      vatIncluded: !!it.tenant?.vatIncluded,
      receivedDate: it.tenant?.receivedDate ?? "",
      receivedCash: it.tenant?.receivedCash ?? "0",
      receivedBank: it.tenant?.receivedBank ?? "0",
    });
    setLandlordName(it.landlordName ?? ""); setLandlordPhone(it.landlordPhone ?? "");
    setTenantName(it.tenantName ?? ""); setTenantPhone(it.tenantPhone ?? "");
    setPaidDone(!!it.paidDone); setReceiptIssued(!!it.receiptIssued);
    setMemo(it.memo ?? ""); lastAuto.current = 0;
  };

  /** ===== 등록/수정 저장 ===== */
  async function handleSubmit() {
    try {
      const toAgents = (s: string) => s.split(",").map(v => v.trim()).filter(Boolean);
      const landSum = num(land.receivedCash ?? "0") + num(land.receivedBank ?? "0");
      const tenSum  = num(ten.receivedCash ?? "0") + num(ten.receivedBank ?? "0");
      const landAgents = toAgents(agentLText); const tenAgents  = toAgents(agentTText);

      const body: Billing = {
        createdAt: editId
          ? (items.find(i => i._id === editId)?.createdAt ?? new Date().toISOString())
          : new Date().toISOString(),
        agentL: landAgents, agentT: tenAgents,
        agent: landAgents[0] ?? tenAgents[0] ?? undefined,
        buildingType: (buildingType || undefined) as Bldg | undefined,
        dealType: (dealType || undefined) as Deal | undefined,
        officeUsage: buildingType === "오피스텔" ? (officeUsage as OfficeUsage) : undefined,
        address: address.trim() || undefined,
        depositMan: cleanUpTo2(depositMan),
        rentMan: cleanUpTo2(rentMan),
        datePrelim, dateSign, dateInterim, dateClosing,
        landlord: {
          ...land,
          dueStage: land.dueStage,
          expect: cleanUpTo2(land.expect),
          received: asPlain(landSum),
          receivedCash: cleanUpTo2(land.receivedCash ?? "0"),
          receivedBank: cleanUpTo2(land.receivedBank ?? "0"),
          vatIncluded: land.vatIncluded,
        },
        tenant: {
          ...ten,
          dueStage: ten.dueStage,
          expect: cleanUpTo2(ten.expect),
          received: asPlain(tenSum),
          receivedCash: cleanUpTo2(ten.receivedCash ?? "0"),
          receivedBank: cleanUpTo2(ten.receivedBank ?? "0"),
          vatIncluded: ten.vatIncluded,
        },
        memo: memo.trim() || undefined,
        landlordName: landlordName.trim() || undefined,
        landlordPhone: landlordPhone.trim() || undefined,
        tenantName: tenantName.trim() || undefined,
        tenantPhone: tenantPhone.trim() || undefined,
        paidDone, receiptIssued,
      };

      const base = process.env.NEXT_PUBLIC_BASE_URL || "";
      const url = editId ? `${base}/api/billing/${editId}` : `${base}/api/billing`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include",
      });

      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`; try { const t = await res.text(); if (t) msg += `\n${t}`; } catch {}
        alert(`저장 실패:\n${msg}`); return;
      }

      const saved = (await res.json()) as Billing;
      if (editId) setItems((s) => s.map((x) => (x._id === saved._id ? saved : x)));
      else setItems((s) => [saved, ...s]);

      setOpen(false); setEditId(null); resetInputs();
    } catch (e: any) { alert(`저장 중 오류: ${e?.message || String(e)}`); }
  }

  /** 🗑 삭제 */
  async function handleDelete() {
    if (!editId) return;
    if (!confirm("정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    const url = `${baseUrl}/api/billing/${editId}`;
    const res = await fetch(url, { method: "DELETE", credentials: "include" });
    if (!res.ok) { const t = await res.text().catch(() => ""); alert(`삭제 실패: ${res.status} ${t || ""}`.trim()); return; }
    setItems((s) => s.filter((x) => x._id !== editId));
    setOpen(false); setEditId(null); resetInputs();
  }

  /** 메모 2줄 요약 */
  const briefMemo = (m?: string) => {
    const s = (m ?? "-").replace(/\n/g, "");
    const wrapped = s.replace(/(.{45})/g, "$1\n").split("\n");
    const first = wrapped[0] ?? "";
    const secondRaw = (wrapped[1] ?? "");
    const needEllipsis = s.length > (first.length + secondRaw.length);
    const second = secondRaw ? (secondRaw.slice(0, 45) + (needEllipsis ? "..." : "")) : "";
    return (first + (second ? "\n" + second : "")).trim();
  };

  /** CSV 내보내기(현재 표시 행) */
  const exportDisplayedCSV = () => {
    if (!displayedItems.length) { alert("내보낼 데이터가 없습니다."); return; }
    const rows = displayedItems.map((it) => {
      const lExp = num(it.landlord?.expect ?? "0");
      const tExp = num(it.tenant?.expect ?? "0");
      return {
        가계약일: fmtDate10(it.datePrelim),
        주소: it.address || "",
        담당임대: (it.agentL||[]).join(","),
        담당임차: (it.agentT||[]).join(","),
        임대인성함: it.landlordName||"",
        임차인성함: it.tenantName||"",
        임대인받을금액_만원: lExp,
        임차인받을금액_만원: tExp,
        합계_만원: +(lExp + tExp).toFixed(2),
        잔금입주일: fmtDate10(it.dateClosing),
        입금완료: it.paidDone ? "Y" : "N",
        영수증발급: it.receiptIssued ? "Y" : "N",
        메모요약: (it.memo||"").replace(/\s+/g," ").slice(0,120),
      };
    });
    downloadCSV(`billing-${month}.csv`, rows, Object.keys(rows[0]));
  };

  // Esc로 모달 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setEditId(null); } };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <main className="w-full max-w-none px-2 md:px-4 py-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button className="px-3 py-1.5 border rounded-lg hover:bg-gray-50" onClick={() => router.push("/dashboard")}>← 대시보드</button>
        <h1 className="text-2xl font-bold">결제/청구</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 border rounded-lg" onClick={exportDisplayedCSV}>CSV 다운로드</button>
          <button className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white hover:opacity-90" onClick={() => { setEditId(null); resetInputs(); setOpen(true); }}>
            + 등록
          </button>
        </div>
      </div>

      {/* 합계 & 월필터 */}
      <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* (1) 미수 합계 */}
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="font-semibold text-gray-700 mb-2 whitespace-nowrap">미수 합계(만원)</div>
          <div className="grid grid-cols-3 text-center">
            <div>공급가<br /><span className="text-xl font-bold">{fmtManSmart(totals.expSupply)}</span></div>
            <div>부가세<br /><span className="text-xl font-bold">{fmtManSmart(totals.expVat)}</span></div>
            <div>합계<br /><span className="text-xl font-bold">{fmtManSmart(totals.expTotal)}</span></div>
          </div>
        </div>

        {/* (2) 입금 합계 */}
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="font-semibold text-gray-700 mb-2 whitespace-nowrap">입금 합계(만원)</div>
          <div className="grid grid-cols-3 text-center">
            <div>공급가<br /><span className="text-xl font-bold">{fmtManSmart(totals.recSupply)}</span></div>
            <div>부가세<br /><span className="text-xl font-bold">{fmtManSmart(totals.recVat)}</span></div>
            <div>합계<br /><span className="text-xl font-bold">{fmtManSmart(totals.recTotal)}</span></div>
          </div>
        </div>

        {/* (3) 월 선택 + 해당월 매출/건수 */}
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center gap-3 justify-between mb-2">
            <label className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="text-gray-600">월 선택</span>
              <input type="month" className="border rounded px-2 h-9 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
            </label>
            <div className="text-[12px] text-gray-600 whitespace-nowrap">계약건수: {monthStats.cnt}건</div>
          </div>
          <div className="grid grid-cols-3 text-center">
            <div>공급가<br /><span className="text-xl font-bold">{fmtManSmart(monthStats.supply)}</span></div>
            <div>부가세<br /><span className="text-xl font-bold">{fmtManSmart(monthStats.vat)}</span></div>
            <div>합계<br /><span className="text-xl font-bold">{fmtManSmart(monthStats.total)}</span></div>
          </div>
        </div>
      </div>

      {/* 검색/필터 줄 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="주소·메모·담당·성함 검색" className="border rounded-lg px-3 py-1.5 w-72" />
          <button className="px-2.5 py-1.5 border rounded-lg" onClick={()=>setQ("")}>지우기</button>
        </div>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 select-none">
            <input type="checkbox" className="w-4 h-4" checked={onlyUnpaid} onChange={(e)=>setOnlyUnpaid(e.target.checked)} /><span>입금 미완료만</span>
          </label>
          <label className="inline-flex items-center gap-2 select-none">
            <input type="checkbox" className="w-4 h-4" checked={onlyNoReceipt} onChange={(e)=>setOnlyNoReceipt(e.target.checked)} /><span>영수증 미발급만</span>
          </label>
          <label className="inline-flex items-center gap-2 select-none">
            <input type="checkbox" className="w-4 h-4" checked={onlyThisMonth} onChange={(e)=>setOnlyThisMonth(e.target.checked)} /><span>이번달 잔금만</span>
          </label>
        </div>
      </div>

      {/* 표 */}
      <div className="border-y">
        <div className="overflow-auto">
          <table className="min-w-[1300px] w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: `${COL_W.prelim}px` }} />
              <col style={{ width: `${COL_W.agent}px` }} />
              <col style={{ width: `${COL_W.address}px` }} />
              <col style={{ width: `${COL_W.stages}px` }} />
              <col style={{ width: `${COL_W.landlord}px` }} />
              <col style={{ width: `${COL_W.tenant}px` }} />
              <col style={{ width: `${COL_W.fee}px` }} />
              <col style={{ width: `${COL_W.memo}px` }} />
            </colgroup>
            <thead className="bg-gray-100 select-none">
              <tr className="text-left" style={{ height: ROW_H }}>
                <th className="px-3 py-2">가계약일</th>
                <th className="px-3 py-2">담당</th>
                <th className="px-3 py-2">주소</th>
                <th className="px-3 py-2">계약단계 날짜</th>
                <th className="px-3 py-2">임대인(중개보수)</th>
                <th className="px-3 py-2">임차인(중개보수)</th>
                <th className="px-3 py-2">중개보수</th>
                <th className="px-3 py-2">메모</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">불러오는 중…</td></tr>
              )}
              {!loading && displayedItems.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-500">조건에 맞는 건이 없습니다.</td></tr>
              )}
              {displayedItems.map((it, idx) => {
                const stageText = [
                  it.dateSign ? `본 ${it.dateSign}` : "",
                  it.dateInterim ? `중 ${it.dateInterim}` : "",
                  it.dateClosing ? `잔/입 ${it.dateClosing}` : "",
                ].filter(Boolean).join(" / ");

                const lExp = num(it.landlord?.expect ?? "0");
                const tExp = num(it.tenant?.expect ?? "0");
                const lDerE = deriveVat(lExp, true);
                const tDerE = deriveVat(tExp, true);

                const landLabel = (it.landlordName || "").trim() || "임대인";
                const tenantLabel = (it.tenantName || "").trim() || "임차인";
                const landMain = `${landLabel}(${fmtMan2(lExp)})`;
                const tenMain  = `${tenantLabel}(${fmtMan2(tExp)})`;

                const landSub = `→ 공급:${fmtMan2(lDerE.supply)} / 부가세:${fmtMan2(lDerE.vat)}`;
                const tenSub  = `→ 공급:${fmtMan2(tDerE.supply)} / 부가세:${fmtMan2(tDerE.vat)}`;

                const feeIncluded = fmtMan2(lExp + tExp);

                const paid = !!it.paidDone;
                const recpt = !!it.receiptIssued;
                const rowBg = paid && recpt ? "bg-green-50" : paid || recpt ? "bg-blue-50/40" : "";

                const agentL = Array.isArray(it.agentL) ? it.agentL : (it.agent ? [it.agent] : []);
                const agentT = Array.isArray(it.agentT) ? it.agentT : [];
                const agentLText = agentL.length ? agentL.join(", ") : "-";
                const agentTText = agentT.length ? agentT.join(", ") : "-";

                return (
                  <tr
                    key={it._id ?? idx}
                    className={`border-t align-middle cursor-pointer hover:bg-gray-50 ${rowBg}`}
                    style={{ height: ROW_H }}
                    onClick={() => { if (it._id) { setEditId(it._id); loadFromItem(it); setOpen(true); } }}
                    title="클릭하면 수정창이 열립니다"
                  >
                    <td className={`px-3 py-2 ${CLAMP}`}>
                      <div>{fmtDate10(it.datePrelim)}</div>
                      <div className="text-[11px] text-gray-500 flex gap-1">
                        {paid ? <span className="px-1.5 py-[1px] border rounded-full text-[10px]">입금완료</span> : null}
                        {recpt ? <span className="px-1.5 py-[1px] border rounded-full text-[10px]">영수증</span> : null}
                      </div>
                    </td>

                    {/* 두 줄 구조 */}
                    <td className="px-3 py-2">
                      <div className={CLAMP} title={`임대인측: ${agentLText}`}><span className="text-gray-600">임대인측: </span>{agentLText}</div>
                      <div className={CLAMP} title={`임차인측: ${agentTText}`}><span className="text-gray-600">임차인측: </span>{agentTText}</div>
                    </td>

                    <td className={`px-3 py-2 ${CLAMP}`} title={it.address ?? "-"}>{it.address ?? "-"}</td>
                    <td className={`px-3 py-2 ${CLAMP}`} title={stageText}>{stageText || "-"}</td>

                    <td className="px-3 py-2">
                      <div className={CLAMP} title={landMain}>{landMain}</div>
                      <div className="text-[11px] text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis" title={landSub}>{landSub}</div>
                    </td>

                    <td className="px-3 py-2">
                      <div className={CLAMP} title={tenMain}>{tenMain}</div>
                      <div className="text-[11px] text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis" title={tenSub}>{tenSub}</div>
                    </td>

                    <td className={`px-3 py-2 ${CLAMP}`}>{feeIncluded}</td>
                    <td className="px-3 py-2 whitespace-pre-line" title={it.memo ?? "-"}>{briefMemo(it.memo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 등록/수정 모달 ===== */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => { setOpen(false); setEditId(null); }}>
          <div className="bg-white w-[1100px] max-w-[100%] max-h-[92vh] rounded-2xl shadow-lg overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editId ? "청구 수정" : "청구 등록"}</h2>
              <button className="px-2 py-1 border rounded-lg" onClick={() => { setOpen(false); setEditId(null); }}>닫기</button>
            </div>

            {/* === 폼 === */}
            <div className="p-5 space-y-5">
              {/* (1) 건물/임대유형 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">건물유형</div>
                    <select value={buildingType} onChange={(e) => setBuildingType(e.target.value as Bldg | "")} className="border rounded px-2 h-10 text-sm w-full">
                      <option value="">선택</option>
                      <option>단독/다가구</option>
                      <option>다세대/빌라</option>
                      <option>아파트</option>
                      <option>오피스텔</option>
                      <option>상가/사무실</option>
                      <option>재개발/재건축</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">임대유형</div>
                    <select value={dealType} onChange={(e) => setDealType(e.target.value as Deal | "")} className="border rounded px-2 h-10 text-sm w-full">
                      <option value="">선택</option>
                      <option>월세</option>
                      <option>전세</option>
                      <option>매매</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="text-[12px] text-gray-600">
                      {buildingType && dealType
                        ? `기준가: ${dealType === "매매" ? "매매가" : "환산가"} ${fmtMan2(calc.base)} 만원 / 중개보수(부가세 제외): ${fmtMan2(calc.fee)} 만원`
                        : "유형 선택 시 자동 계산"}
                      <div className="text-[11px] text-gray-500">{calc.rule}</div>
                    </div>
                  </div>
                </div>

                {buildingType === "오피스텔" && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-600 mb-1">오피스텔 용도</div>
                    <select value={officeUsage} onChange={(e) => setOfficeUsage(e.target.value as OfficeUsage)} className="border rounded px-2 h-10 text-sm w-full max-w-[240px]">
                      <option>주거용</option>
                      <option>상업용</option>
                    </select>
                  </div>
                )}
              </section>

              {/* (2) 기본정보 + 성함/연락처 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 왼쪽 */}
                  <div className="space-y-3">
                    {/* 담당 */}
                    <div className="max-w-[260px]">
                      <div className="text-xs font-medium text-gray-600 mb-1">담당(임대인측)</div>
                      <input value={agentLText} onChange={(e) => setAgentLText(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" placeholder="예: 강실장, 김과장" />
                      <div className="text-[11px] text-gray-500 mt-1">쉼표(,)로 여러명 입력</div>
                    </div>
                    <div className="max-w-[260px]">
                      <div className="text-xs font-medium text-gray-600 mb-1">담당(임차인측)</div>
                      <input value={agentTText} onChange={(e) => setAgentTText(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" placeholder="예: 박대리" />
                      <div className="text-[11px] text-gray-500 mt-1">쉼표(,)로 여러명 입력</div>
                    </div>

                    <div className="max-w-[260px]">
                      <div className="text-xs font-medium text-gray-600 mb-1">주소</div>
                      <input value={address} onChange={(e) => setAddress(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" placeholder="예:천호동 166-82" />
                    </div>
                    <div className="max-w-[260px]">
                      <div className="text-xs font-medium text-gray-600 mb-1">{dealType === "매매" ? "매매가(만원)" : "보증금(만원)"}</div>
                      <input value={depositMan} onChange={(e) => setDepositMan(cleanUpTo2(e.target.value))} className="border rounded px-3 h-10 text-sm w-full" />
                    </div>
                    <div className="max-w-[260px]">
                      <div className="text-xs font-medium text-gray-600 mb-1">{dealType === "매매" ? "월세(사용안함)" : "월세(만원)"}</div>
                      <input value={rentMan} onChange={(e) => setRentMan(cleanUpTo2(e.target.value))} className="border rounded px-3 h-10 text-sm w-full" disabled={dealType === "매매"} />
                    </div>
                  </div>

                  {/* 중간: 임대인 */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">임대인 정보</div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">성함</div>
                      <input value={landlordName} onChange={(e) => setLandlordName(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" placeholder="예: 홍길동" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">연락처</div>
                      <input value={landlordPhone} onChange={(e) => setLandlordPhone(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" placeholder="예: 010-1234-5678" />
                    </div>
                  </div>

                  {/* 오른쪽: 임차인 */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">임차인 정보</div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">성함</div>
                      <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" placeholder="예: 김철수" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">연락처</div>
                      <input value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" placeholder="예: 010-9876-5432" />
                    </div>
                  </div>
                </div>
              </section>

              {/* (3) 날짜 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">계약단계 날짜</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">가계약</label>
                    <input type="date" value={datePrelim} onChange={(e) => setDatePrelim(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">본계약</label>
                    <input type="date" value={dateSign} onChange={(e) => setDateSign(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">중도금</label>
                    <input type="date" value={dateInterim} onChange={(e) => setDateInterim(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">잔금/입주</label>
                    <input type="date" value={dateClosing} onChange={(e) => setDateClosing(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" title="변경 시 임대/임차 수령일에 복사됩니다." />
                  </div>
                </div>
              </section>

              {/* (4) 임대인/임차인 금액/시점 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-6">
                  {/* 임대인 */}
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-3">임대인 청구</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">수취시점</label>
                          <select value={land.dueStage} onChange={(e) => setLand({ ...land, dueStage: e.target.value as Stage })} className="border rounded px-2 h-10 text-sm w-full">
                            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-medium text-gray-600">부가세</label>
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={land.vatIncluded} onChange={(e) => setLand({ ...land, vatIncluded: e.target.checked })} />
                            <span className="text-sm">포함</span>
                          </label>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">수령일(선택)</label>
                          <input type="date" value={land.receivedDate} onChange={(e) => setLand({ ...land, receivedDate: e.target.value })} className="border rounded px-3 h-10 text-sm w-full" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">중개보수(부가세포함) — 받을금액(만원)</label>
                        <input value={land.expect} onChange={(e) => setLand({ ...land, expect: cleanUpTo2(e.target.value) })} className="border rounded px-3 h-10 text-sm w-full" />
                        <div className="text-[11px] text-gray-600 mt-1">{`공급가:${fmtMan2(deriveVat(num(land.expect), true).supply)} / 부가세:${fmtMan2(deriveVat(num(land.expect), true).vat)} / 합계:${fmtMan2(num(land.expect))} (만원)`}</div>
                        <div className="text-[11px] text-blue-600 mt-1">자동(포함): {fmtMan2(deriveVat(calc.fee, false).total)} 만원</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">중개보수(부가세제외) — 자동(만원)</label>
                        <input value={asPlain(calc.fee)} readOnly className="border rounded px-3 h-10 text-sm w-full bg-gray-50" title="중개보수 산정 공급가(부가세 제외)" />
                        <div className="text-[11px] text-gray-500 mt-1">{calc.rule}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">실제받은금액(만원)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="현금" value={land.receivedCash ?? "0"} onChange={(e) => setLand({ ...land, receivedCash: cleanUpTo2(e.target.value) })} className="border rounded px-3 h-10 text-sm w-full" />
                          <input placeholder="계좌이체" value={land.receivedBank ?? "0"} onChange={(e) => setLand({ ...land, receivedBank: cleanUpTo2(e.target.value) })} className="border rounded px-3 h-10 text-sm w-full" />
                        </div>
                        <div className="text-[11px] text-gray-600 mt-1">합계:{fmtMan2(num(land.receivedCash ?? "0") + num(land.receivedBank ?? "0"))} (만원)</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-300 my-1" />

                  {/* 임차인 */}
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-3">임차인 청구</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">수취시점</label>
                          <select value={ten.dueStage} onChange={(e) => setTen({ ...ten, dueStage: e.target.value as Stage })} className="border rounded px-2 h-10 text-sm w-full">
                            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-medium text-gray-600">부가세</label>
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={ten.vatIncluded} onChange={(e) => setTen({ ...ten, vatIncluded: e.target.checked })} />
                            <span className="text-sm">포함</span>
                          </label>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">수령일(선택)</label>
                          <input type="date" value={ten.receivedDate} onChange={(e) => setTen({ ...ten, receivedDate: e.target.value })} className="border rounded px-3 h-10 text-sm w-full" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">중개보수(부가세포함) — 받을금액(만원)</label>
                        <input value={ten.expect} onChange={(e) => setTen({ ...ten, expect: cleanUpTo2(e.target.value) })} className="border rounded px-3 h-10 text-sm w-full" />
                        <div className="text-[11px] text-gray-600 mt-1">{`공급가:${fmtMan2(deriveVat(num(ten.expect), true).supply)} / 부가세:${fmtMan2(deriveVat(num(ten.expect), true).vat)} / 합계:${fmtMan2(num(ten.expect))} (만원)`}</div>
                        <div className="text-[11px] text-blue-600 mt-1">자동(포함): {fmtMan2(deriveVat(calc.fee, false).total)} 만원</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">중개보수(부가세제외) — 자동(만원)</label>
                        <input value={asPlain(calc.fee)} readOnly className="border rounded px-3 h-10 text-sm w-full bg-gray-50" />
                        <div className="text-[11px] text-gray-500 mt-1">{calc.rule}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">실제받은금액(만원)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="현금" value={ten.receivedCash ?? "0"} onChange={(e) => setTen({ ...ten, receivedCash: cleanUpTo2(e.target.value) })} className="border rounded px-3 h-10 text-sm w-full" />
                          <input placeholder="계좌이체" value={ten.receivedBank ?? "0"} onChange={(e) => setTen({ ...ten, receivedBank: cleanUpTo2(e.target.value) })} className="border rounded px-3 h-10 text-sm w-full" />
                        </div>
                        <div className="text-[11px] text-gray-600 mt-1">합계:{fmtMan2(num(ten.receivedCash ?? "0") + num(ten.receivedBank ?? "0"))} (만원)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* 푸터: 초기화 / 체크 / 삭제 / 취소 / 저장 */}
            <div className="px-5 py-3 border-t flex items-center justify-between gap-3 flex-wrap">
              <button className="px-3 py-1.5 border rounded-lg" onClick={resetInputs}>초기화</button>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={paidDone} onChange={(e) => setPaidDone(e.target.checked)} />
                  <span className="text-sm">입금 완료</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={receiptIssued} onChange={(e) => setReceiptIssued(e.target.checked)} />
                  <span className="text-sm">영수증 발급</span>
                </label>
              </div>

              <div className="flex gap-2">
                {editId && (
                  <button className="px-3 py-1.5 border rounded-lg text-red-600 border-red-300 hover:bg-red-50" onClick={handleDelete} title="현재 청구를 완전히 삭제합니다">
                    삭제
                  </button>
                )}
                <button className="px-3 py-1.5 border rounded-lg" onClick={() => { setOpen(false); setEditId(null); }}>취소</button>
                <button className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white" onClick={handleSubmit}>
                  {editId ? "수정" : "등록"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
