// app/api/geocode/fwd/route.ts
import { NextRequest, NextResponse } from "next/server";

function ok(data: any) {
  return NextResponse.json({ ok: true, ...data }, { headers: { "cache-control": "no-store" } });
}
function err(message: string, extra: any = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 200, headers: { "cache-control": "no-store" } });
}

const VWORLD_KEY =
  process.env.VWORLD_KEY_LOCALHOST ||
  process.env.VWORLD_KEY ||
  process.env.VWORLD_KEY_LOOPBACK ||
  "";

/** VWorld 주소→좌표 (type: road -> parcel 순차 시도) */
async function vworldGeocode(q: string) {
  if (!VWORLD_KEY) return null;

  const base = "http://api.vworld.kr/req/address";
  const params = (type: "road" | "parcel") =>
    new URLSearchParams({
      service: "address",
      request: "getCoord",
      version: "2.0",
      type,
      address: q,
      refine: "true",
      simple: "false",
      format: "json",
      crs: "epsg:4326", // WGS84
      key: VWORLD_KEY,
    });

  for (const t of ["road", "parcel"] as const) {
    try {
      const r = await fetch(`${base}?${params(t).toString()}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      const it = j?.response?.result?.point;
      const x = it?.x, y = it?.y;
      if (typeof x === "string" && typeof y === "string") {
        return { lat: parseFloat(y), lng: parseFloat(x), source: `vworld:${t}`, raw: j };
      }
    } catch {}
  }
  return null;
}

/** Nominatim(OSM) 폴백 */
async function nominatimGeocode(q: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q,
      format: "json",
      limit: "1",
      "accept-language": "ko",
      addressdetails: "0",
    }).toString()}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "daesu-clean-local/1.0 (contact@example.com)",
        Referer: "http://localhost",
      },
      cache: "no-store",
    });
    const arr = await r.json().catch(() => null);
    const it = Array.isArray(arr) ? arr[0] : null;
    if (it?.lat && it?.lon) {
      return { lat: parseFloat(it.lat), lng: parseFloat(it.lon), source: "nominatim", raw: it };
    }
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("query") ?? req.nextUrl.searchParams.get("q") ?? "";
  const query = q.trim();
  if (!query) return err("NO_QUERY");

  // 1) VWorld 시도
  const v = await vworldGeocode(query);
  if (v) return ok(v);

  // 2) OSM 폴백
  const n = await nominatimGeocode(query);
  if (n) return ok(n);

  return err("GEOCODE_FAIL");
}
