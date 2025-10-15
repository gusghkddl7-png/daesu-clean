// app/api/registry/summary/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 입력: lat,lng 또는 address
 * 출력: 건축물대장 + 토지대장 요약
 * 실제 연동용 자리(정부/지자체 API 키 필요). 키 없으면 안내 메시지로 응답.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const address = searchParams.get("address") || "";

  // TODO: 실 API 연동 (국가공간정보포털/정부24/지자체 등)
  const hasKeys = !!process.env.SEOUL_BUILDING_KEY; // 예시: 서울시 키 여부
  if (!hasKeys) {
    return NextResponse.json({
      ok: true,
      source: "stub",
      building: {
        ok: false,
        error: "API_KEYS_REQUIRED",
        message: "대장 API 키가 필요합니다. 키 등록 후 자동 조회됩니다.",
      },
      land: {
        ok: false,
        error: "API_KEYS_REQUIRED",
        message: "대장 API 키가 필요합니다. 키 등록 후 자동 조회됩니다.",
      },
      input: { lat, lng, address },
    });
  }

  // ↓↓↓ 키 등록 후 여기에 실제 API 호출/파싱 구현 ↓↓↓
  // 예시 형태:
  return NextResponse.json({
    ok: true,
    source: "demo",
    building: {
      ok: true,
      summary: {
        mainUse: "근린생활시설",
        structure: "철근콘크리트구조",
        totalFloor: "지상 7층 / 지하 1층",
        area: "연면적 1,234.56㎡",
        approveDate: "2008-05-21",
      },
    },
    land: {
      ok: true,
      summary: {
        landUse: "대(宅地)",
        area: "178.3㎡",
        zonings: "일반상업지역",
        etc: "지구단위계획구역",
      },
    },
    input: { lat, lng, address },
  });
}
