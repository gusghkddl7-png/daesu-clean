// app/api/geocode/rev/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const key =
    process.env.VWORLD_KEY ||
    process.env.VWORLD_KEY_LOCALHOST ||
    process.env.VWORLD_KEY_LOOPBACK ||
    "";

  if (!lat || !lng) {
    return NextResponse.json({ ok: false, error: "MISSING_COORDS" }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ ok: false, error: "MISSING_VWORLD_KEY" }, { status: 500 });
  }

  const base = "https://api.vworld.kr/req/address";
  const mk = (type: "ROAD" | "PARCEL") =>
    `${base}?service=address&request=getAddress&format=json&crs=epsg:4326&type=${type}&point=${lng},${lat}&key=${key}`;

  try {
    // ROAD 먼저
    const r1 = await fetch(mk("ROAD"), { cache: "no-store" });
    const j1: any = await r1.json().catch(() => null);

    // PARCEL도 시도
    const r2 = await fetch(mk("PARCEL"), { cache: "no-store" });
    const j2: any = await r2.json().catch(() => null);

    const road =
      j1?.response?.status === "OK"
        ? j1?.response?.result?.[0]?.text ||
          j1?.response?.result?.[0]?.structure?.level4L ||
          ""
        : "";

    const parcel =
      j2?.response?.status === "OK"
        ? j2?.response?.result?.[0]?.text ||
          j2?.response?.result?.[0]?.structure?.level4L ||
          ""
        : "";

    if (!road && !parcel) {
      return NextResponse.json({ ok: false, error: "NO_RESULT" }, { status: 404 });
    }

    // 기본 address는 도로명 우선, 없으면 지번
    const address = road || parcel || "";
    return NextResponse.json({ ok: true, address, road, parcel });
  } catch {
    return NextResponse.json({ ok: false, error: "VWORLD_FETCH_FAIL" }, { status: 502 });
  }
}
