import { NextRequest, NextResponse } from "next/server";

const MOLIT_KEY = process.env.MOLIT_BLDG_KEY; // 국토부 건축물대장 서비스키(디코딩된 원문)

function parseBunJi(addr: string) {
  const m = addr.match(/(\d+)-(\d+)/) || addr.match(/(\d+)\s*번지?/);
  if (!m) return { bun: "", ji: "" };
  if (m.length >= 3) return { bun: m[1], ji: m[2] };
  return { bun: m[1], ji: "" };
}

export async function GET(req: NextRequest) {
  try {
    const addr = req.nextUrl.searchParams.get("addr") || "";
    if (!addr) return NextResponse.json({ ok: false, error: "no addr" }, { status: 400 });
    if (!MOLIT_KEY) return NextResponse.json({ ok: false, error: "no api key" }, { status: 500 });

    const { bun, ji } = parseBunJi(addr);

    const url = `https://apis.data.go.kr/1613000/BldRgstService_v2/getBrTitleInfo?serviceKey=${encodeURIComponent(
      MOLIT_KEY
    )}&numOfRows=1&pageNo=1&_type=json&platGb=0&bun=${bun}&ji=${ji}`;

    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));

    const item = j?.response?.body?.items?.item?.[0] || j?.response?.body?.items?.item;
    const summary = item
      ? {
          mainUse: item.mainPurpsCdNm || item.mainPurpsNm,
          totalFloor: item.grndFlrCnt ? `${item.grndFlrCnt}F` : undefined,
          area: item.totArea ? `${item.totArea}㎡` : undefined,
          structure: item.strctCdNm || item.etag || undefined,
          approveDate: item.useAprDay || item.useAprDe || undefined,
          land: {
            bun, ji,
            area: item.platArea ? `${item.platArea}㎡` : undefined,
            zoning: item.jiyukCdNm || item.jiguCdNm || undefined,
          },
        }
      : undefined;

    return NextResponse.json({ ok: !!item, summary, raw: item ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
