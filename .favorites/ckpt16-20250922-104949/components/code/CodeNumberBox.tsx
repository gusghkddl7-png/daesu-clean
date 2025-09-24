// components/code/CodeNumberBox.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/** ===== 타입 (page.tsx와 동일) ===== */
type Deal = "월세" | "전세" | "매매";
type Bldg =
  | "아파트"
  | "재개발/재건축"
  | "상가/사무실"
  | "오피스텔"
  | "단독/다가구(상가주택)"
  | "빌라/다세대";

/** 접두사 규칙 */
export function resolvePrefix(deal?: Deal, bldg?: Bldg): string | null {
  if (!deal || !bldg) return null;
  if (bldg === "아파트") return "C-";
  if (bldg === "재개발/재건축") return "J-";
  if (bldg === "상가/사무실") return "R-";
  if (bldg === "오피스텔" || bldg === "단독/다가구(상가주택)" || bldg === "빌라/다세대") {
    if (deal === "월세") return "BO-";
    if (deal === "전세") return "BL-";
    if (deal === "매매") return "BM-";
  }
  return null;
}

/** (옵션) 서버에서 다음 번호 4자리만 받아오는 엔드포인트 — 없으면 0001로 폴백 */
async function fetchNextSeq(prefix: string): Promise<string> {
  try {
    const res = await fetch(`/api/next-code/${encodeURIComponent(prefix)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("bad");
    const data = await res.json();
    if (data?.next && /^\d{4}$/.test(data.next)) return data.next;
  } catch {}
  return "0001";
}

export default function CodeNumberBox({
  dealType,
  buildingType,
  variant = "compact",
  /** ✅ page.tsx에서 넘겨주는 값들 */
  overrideCode,
  recentCode,
}: {
  dealType?: Deal;
  buildingType?: Bldg;
  variant?: "default" | "compact";
  /** 큰 박스에 표시될 최종 코드(저장될 코드) */
  overrideCode?: string;
  /** 옆에 작게 표시될 최근코드번호 */
  recentCode?: string;
}) {
  const prefix = useMemo(() => resolvePrefix(dealType, buildingType), [dealType, buildingType]);

  // 내부 폴백 표시용 상태 (overrideCode가 없을 때만 사용)
  const [seq, setSeq] = useState<string>("0001");

  useEffect(() => {
    let alive = true;
    // overrideCode가 있으면 내부 채번은 건너뜀
    if (overrideCode) return;
    (async () => {
      if (!prefix) return setSeq("0001");
      const n = await fetchNextSeq(prefix);
      if (alive) setSeq(n);
    })();
    return () => {
      alive = false;
    };
  }, [prefix, overrideCode]);

  const value = useMemo(() => {
    if (!prefix) return "—";
    // page.tsx에서 계산한 값이 있으면 그걸 사용 (진실의 원천)
    if (overrideCode && /^([A-Z-]+)\d{4}$/.test(overrideCode)) return overrideCode;
    // 없으면 내부 폴백
    return `${prefix}${seq}`;
  }, [prefix, seq, overrideCode]);

  // ===== 렌더링 =====
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 select-none">
        <span className="text-xs text-gray-500">코드번호</span>
        <div
          className="w-[150px] h-8 border rounded-md px-2 text-xs bg-gray-50 flex items-center"
          title="거래유형/건물유형 선택 시 자동 표시"
        >
          {value}
        </div>
        {/* ✅ 작은 글씨: 최근코드번호 */}
        {prefix && (
          <span className="text-[11px] text-gray-500">
            최근코드: {recentCode || "없음"}
          </span>
        )}
      </div>
    );
  }

  // 기본(큰) 버전은 읽기 전용 input
  return (
    <div className="w-full flex items-center justify-center mb-2">
      <div className="w-full max-w-md">
        <label className="block text-sm font-medium mb-1">코드번호</label>
        <input
          value={value}
          readOnly
          className="w-full border rounded-md px-3 py-2 bg-gray-50 pointer-events-none select-all"
          title="거래유형/건물유형 선택 시 자동 표시"
        />
        {prefix && (
          <div className="mt-1 text-[11px] text-gray-500">
            최근코드: {recentCode || "없음"}
          </div>
        )}
      </div>
    </div>
  );
}
