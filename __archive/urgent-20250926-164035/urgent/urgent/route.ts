// app/api/urgent/route.ts
export const dynamic = "force-dynamic";

type AnyObj = Record<string, any>;

function first<T = any>(o: AnyObj | null | undefined, keys: string[], fb: T | null = null): T | null {
  if (!o) return fb;
  for (const k of keys) {
    const v = (o as AnyObj)[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v as T;
  }
  return fb;
}

function toISODate(x: any): string | null {
  if (!x) return null;
  const s = String(x).trim();
  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.toISOString().slice(0, 10);
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())).toISOString().slice(0, 10);
  }
  return null;
}

function daysLeft(iso: string): number {
  const d = new Date(iso), now = new Date();
  d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function normalize(o: AnyObj, i: number) {
  const id =
    first<string>(o, ["id","_id","코드","번호"]) ??
    `${first(o,["name","고객명","성명","이름"],"-")}-${first(o,["deadline","입주일","이사일","moveIn","move_in"],"")}-${i}`;

  const name    = first<string>(o, ["name","고객명","성명","이름"]) ?? "-";
  const phone   = first<string>(o, ["phone","연락처","휴대전화","mobile","tel"]) ?? "";
  const area    = first<string>(o, ["area","지역","권역"]) ?? "";
  const need    = first<string>(o, ["need","요구사항","요청","희망조건"]) ?? "";
  const memo    = first<string>(o, ["memo","비고","note"]) ?? "";

  // 고객/문의 표의 부가 컬럼도 보존
  const date    = first<string>(o, ["date","날짜"]) ?? "";
  const manager = first<string>(o, ["manager","담당"]) ?? "";
  const price   = first<string>(o, ["price","가격"]) ?? "";
  const rooms   = first<string>(o, ["rooms","방갯수"]) ?? "";
  const channel = first<string>(o, ["channel","유입경로"]) ?? "";

  const dlRaw =
    first(o, ["deadline","입주일","moveIn","move_in","desiredDate"]) ??
    first(o, ["deadlineText","입주일(텍스트)"]);
  const deadline = toISODate(dlRaw);
  if (!deadline) return null;

  const d = daysLeft(deadline);
  return { id, name, phone, area, need, deadline, memo, d, date, manager, price, rooms, channel };
}

async function fetchArray(url: string): Promise<AnyObj[] | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    if (Array.isArray(j)) return j as AnyObj[];
    if (Array.isArray((j as any)?.rows))  return (j as any).rows as AnyObj[];
    if (Array.isArray((j as any)?.items)) return (j as any).items as AnyObj[];
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;

  // ✅ 고객/문의 JSON만 사용
  const endpoint = base + "/api/clients";

  const src = (await fetchArray(endpoint)) ?? [];
  const normalized = src
    .map(normalize)
    .filter((x): x is NonNullable<ReturnType<typeof normalize>> => !!x)
    .filter(x => x.d >= 0 && x.d <= 30) // 0~30일
    .sort((a,b) => a.d - b.d);

  // 중복 제거(이름|전화|기한)
  const uniq = new Map<string, typeof normalized[number]>();
  for (const it of normalized) {
    const key = `${it.name}|${it.phone}|${it.deadline}`;
    if (!uniq.has(key)) uniq.set(key, it);
  }

  // 프런트에서 d 다시 계산하니 d 제외하고 보냄 (부가 컬럼은 유지)
  const rows = Array.from(uniq.values()).map(({ d, ...rest }) => rest);

  if (url.searchParams.get("debug")) {
    return Response.json({
      tried: [endpoint],
      inCount: src.length,
      outCount: rows.length,
      sample: rows.slice(0, 3),
    });
  }

  return Response.json(rows);
}
