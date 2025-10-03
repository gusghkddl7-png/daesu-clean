// app/api/juso/search/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// JUSO 문서 기준 기본값
const DEFAULT_PER_PAGE = 10;

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = (searchParams.get("q") || "").trim();
    const page = Number(searchParams.get("page") || "1");
    const size = Number(searchParams.get("size") || DEFAULT_PER_PAGE);

    if (!keyword) {
      return json({ ok: false, error: "q(검색어)가 필요합니다." }, { status: 400 });
    }

    const key = process.env.JUSO_KEY;
    if (!key) {
      return json({ ok: false, error: "서버에 JUSO_KEY가 없습니다." }, { status: 500 });
    }

    // 도로명주소 OPEN API(5.0) 엔드포인트
    const apiUrl = new URL("https://business.juso.go.kr/addrlink/addrLinkApi.do");
    apiUrl.searchParams.set("confmKey", key);
    apiUrl.searchParams.set("currentPage", String(page));
    apiUrl.searchParams.set("countPerPage", String(size));
    apiUrl.searchParams.set("keyword", keyword);
    apiUrl.searchParams.set("resultType", "json");

    const r = await fetch(apiUrl.toString(), {
      // 일부 환경에서 필요 시 CORS 우회용 헤더
      headers: { "Accept": "application/json" },
      // 서버->외부 호출이므로 캐시 금지
      cache: "no-store",
    });

    if (!r.ok) {
      return json({ ok: false, error: `Juso HTTP ${r.status}` }, { status: 502 });
    }

    const raw = await r.json();

    // 결과 평탄화(프론트가 쓰기 쉽게)
    const juso = raw?.results?.juso ?? [];
    const common = raw?.results?.common ?? {};
    return json({
      ok: true,
      total: Number(common?.totalCount ?? 0),
      page,
      size,
      items: juso.map((x: any) => ({
        roadAddr: x.roadAddr,           // 도로명 전체 주소
        jibunAddr: x.jibunAddr,         // 지번 주소
        zipNo: x.zipNo,                 // 우편번호
        siNm: x.siNm,                   // 시/도
        sggNm: x.sggNm,                 // 시/군/구
        emdNm: x.emdNm,                 // 읍/면/동
        bdNm: x.bdNm,                   // 건물명
        admCd: x.admCd,                 // 행정구역 코드
        rnMgtSn: x.rnMgtSn,             // 도로명코드
        bdMgtSn: x.bdMgtSn,             // 건물관리번호
        detBdNmList: x.detBdNmList,     // 상세건물명 목록
      })),
      _raw: process.env.NODE_ENV === "development" ? raw : undefined,
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "juso proxy error" }, { status: 500 });
  }
}
