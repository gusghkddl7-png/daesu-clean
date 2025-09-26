"use client";

import React, { useEffect, useMemo, useState } from "react";

/** 공통 유틸 */
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
const fmtPhone = (s?: string) => {
  const d = onlyDigits(s || "");
  if (!d) return "-";
  if (d.length <= 3) return d;
  if (d.length <= 7) return d.replace(/(\d{3})(\d+)/, "$1-$2");
  return d.replace(/(\d{3})(\d{3,4})(\d{0,4}).*/, (m, a, b, c) =>
    c ? `${a}-${b}-${c}` : `${a}-${b}`
  );
};
const moneyPair = (d?: string, m?: string) =>
  d || m ? `${d || 0}/${m || 0}` : "-";

function dayDiffFromToday(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(+d)) return null;
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((+d - +t) / 86400000);
}

/** 고객/문의 불러오기 (localStorage) */
type Client = {
  id: string;
  staff?: string;
  inquiryDate?: string;
  depositW?: string;
  monthlyW?: string;
  regions?: string[];
  regionAny?: boolean;
  parking?: boolean;
  pets?: boolean;
  fullOption?: boolean;
  needLoan?: boolean;
  roomTypes?: string[];
  moveIn?: string;
  phone?: string;
  memo?: string;
  sourceAlias?: string;
  programs?: string[];
  closed?: boolean;
  labelColor?: string;
};

const loadClients = (): Client[] => {
  try {
    const raw = localStorage.getItem("daesu:clients") || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

/** 급한임차(미러) 행 색상 */
const rowBg = (d: number | null) =>
  d === null
    ? ""
    : d <= 10
    ? "bg-rose-50"
    : d <= 20
    ? "bg-amber-50"
    : d <= 30
    ? "bg-sky-50"
    : "";

/** 읽기전용 모달 */
function ReadOnlyModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: Client | null;
}) {
  if (!open || !data) return null;

  const optionText = (x: Client) => {
    const arr: string[] = [];
    if (x.parking) arr.push("주차");
    if (x.pets) arr.push("동물");
    if (x.fullOption) arr.push("풀옵션");
    if (x.needLoan) arr.push("대출");
    return arr.length ? arr.join("/") : "-";
  };

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50">
      <div className="w-[min(900px,96vw)] bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 relative">
        <button
          className="absolute right-3 top-2 w-8 h-8 rounded-full border bg-white"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <div className="text-lg font-extrabold mb-3">고객 정보 (읽기전용)</div>

        <div className="grid grid-cols-12 gap-3 text-sm">
          <div className="col-span-3 font-semibold text-gray-600">담당</div>
          <div className="col-span-9">{data.staff || "-"}</div>

          <div className="col-span-3 font-semibold text-gray-600">문의날짜</div>
          <div className="col-span-9">{data.inquiryDate || "-"}</div>

          <div className="col-span-3 font-semibold text-gray-600">
            보증금/월세
          </div>
          <div className="col-span-9">
            {moneyPair(data.depositW, data.monthlyW)}
            {Array.isArray(data.programs) && data.programs.length ? (
              <span className="ml-2 text-gray-500">
                {data.programs.map((p) => `(${p})`).join(" ")}
              </span>
            ) : null}
          </div>

          <div className="col-span-3 font-semibold text-gray-600">지역</div>
          <div className="col-span-9">
            {data.regionAny
              ? "상관없음"
              : (data.regions || []).join(", ") || "-"}
          </div>

          <div className="col-span-3 font-semibold text-gray-600">
            요구사항
          </div>
          <div className="col-span-9">{optionText(data)}</div>

          <div className="col-span-3 font-semibold text-gray-600">
            방갯수
          </div>
          <div className="col-span-9">
            {(data.roomTypes || []).join(", ") || "-"}
          </div>

          <div className="col-span-3 font-semibold text-gray-600">
            입주일
          </div>
          <div className="col-span-9">{data.moveIn || "-"}</div>

          <div className="col-span-3 font-semibold text-gray-600">
            유입경로
          </div>
          <div className="col-span-9">{data.sourceAlias || "-"}</div>

          <div className="col-span-3 font-semibold text-gray-600">
            연락처
          </div>
          <div className="col-span-9">{fmtPhone(data.phone)}</div>

          <div className="col-span-3 font-semibold text-gray-600">비고</div>
          <div className="col-span-9 whitespace-pre-wrap">
            {data.memo || "-"}
          </div>
        </div>

        {/* 하단 버튼 없음(읽기전용) */}
      </div>
    </div>
  );
}

/** 페이지 */
export default function UrgentMirrorPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);

  // 실시간 미러: 2초 간격 + storage 이벤트
  useEffect(() => {
    let timer: any;
    const pull = () => setClients(loadClients());
    pull();
    timer = setInterval(pull, 2000);
    const on = (e: StorageEvent) => {
      if (e.key === "daesu:clients") pull();
    };
    window.addEventListener("storage", on);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", on);
    };
  }, []);

  const rows = useMemo(() => {
    return clients
      .filter((c) => {
        const d = dayDiffFromToday(c.moveIn);
        return d !== null && d >= 0 && d <= 30; // D-30 이내만
      })
      .map((c) => ({ ...c, d: dayDiffFromToday(c.moveIn)! }))
      .sort((a, b) => a.d - b.d);
  }, [clients]);

  const onRowClick = (id: string) => {
    const found = clients.find((x) => x.id === id) || null;
    setSelected(found);
    setOpen(!!found);
  };

  return (
    <main className="p-4">
      {/* 상단바 + 범례 */}
      <div className="relative h-10 mb-4">
        <button
          type="button"
          onClick={() =>
            history.length > 1
              ? history.back()
              : (location.href = "/dashboard")
          }
          className="absolute left-0 top-0 px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50"
        >
          ← 뒤로가기
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 top-0 text-xl font-bold">
          급한임차문의
        </h1>
        <div className="absolute right-0 top-0 flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded border bg-rose-50">D≤10</span>
          <span className="px-2 py-1 rounded border bg-amber-50">
            11~20일
          </span>
          <span className="px-2 py-1 rounded border bg-sky-50">
            21~30일
          </span>
        </div>
      </div>

      {/* 표 (고객/문의와 동일한 컬럼, 맨 앞에 D-일만 추가) */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th style={{ width: 90 }}>D-일</th>
              <th style={{ width: 120 }}>날짜</th>
              <th style={{ width: 80 }}>담당</th>
              <th style={{ width: 120 }}>가격</th>
              <th style={{ width: 200 }}>지역</th>
              <th style={{ width: 120 }}>요구사항</th>
              <th style={{ width: 120 }}>방갯수</th>
              <th style={{ width: 110 }}>입주일</th>
              <th style={{ width: 140 }}>유입경로</th>
              <th style={{ width: 140 }}>연락처</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const opts: string[] = [];
              if (c.parking) opts.push("주차");
              if (c.pets) opts.push("동물");
              if (c.fullOption) opts.push("풀옵션");
              if (c.needLoan) opts.push("대출");

              return (
                <tr
                  key={c.id}
                  className={`${rowBg(c.d)} border-t [&>td]:px-3 [&>td]:py-2 cursor-pointer`}
                  onClick={() => onRowClick(c.id)}
                  title="클릭하여 상세 보기"
                >
                  <td>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/70 border">{`D-${c.d}`}</span>
                  </td>
                  <td className="text-gray-700">{c.inquiryDate || "-"}</td>
                  <td className="font-semibold">{c.staff || "-"}</td>
                  <td>{moneyPair(c.depositW, c.monthlyW)}</td>
                  <td title={c.regionAny ? "상관없음" : (c.regions || []).join(", ")}>
                    {c.regionAny ? "상관없음" : (c.regions || []).join(", ") || "-"}
                  </td>
                  <td>{opts.join("/") || "-"}</td>
                  <td>{(c.roomTypes || []).join(", ") || "-"}</td>
                  <td>{c.moveIn || "-"}</td>
                  <td>{c.sourceAlias || "-"}</td>
                  <td>{fmtPhone(c.phone)}</td>
                  <td className="text-gray-600">{c.memo || "-"}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={11} className="text-center text-gray-500 py-6">
                  표시할 임차 문의가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 읽기전용 상세 모달 */}
      <ReadOnlyModal open={open} onClose={() => setOpen(false)} data={selected} />
    </main>
  );
}
