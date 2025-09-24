"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ===== 타입 ===== */
type Stage = "가계약" | "본계약" | "중도금" | "잔금및입주";
const STAGES: Stage[] = ["가계약", "본계약", "중도금", "잔금및입주"];

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
  /** 받을금액(만원) — 항상 '부가세 포함' 금액으로 사용 */
  expect: string;
  /** 실제받은 합계(만원) — 현금+계좌 합계가 저장됨 */
  received: string;
  /** 표시/분해용 플래그: 체크=포함(정방향) */
  vatIncluded: boolean;
  receivedDate: string;

  /** UI 입력값 분리 저장 */
  receivedCash?: string;
  receivedBank?: string;
};

type Billing = {
  _id?: string;
  createdAt: string;
  agent: string;

  buildingType?: Bldg;
  dealType?: Deal;
  officeUsage?: OfficeUsage;
  address?: string;
  /** 매매가(만원) 또는 보증금(만원) */
  depositMan?: string;
  /** 월세(만원) */
  rentMan?: string;

  // 단계 날짜
  datePrelim?: string;
  dateSign?: string;
  dateInterim?: string;
  dateClosing?: string;

  landlord: Party;
  tenant: Party;
  memo?: string;
};

/** ===== 고정 레이아웃(컬럼 너비) =====
 * 👉 칸 크기 바꾸고 싶으면 아래 숫자만 수정하세요.
 */
const COL_W = {
  created: 110,   // 생성일
  agent: 80,      // 담당
  address: 200,   // 주소
  stages: 360,    // 계약단계 날짜
  landlord: 340,  // 임대인 요약
  tenant: 340,    // 임차인 요약
  fee: 220,       // 중개보수(포함, 임대/임차)
  memo: 240,      // 메모
} as const;
const ROW_H = 60;
const SUMMARY_H = 80;
const CLAMP = "whitespace-nowrap overflow-hidden text-ellipsis";

/** ===== 숫자 유틸 ===== */
// 입력: 숫자/소수점만, 소수점 2자리, 소수점은 직접 찍을 때만 보이게
function cleanUpTo2(v: string) {
  let s = (v ?? "").toString().replace(/[^0-9.]/g, "");
  const idx = s.indexOf(".");
  if (idx === -1) return s.replace(/^0+(?=\d)/, "") || "0";
  const head = (s.slice(0, idx).replace(/^0+(?=\d)/, "") || "0").replace(/\./g, "");
  const tail = s.slice(idx + 1).replace(/\./g, "").slice(0, 2);
  return head + (tail.length ? "." + tail : ".");
}
const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
// 2자리 고정
const fmtMan2 = (n: number) =>
  n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// 소수점이 0이면 안보이게, 있으면 최대 2자리
function fmtManSmart(n: number) {
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: isInt ? 0 : 2,
    maximumFractionDigits: isInt ? 0 : 2,
  });
}
const asPlain = (n: number) => {
  const s = n.toFixed(2);
  return s.endsWith(".00") ? String(Math.round(n)) : s.replace(/\.?0$/, "");
};
const fmtDate10 = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "-" : d.toISOString().slice(0, 10);
};

/** ===== 부가세 계산 (만원 기준) =====
 * included=true  -> 입력값은 '총액', 공급가/부가세 분해
 * included=false -> 입력값은 '공급가', 부가세/총액 계산
 */
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

/** ===== 환산가(만원) =====
 * 기본: 보증금 + 월세×100, 5천만 미만이면 보증금 + 월세×70
 */
function leaseBase(depositMan: number, rentMan: number) {
  const base100 = depositMan + rentMan * 100;
  const base = base100 < 5000 ? depositMan + rentMan * 70 : base100;
  return +base.toFixed(2);
}

/** ===== 중개보수 계산(만원, 부가세 제외) ===== */
function computeBrokerage(
  building: Bldg | undefined,
  deal: Deal | undefined,
  depositMan: number,
  rentMan: number,
  officeUsage?: OfficeUsage
) {
  if (!building || !deal) return { base: 0, fee: 0, rule: "—" };

  // 상가/사무실: 모든 거래유형 0.9‰
  if (building === "상가/사무실") {
    const base = deal === "매매" ? depositMan : leaseBase(depositMan, rentMan);
    const fee = +(base * 0.009).toFixed(2);
    return { base, fee, rule: "상가 0.9‰ (상한없음)" };
  }

  // 오피스텔
  if (building === "오피스텔") {
    if (deal === "매매") {
      const base = depositMan;
      const rate = officeUsage === "상업용" ? 0.009 : 0.005;
      const fee = +(base * rate).toFixed(2);
      return {
        base,
        fee,
        rule: `오피스텔(${officeUsage ?? "주거용"}) ${
          officeUsage === "상업용" ? "0.9‰" : "0.5‰"
        } (상한없음)`,
      };
    } else {
      const base = leaseBase(depositMan, rentMan);
      const rate = officeUsage === "상업용" ? 0.009 : 0.004;
      const fee = +(base * rate).toFixed(2);
      return {
        base,
        fee,
        rule: `오피스텔(${officeUsage ?? "주거용"}) ${
          officeUsage === "상업용" ? "0.9‰" : "0.4‰"
        } (상한없음)`,
      };
    }
  }

  // 주택 + 월세/전세
  if (deal !== "매매") {
    const base = leaseBase(depositMan, rentMan);
    const B5K = 5000,
      B1OK = 10000,
      B6OK = 60000,
      B12OK = 120000,
      B15OK = 150000;
    let rate = 0.003,
      cap: number | null = null,
      band = "";
    if (base < B5K) {
      rate = 0.005;
      cap = 20;
      band = "<5천만";
    } else if (base < B1OK) {
      rate = 0.004;
      cap = 30;
      band = "5천만~1억";
    } else if (base < B6OK) {
      rate = 0.003;
      band = "1억~6억";
    } else if (base < B12OK) {
      rate = 0.004;
      band = "6억~12억";
    } else if (base < B15OK) {
      rate = 0.005;
      band = "12억~15억";
    } else {
      rate = 0.006;
      band = "15억~";
    }
    let fee = +(base * rate).toFixed(2);
    if (cap !== null) fee = Math.min(fee, cap);
    const capTxt = cap !== null ? `, 상한 ${cap.toFixed(2)}만원` : "";
    return {
      base,
      fee,
      rule: `주택(월세) ${band} ${Math.round(rate * 1000) / 10}%o${capTxt}`,
    };
  }

  // 주택 + 매매 (아파트/단독/다가구/다세대/빌라/재개발)
  const base = depositMan;
  const B5K = 5000,
    B2OK = 20000,
    B9OK = 90000,
    B12OK = 120000,
    B15OK = 150000;
  let rate = 0.004,
    cap: number | null = null,
    band = "";
  if (base < B5K) {
    rate = 0.006;
    cap = 25;
    band = "<5천만";
  } else if (base < B2OK) {
    rate = 0.005;
    cap = 80;
    band = "5천만~2억";
  } else if (base < B9OK) {
    rate = 0.004;
    band = "2억~9억";
  } else if (base < B12OK) {
    rate = 0.005;
    band = "9억~12억";
  } else if (base < B15OK) {
    rate = 0.006;
    band = "12억~15억";
  } else {
    rate = 0.007;
    band = "15억~";
  }
  let fee = +(base * rate).toFixed(2);
  if (cap !== null) fee = Math.min(fee, cap);
  const capTxt = cap !== null ? `, 상한 ${cap.toFixed(2)}만원` : "";
  return {
    base,
    fee,
    rule: `주택(매매) ${band} ${Math.round(rate * 1000) / 10}%o${capTxt}`,
  };
}

export default function BillingPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  const [items, setItems] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);

  // 모달
  const [open, setOpen] = useState(false);

  // 상단 기본
  const [agent, setAgent] = useState("");
  const [buildingType, setBuildingType] = useState<Bldg | "">("");
  const [dealType, setDealType] = useState<Deal | "">("");
  const [officeUsage, setOfficeUsage] = useState<OfficeUsage>("주거용");
  const [address, setAddress] = useState("");
  const [depositMan, setDepositMan] = useState("0");
  const [rentMan, setRentMan] = useState("0");

  // 날짜
  const [datePrelim, setDatePrelim] = useState("");
  const [dateSign, setDateSign] = useState("");
  const [dateInterim, setDateInterim] = useState("");
  const [dateClosing, setDateClosing] = useState("");

  // 당사자
  const [land, setLand] = useState<Party>({
    dueStage: "본계약",
    expect: "0",
    received: "0",
    vatIncluded: true,
    receivedDate: "",
    receivedCash: "0",
    receivedBank: "0",
  });
  const [ten, setTen] = useState<Party>({
    dueStage: "본계약",
    expect: "0",
    received: "0",
    vatIncluded: true,
    receivedDate: "",
    receivedCash: "0",
    receivedBank: "0",
  });

  const [memo, setMemo] = useState("");

  // 초기 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/billing`, { cache: "no-store" });
        const arr = (await res.json()) as Billing[];
        if (!alive) return;
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(arr);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [baseUrl]);

  // 잔금/입주 → 수령일 자동복사
  useEffect(() => {
    if (dateClosing) {
      setLand((s) => ({ ...s, receivedDate: dateClosing }));
      setTen((s) => ({ ...s, receivedDate: dateClosing }));
    }
  }, [dateClosing]);

  // 중개보수 자동 계산 (fee=부가세 제외)
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

  // 받을금액은 "부가세포함"으로 자동 반영
  const lastAuto = useRef<number>(0);
  useEffect(() => {
    const supply = calc.fee;                             // 공급가(부가세 제외)
    const included = deriveVat(supply, false).total;     // 포함 = 공급가 + 10%
    const landTouched = num(land.expect) !== lastAuto.current && num(land.expect) !== 0;
    const tenTouched  = num(ten.expect)  !== lastAuto.current && num(ten.expect)  !== 0;

    if (!landTouched) setLand((s) => ({ ...s, expect: asPlain(included), vatIncluded: true }));
    if (!tenTouched)  setTen((s)  => ({ ...s, expect: asPlain(included),  vatIncluded: true }));
    lastAuto.current = included;
  }, [calc.fee]); // eslint-disable-line

  // 합계(전체)
  const totals = useMemo(() => {
    let exp = 0, rec = 0;
    for (const it of items) {
      exp += num(it.landlord?.expect ?? "0") + num(it.tenant?.expect ?? "0");
      rec += num(it.landlord?.received ?? "0") + num(it.tenant?.received ?? "0");
    }
    return { exp, rec };
  }, [items]);

  // ===== 월별 필터 & 월 매출/건수 =====
  const [month, setMonth] = useState<string>("2025-09"); // 기본 2025-09
  const monthStats = useMemo(() => {
    if (!month) return { cnt: 0, revenue: 0 };
    const [y, m] = month.split("-").map((s) => parseInt(s, 10));
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    let cnt = 0;
    let revenue = 0;
    for (const it of items) {
      // 수령일 우선, 없으면 createdAt 기준
      const pickDates = [
        it.landlord?.receivedDate,
        it.tenant?.receivedDate,
        it.createdAt?.slice(0, 10),
      ].filter(Boolean) as string[];

      const inMonth = pickDates.some((d) => {
        const dd = new Date(d as string);
        return dd >= start && dd < end;
      });

      if (inMonth) {
        cnt += 1;
        revenue += num(it.landlord?.received ?? "0") + num(it.tenant?.received ?? "0");
      }
    }
    return { cnt, revenue };
  }, [items, month]);

  // 저장
  async function submitNew() {
    if (!agent.trim()) return alert("담당자를 입력하세요.");

    // 현금/계좌 합계 -> received 필드에 저장
    const landSum = num(land.receivedCash ?? "0") + num(land.receivedBank ?? "0");
    const tenSum  = num(ten.receivedCash ?? "0") + num(ten.receivedBank ?? "0");

    const body: Billing = {
      createdAt: new Date().toISOString(),
      agent: agent.trim(),
      buildingType: (buildingType || undefined) as Bldg | undefined,
      dealType: (dealType || undefined) as Deal | undefined,
      officeUsage: buildingType === "오피스텔" ? (officeUsage as OfficeUsage) : undefined,
      address: address.trim() || undefined,
      depositMan: cleanUpTo2(depositMan),
      rentMan: cleanUpTo2(rentMan),
      datePrelim,
      dateSign,
      dateInterim,
      dateClosing,
      landlord: {
        ...land,
        expect: cleanUpTo2(land.expect),
        received: asPlain(landSum),
        receivedCash: cleanUpTo2(land.receivedCash ?? "0"),
        receivedBank: cleanUpTo2(land.receivedBank ?? "0"),
      },
      tenant: {
        ...ten,
        expect: cleanUpTo2(ten.expect),
        received: asPlain(tenSum),
        receivedCash: cleanUpTo2(ten.receivedCash ?? "0"),
        receivedBank: cleanUpTo2(ten.receivedBank ?? "0"),
      },
      memo: memo.trim() || undefined,
    };

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/billing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      alert(`저장 실패: ${res.status} ${t || ""}`.trim());
      return;
    }
    const saved = (await res.json()) as Billing;
    setItems((s) => [saved, ...s]);
    setOpen(false);
  }

  const vatInfo = (v: string, included: boolean) => {
    const d = deriveVat(num(v), included);
    return `공급가:${fmtMan2(d.supply)} / 부가세:${fmtMan2(d.vat)} / 합계:${fmtMan2(d.total)} (만원)`;
  };

  return (
    <main className="w-full max-w-none px-2 md:px-4 py-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
          onClick={() => router.push("/dashboard")}
        >
          ← 대시보드
        </button>
        <h1 className="text-2xl font-bold">결제/청구</h1>
        <button
          className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white hover:opacity-90"
          onClick={() => setOpen(true)}
        >
          + 추가
        </button>
      </div>

      {/* 합계 & 월필터 */}
      <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 왼쪽: 미수+입금 같이 표기 (소수점은 필요할 때만) */}
        <div className="rounded-xl border bg-white p-4 text-sm" style={{ height: SUMMARY_H }}>
          <div className="flex items-center justify-between">
            <div className="text-gray-600">미수 합계(만원)</div>
            <div className="text-xl font-bold">{fmtManSmart(totals.exp)}</div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-gray-600">입금 합계(만원)</div>
            <div className="text-xl font-bold">{fmtManSmart(totals.rec)}</div>
          </div>
        </div>

        {/* 오른쪽: 월 선택 + 해당월 매출/건수 */}
        <div className="rounded-xl border bg-white p-4 text-sm" style={{ height: SUMMARY_H }}>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <label className="inline-flex items-center gap-2">
              <span className="text-gray-600">월 선택</span>
              <input
                type="month"
                className="border rounded px-2 h-9 text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
            <div className="text-right">
              <div className="text-gray-600">해당월 매출(만원, 수령 합계)</div>
              <div className="text-xl font-bold">{fmtManSmart(monthStats.revenue)}</div>
              <div className="text-[12px] text-gray-600">계약건수: {monthStats.cnt}건</div>
            </div>
          </div>
        </div>
      </div>

      {/* 표 */}
      <div className="border-y">
        <div className="overflow-auto">
          <table className="min-w-[1300px] w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: `${COL_W.created}px` }} />
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
                <th className="px-3 py-2">생성일</th>
                <th className="px-3 py-2">담당</th>
                <th className="px-3 py-2">주소</th>
                <th className="px-3 py-2">계약단계 날짜</th>
                <th className="px-3 py-2">임대인 요약(만원)</th>
                <th className="px-3 py-2">임차인 요약(만원)</th>
                <th className="px-3 py-2">중개보수(포함, 임대/임차)</th>
                <th className="px-3 py-2">메모</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                    불러오는 중…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
              {items.map((it, idx) => {
                const stageText = [
                  it.datePrelim ? `가 ${it.datePrelim}` : "",
                  it.dateSign ? `본 ${it.dateSign}` : "",
                  it.dateInterim ? `중 ${it.dateInterim}` : "",
                  it.dateClosing ? `잔/입 ${it.dateClosing}` : "",
                ]
                  .filter(Boolean)
                  .join(" / ");

                const lExp = num(it.landlord?.expect ?? "0"),
                  lRec = num(it.landlord?.received ?? "0"),
                  lInc = !!it.landlord?.vatIncluded;
                const lDerE = deriveVat(lExp, lInc),
                  lDerR = deriveVat(lRec, lInc);

                const tExp = num(it.tenant?.expect ?? "0"),
                  tRec = num(it.tenant?.received ?? "0"),
                  tInc = !!it.tenant?.vatIncluded;
                const tDerE = deriveVat(tExp, tInc),
                  tDerR = deriveVat(tRec, tInc);

                const landText =
                  `${it.landlord?.dueStage ?? "-"} 받을:${fmtMan2(lExp)}(${lInc ? "포함" : "제외"}) → 공급:${fmtMan2(lDerE.supply)} 부가세:${fmtMan2(lDerE.vat)} , 받은:${fmtMan2(lRec)} → 공급:${fmtMan2(lDerR.supply)} 부가세:${fmtMan2(lDerR.vat)}` +
                  (it.landlord?.receivedDate ? ` (${it.landlord.receivedDate})` : "");

                const tenText =
                  `${it.tenant?.dueStage ?? "-"} 받을:${fmtMan2(tExp)}(${tInc ? "포함" : "제외"}) → 공급:${fmtMan2(tDerE.supply)} 부가세:${fmtMan2(tDerE.vat)} , 받은:${fmtMan2(tRec)} → 공급:${fmtMan2(tDerR.supply)} 부가세:${fmtMan2(tDerR.vat)}` +
                  (it.tenant?.receivedDate ? ` (${it.tenant.receivedDate})` : "");

                const feeIncluded = fmtMan2(lExp + tExp);

                return (
                  <tr
                    key={it._id ?? idx}
                    className="border-t align-middle"
                    style={{ height: ROW_H }}
                  >
                    <td className={`px-3 py-2 ${CLAMP}`}>{fmtDate10(it.createdAt)}</td>
                    <td className={`px-3 py-2 ${CLAMP}`}>{it.agent}</td>
                    <td className={`px-3 py-2 ${CLAMP}`} title={it.address ?? "-"}>
                      {it.address ?? "-"}
                    </td>
                    <td className={`px-3 py-2 ${CLAMP}`} title={stageText}>
                      {stageText || "-"}
                    </td>
                    <td className={`px-3 py-2 ${CLAMP}`} title={landText}>
                      {landText}
                    </td>
                    <td className={`px-3 py-2 ${CLAMP}`} title={tenText}>
                      {tenText}
                    </td>
                    <td className={`px-3 py-2 ${CLAMP}`}>{feeIncluded}</td>
                    <td className={`px-3 py-2 ${CLAMP}`} title={it.memo ?? "-"}>
                      {it.memo ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 추가 모달 (기존 기능 유지) ===== */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white w-[1000px] max-w-[100%] max-h-[92vh] rounded-2xl shadow-lg overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">청구 추가</h2>
              <button className="px-2 py-1 border rounded-lg" onClick={() => setOpen(false)}>닫기</button>
            </div>

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

              {/* (2) 담당자 / 주소 / 임대료·매매가 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">담당자 *</div>
                    <input value={agent} onChange={(e) => setAgent(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs font-medium text-gray-600 mb-1">주소</div>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" placeholder="예: 강동구 천호동 166-21" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">{dealType === "매매" ? "매매가(만원)" : "보증금(만원)"}</div>
                    <input value={depositMan} onChange={(e) => setDepositMan(cleanUpTo2(e.target.value))} className="border rounded px-3 h-10 text-sm w-full" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">{dealType === "매매" ? "월세(사용안함)" : "월세(만원)"}</div>
                    <input value={rentMan} onChange={(e) => setRentMan(cleanUpTo2(e.target.value))} className="border rounded px-3 h-10 text-sm w-full" disabled={dealType === "매매"} />
                  </div>
                </div>
              </section>

              {/* (3) 날짜 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">계약단계 날짜</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">가계약</label>
                    <input type="date" value={datePrelim} onChange={(e) => setDatePrelim(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" />
                  </div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">본계약</label>
                    <input type="date" value={dateSign} onChange={(e) => setDateSign(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" />
                  </div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">중도금</label>
                    <input type="date" value={dateInterim} onChange={(e) => setDateInterim(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" />
                  </div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">잔금/입주</label>
                    <input type="date" value={dateClosing} onChange={(e) => setDateClosing(e.target.value)} className="border rounded px-3 h-10 text-sm w-full" title="변경 시 임대/임차 수령일에 복사됩니다." />
                  </div>
                </div>
              </section>

              {/* (4) 임대인/임차인 + 절취선 */}
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
                        <input value={land.expect} onChange={(e) => setLand({ ...land, expect: cleanUpTo2(e.target.value), vatIncluded: true })} className="border rounded px-3 h-10 text-sm w-full" />
                        <div className="text-[11px] text-gray-600 mt-1">{vatInfo(land.expect, true)}</div>
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
                        <div className="text-[11px] text-gray-600 mt-1">
                          합계:{fmtMan2(num(land.receivedCash ?? "0") + num(land.receivedBank ?? "0"))} (만원)
                        </div>
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
                        <input value={ten.expect} onChange={(e) => setTen({ ...ten, expect: cleanUpTo2(e.target.value), vatIncluded: true })} className="border rounded px-3 h-10 text-sm w-full" />
                        <div className="text-[11px] text-gray-600 mt-1">{vatInfo(ten.expect, true)}</div>
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
                        <div className="text-[11px] text-gray-600 mt-1">
                          합계:{fmtMan2(num(ten.receivedCash ?? "0") + num(ten.receivedBank ?? "0"))} (만원)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* (5) 메모 */}
              <section className="rounded-xl border bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">메모</div>
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} className="border rounded px-3 py-2 text-sm w-full min-h-[100px]" placeholder="청구 관련 메모" />
              </section>
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-between">
              <button
                className="px-3 py-1.5 border rounded-lg"
                onClick={() => {
                  setAgent("");
                  setAddress("");
                  setDepositMan("0");
                  setRentMan("0");
                  setBuildingType("");
                  setDealType("");
                  setOfficeUsage("주거용");
                  setDatePrelim("");
                  setDateSign("");
                  setDateInterim("");
                  setDateClosing("");
                  setLand({
                    dueStage: "본계약",
                    expect: "0",
                    received: "0",
                    vatIncluded: true,
                    receivedDate: "",
                    receivedCash: "0",
                    receivedBank: "0",
                  });
                  setTen({
                    dueStage: "본계약",
                    expect: "0",
                    received: "0",
                    vatIncluded: true,
                    receivedDate: "",
                    receivedCash: "0",
                    receivedBank: "0",
                  });
                  setMemo("");
                }}
              >
                초기화
              </button>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border rounded-lg" onClick={() => setOpen(false)}>취소</button>
                <button className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white" onClick={submitNew}>저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
