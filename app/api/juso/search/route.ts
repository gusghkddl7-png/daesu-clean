// app/api/juso/search/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const preferredRegion = "icn1"; // 서울 리전

const DEFAULT_PER_PAGE = 10;

/** 호스트에 맞는 키 선택 */
function pickJusoKey(host: string | null): string | undefined {
  const h = (host || "").toLowerCase();

  // 배포(Vercel)
  if (h.includes("vercel.app")) {
    return process.env.JUSO_KEY_VERCEL || process.env.JUSO_KEY;
  }
  // 로컬(루프백)
  if (h.includes("127.0.0.1")) {
    return (
      process.env.JUSO_KEY_LOOPBACK ||
      process.env.JUSO_KEY_LOCALHOST ||
      process.env.JUSO_KEY
    );
  }
  // 로컬(localhost)
  if (h.includes("localhost")) {
    return (
      process.env.JUSO_KEY_LOCALHOST ||
      process.env.JUSO_KEY_LOOPBACK ||
      process.env.JUSO_KEY
    );
  }
  // 기타 기본
  return process.env.JUSO_KEY;
}

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new NextResponse(JSON.stringify(data), { ...init, headers });
}

function normalizeKeyword(raw: string) {
  const base = raw.replace(/\s+/g, " ").trim();
  const noHyphen = base.replace(/(\d+)\s*-\s*(\d+)/, "$1$2");
  return { base, noHyphen };
}

async function callJuso(confmKey: string, keyword: string, page: number, size: number, referer: string) {
  const url = new URL("https://business.juso.go.kr/addrlink/addrLinkApi.do");
  url.searchParams.set("confmKey", confmKey);
  url.searchParams.set("currentPage", String(page));
  url.searchParams.set("countPerPage", String(size));
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("resultType", "json");

  const r = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Referer: referer,
      Origin: referer,
    },
  });
  if (!r.ok) throw new Error(`Juso HTTP ${r.status}`);
  return r.json();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keywordRaw = (searchParams.get("q") || searchParams.get("keyword") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const size = Math.max(1, Number(searchParams.get("size") || DEFAULT_PER_PAGE));
    const debug = searchParams.has("debug");

    if (!keywordRaw) {
      return json({ ok: false, error: "q 또는 keyword(검색어)가 필요합니다." }, { status: 400 });
    }

    const host = req.headers.get("host");
    const confmKey = pickJusoKey(host);
    if (!confmKey) {
      return json({ ok: false, error: "JUSO_KEY가 설정되어 있지 않습니다." }, { status: 500 });
    }

    // Referer: 등록한 서비스 URL을 사용 (없으면 호스트 기반)
    const referer =
      (process.env.NEXT_PUBLIC_BASE_URL && `${process.env.NEXT_PUBLIC_BASE_URL}/`) ||
      (host ? `https://${host}/` : "https://daesu-clean-2.vercel.app/");

    const tried: string[] = [];
    const { base, noHyphen } = normalizeKeyword(keywordRaw);

    // 1차: 원문
    tried.push(base);
    let raw = await callJuso(confmKey, base, page, size, referer);
    let juso = raw?.results?.juso ?? [];
    let common = raw?.results?.common ?? {};
    let total = Number(common?.totalCount || 0);

    // 2차: 하이픈 제거
    if (!total && noHyphen !== base) {
      tried.push(noHyphen);
      raw = await callJuso(confmKey, noHyphen, page, size, referer);
      juso = raw?.results?.juso ?? [];
      common = raw?.results?.common ?? {};
      total = Number(common?.totalCount || 0);
    }

    // 3차: 지역 프리픽스
    if (!total && /[동|가]\s*\d+(\s*-?\s*\d+)?$/.test(base)) {
      const prefixed = `서울 강동구 ${base}`;
      tried.push(prefixed);
      raw = await callJuso(confmKey, prefixed, page, size, referer);
      juso = raw?.results?.juso ?? [];
      common = raw?.results?.common ?? {};
      total = Number(common?.totalCount || 0);
    }

    const items = (juso || []).map((x: any) => ({
      roadAddr: x.roadAddr,
      jibunAddr: x.jibunAddr,
      zipNo: x.zipNo,
      siNm: x.siNm,
      sggNm: x.sggNm,
      emdNm: x.emdNm,
      bdNm: x.bdNm,
      admCd: x.admCd,
      rnMgtSn: x.rnMgtSn,
      bdMgtSn: x.bdMgtSn,
      detBdNmList: x.detBdNmList,
    }));

    const out: any = { ok: true, total, page, size, items, tried };
    if (debug) out._common = common;
    return json(out);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "juso proxy error" }, { status: 500 });
  }
}
