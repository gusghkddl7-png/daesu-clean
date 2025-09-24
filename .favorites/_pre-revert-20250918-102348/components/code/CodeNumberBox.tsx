"use client";
import { useEffect, useMemo, useState } from "react";

type Deal = "월세" | "전세" | "매매";
type Bldg =
  | "아파트"
  | "재개발/재건축"
  | "상가/사무실"
  | "오피스텔"
  | "단독/다가구(상가주택)"
  | "빌라/다세대";

export function resolvePrefix(deal?: Deal, bldg?: Bldg): string | null {
  if (!deal || !bldg) return null;
  if (bldg === "아파트") return "C";
  if (bldg === "재개발/재건축") return "J";
  if (bldg === "상가/사무실") return "R";
  if (bldg === "오피스텔" || bldg === "단독/다가구(상가주택)" || bldg === "빌라/다세대") {
    if (deal === "월세") return "BO";
    if (deal === "전세") return "BL";
    if (deal === "매매") return "BM"; // 필요 시 조정
  }
  return null;
}

async function fetchNext(prefix: string): Promise<string> {
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
  variant = "default",
}: {
  dealType?: Deal;
  buildingType?: Bldg;
  variant?: "default" | "compact";
}) {
  const prefix = useMemo(() => resolvePrefix(dealType, buildingType), [dealType, buildingType]);
  const [seq, setSeq] = useState<string>("0001");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!prefix) return setSeq("0001");
      const n = await fetchNext(prefix);
      if (alive) setSeq(n);
    })();
    return () => { alive = false; };
  }, [prefix]);

  const value = prefix ? `${prefix}-${seq}` : "—";

  // ✨ compact: input 대신 div로 렌더링(키보드 포커스 완전 제외)
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
      </div>
    );
  }

  // 기본(큰) 버전은 읽기 전용 input 유지 — 필요 시 복사 편의
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
      </div>
    </div>
  );
}
