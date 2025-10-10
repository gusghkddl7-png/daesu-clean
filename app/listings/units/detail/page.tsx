"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * 상세 페이지는 /listings/units/detail?road=서울 강동구 천호대로 123 형식으로 접근.
 * 내부에서 /api/seoul/building?addr=... 를 호출해 서울시 "건축물대장 일반" 정보를 표시합니다.
 * ※ 지도 검색 혼선을 막기 위해 road(도로명주소)만 쿼리로 사용합니다.
 */

type SeoulRow = {
  sigunguCd?: string;
  bjdongCd?: string;
  platGbCd?: string; // 0: 일반, 1: 산
  bun?: string;
  ji?: string;
  mainPurpsCdNm?: string; // 주용도명
  etcPurps?: string;
  useAprDay?: string; // YYYYMMDD
  grndFlrCnt?: string;
  ugrndFlrCnt?: string;
  hhldCnt?: string;
  totArea?: string;
  archArea?: string;
  heit?: string;
  roofCdNm?: string;
  strctCdNm?: string;
  bcRat?: string;
  vlRat?: string;
};

type ApiResp = {
  ok: boolean;
  item?: SeoulRow | null;
  error?: string;
  query?: { addr: string; admCd?: string; bon?: string; bu?: string };
  raw?: any;
};

const UNIT_TYPES = [
  "공동주택",
  "아파트",
  "연립주택",
  "다세대주택",
  "도시형생활주택",
  "오피스텔",
];

function h(val?: string | number, suffix = "") {
  if (val === undefined || val === null || val === "") return "—";
  return `${val}${suffix}`;
}

function ymdToDash(v?: string) {
  if (!v || v.length !== 8) return "—";
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

export default function DetailPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const road = (sp.get("road") || "").trim(); // 도로명주소만 사용

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [row, setRow] = useState<SeoulRow | null>(null);
  const [meta, setMeta] = useState<ApiResp["query"] | undefined>(undefined);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr("");
      setRow(null);
      try {
        if (!road) {
          setErr("도로명주소가 비어 있습니다.");
          setLoading(false);
          return;
        }
        const base = process.env.NEXT_PUBLIC_BASE_URL || "";
        const url = `${base}/api/seoul/building`.replace(/\/{2,}/g, "/").replace(":/", "://");
        const r = await fetch(`${url}?addr=${encodeURIComponent(road)}`, { cache: "no-store" });
        const data: ApiResp = await r.json();

        if (!data.ok) {
          setErr(data.error || "건축물 정보를 불러오지 못했습니다.");
        } else {
          setRow((data.item as SeoulRow) ?? null);
          setMeta(data.query);
        }
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [road]);

  const purps = row?.mainPurpsCdNm || "";
  const isMultiUnit = useMemo(() => UNIT_TYPES.some((t) => purps.includes(t)), [purps]);

  return (
    <main className="w-full max-w-[1180px] mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <button
            className="text-sm text-gray-500 hover:text-black"
            onClick={() => router.back()}
            title="뒤로가기"
          >
            ← 목록으로
          </button>
          <h1 className="text-[20px] font-semibold mt-1">{road || "상세"}</h1>
          {meta?.bon && (
            <div className="text-sm text-gray-500 mt-0.5">
              본번/부번: {meta.bon} - {meta.bu ?? "0"}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="h-9 px-3 rounded-lg border bg-white hover:bg-gray-50"
            onClick={() => location.reload()}
          >
            새로고침
          </button>
          <button
            className="h-9 px-3 rounded-lg border bg-white hover:bg-gray-50"
            // 지도 검색은 도로명주소만 사용
            onClick={() => window.open(`https://map.kakao.com/?q=${encodeURIComponent(road)}`, "_blank")}
          >
            지도열기
          </button>
        </div>
      </div>

      {/* 로딩/에러 */}
      {loading && (
        <div className="rounded-xl border bg-white p-6 text-center text-gray-600">불러오는 중…</div>
      )}
      {!loading && err && (
        <div className="rounded-xl border bg-white p-6 text-center text-red-600">{err}</div>
      )}

      {/* 본문 */}
      {!loading && !err && (
        <>
          <div className="rounded-xl border bg-white">
            {/* 상단 탭(디자인 고정용) */}
            <div className="flex items-center text-sm border-b">
              <button className="px-4 py-3 border-b-2 border-black font-medium">부동산 표시</button>
              <button className="px-4 py-3 text-gray-500 hover:text-black">소유권</button>
              <button className="px-4 py-3 text-gray-500 hover:text-black">임대차</button>
              <button className="px-4 py-3 text-gray-500 hover:text-black">확인/검서</button>
              <button className="px-4 py-3 text-gray-500 hover:text-black">매물현황(협업)</button>
            </div>

            {/* 토지 요약 */}
            <div className="px-4 py-3 border-b">
              <div className="text-gray-700 font-semibold mb-2">토지</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-gray-500 text-xs">구분</div>
                  <div>{row?.platGbCd === "1" ? "산" : "일반"}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-gray-500 text-xs">본번</div>
                  <div>{h(meta?.bon)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-gray-500 text-xs">부번</div>
                  <div>{h(meta?.bu)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-gray-500 text-xs">용적률/건폐율</div>
                  <div>
                    {h(row?.vlRat, "%")} / {h(row?.bcRat, "%")}
                  </div>
                </div>
              </div>
            </div>

            {/* 건축물 */}
            <div className="px-4 py-3">
              <div className="text-gray-700 font-semibold mb-2">건축물</div>

              {/* 단독/다가구/상가주택(단일동) vs 공동주택/오피스텔(세대) */}
              {!isMultiUnit ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <div className="text-gray-500 text-xs">주용도</div>
                    <div>{h(row?.mainPurpsCdNm)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-gray-500 text-xs">사용승인일</div>
                    <div>{ymdToDash(row?.useAprDay)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-gray-500 text-xs">층수(지상/지하)</div>
                    <div>
                      {h(row?.grndFlrCnt, "층")} / {h(row?.ugrndFlrCnt, "층")}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-gray-500 text-xs">연면적</div>
                    <div>{h(row?.totArea, "㎡")}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-gray-500 text-xs">건축면적</div>
                    <div>{h(row?.archArea, "㎡")}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-gray-500 text-xs">구조/지붕</div>
                    <div>
                      {h(row?.strctCdNm)} / {h(row?.roofCdNm)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="text-sm">
                      <b>{row?.mainPurpsCdNm || "공동주택"}</b>
                      <span className="text-gray-500">
                        {" "}· 총 세대수 {h(row?.hhldCnt)} · 층수 {h(row?.grndFlrCnt, "층")}/{h(row?.ugrndFlrCnt, "층")}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">사용승인일 {ymdToDash(row?.useAprDay)}</div>
                  </div>

                  <div className="rounded-md border bg-gray-50 p-4 text-sm text-gray-700">
                    호실별 정보는 건축물대장(세대/호 API) 연동 후 표시됩니다.
                    <br />
                    <span className="text-gray-500">(지금은 기본정보만 노출)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-[12px] text-gray-500 mt-3">
            ※ 서울시 열린데이터광장 건축물대장(일반) 기반. 세대/호 정보는 별도 API 연동 필요.
          </div>
        </>
      )}
    </main>
  );
}
