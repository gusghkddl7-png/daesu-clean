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
    if (deal === "매매") return "BS"; // TODO: 매매 접두사 확정 시 여기만 수정
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
}: {
  dealType?: Deal;
  buildingType?: Bldg;
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
    return () => { alive = false };
  }, [prefix]);

  const value = prefix ? `${prefix}-${seq}` : "—";

  return (
    <div className="w-full flex items-center justify-center mb-2">
      <div className="w-full max-w-md">
        <label className="block text-sm font-medium mb-1">코드번호</label>
        <input
          value={value}
          readOnly
          className="w-full border rounded-md px-3 py-2 bg-muted/30 pointer-events-none select-all"
          title="거래유형/건물유형 선택 시 자동 표시 (DB 연동 시 자동증가)"
        />
      </div>
    </div>
  );
}