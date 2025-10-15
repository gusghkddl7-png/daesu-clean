import { NextResponse } from "next/server";

/**
 * VWorld WFS (건물)에서 클릭 지점을 포함하는 폴리곤만 잘라 반환
 * - typename: lt_c_spbd_buld (건물 외곽)
 * - 쿼리: CQL_FILTER=INTERSECTS(geom,POINT(lon lat))
 * - domain 파라미터: 키에 등록한 도메인(예: http://localhost:3200)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const domain = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3200";

    const key =
      process.env.VWORLD_KEY ||
      process.env.VWORLD_KEY_LOCALHOST ||
      process.env.VWORLD_KEY_LOOPBACK ||
      "";

    if (!key) {
      return NextResponse.json({ ok: false, error: "MISSING_VWORLD_KEY" }, { status: 500 });
    }
    if (!isFinite(lat) || !isFinite(lng)) {
      return NextResponse.json({ ok: false, error: "MISSING_COORDS" }, { status: 400 });
    }

    // GeoServer CQL: POINT는 (경도, 위도) 순서
    const cql = `INTERSECTS(geom,POINT(${lng} ${lat}))`;
    const params = new URLSearchParams({
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typename: "lt_c_spbd_buld",
      srsName: "EPSG:4326",
      output: "application/json",
      CQL_FILTER: cql,
      key,
      domain,
    });

    const url = `https://api.vworld.kr/req/wfs?${params.toString()}`;
    const r = await fetch(url, { cache: "no-store" });

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `VWORLD_${r.status}` }, { status: 502 });
    }
    const j = await r.json().catch(() => null);
    const features = j?.features || [];
    if (!features.length) {
      return NextResponse.json({ ok: false, error: "NO_FEATURE" }, { status: 200 });
    }

    // 하나만 남기되, MultiPolygon이면 클릭 포인트가 들어있는 그 폴리곤만 추출해서 Polygon으로 반환
    const picked = pickPartContainingPoint(features[0], lat, lng);
    if (!picked) {
      return NextResponse.json({ ok: false, error: "NO_PART_MATCH" }, { status: 200 });
    }

    return NextResponse.json({ ok: true, feature: picked });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "BUILDING_FETCH_FAIL" }, { status: 502 });
  }
}

// ---- helpers ----
function pointInRing(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pickPartContainingPoint(feature: any, lat: number, lng: number) {
  const g = feature?.geometry;
  if (!g) return null;

  if (g.type === "Polygon") {
    const outer = g.coordinates?.[0] || [];
    if (pointInRing(lng, lat, outer)) return feature;
    return null;
  }

  if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates || []) {
      const outer = poly?.[0] || [];
      if (pointInRing(lng, lat, outer)) {
        return {
          type: "Feature",
          properties: feature.properties || {},
          geometry: { type: "Polygon", coordinates: poly },
        };
      }
    }
    return null;
  }

  return null;
}
