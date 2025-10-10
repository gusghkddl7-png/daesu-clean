// app/api/building/search/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noCache(init?: ResponseInit) {
  const h = new Headers(init?.headers);
  h.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  h.set("Pragma", "no-cache");
  h.set("Expires", "0");
  h.set("Content-Type", "application/json; charset=utf-8");
  return h;
}

// 호스트별 Juso 키 선택(.env.local의 3개 키 사용)
function pickJusoKey(host: string | null) {
  const h = (host || "").toLowerCase();
  if (h.includes("vercel.app")) return process.env.JUSO_KEY_VERCEL || process.env.JUSO_KEY;
  if (h.includes("127.0.0.1"))
    return process.env.JUSO_KEY_LOOPBACK || process.env.JUSO_KEY_LOCALHOST || process.env.JUSO_KEY;
  if (h.includes("localhost"))
    return process.env.JUSO_KEY_LOCALHOST || process.env.JUSO_KEY_LOOPBACK || process.env.JUSO_KEY;
  return process.env.JUSO_KEY;
}

// 숫자만 추출
function nums(s?: string, zeroWhenEmpty = false) {
  const n = (s ?? "").replace(/\D/g, "");
  return n || (zeroWhenEmpty ? "0" : "");
}

// 서울시 API 재시도(간단 지수백오프) + 타임아웃
async function fetchWithRetry(url: string, opt: RequestInit = {}) {
  const delays = [500, 1000, 2000]; // ms
  let lastErr: any;
  for (let i = 0; i < delays.length; i++) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 8000); // 8초 타임아웃
      const r = await fetch(url, { ...opt, signal: ac.signal, cache: "no-store" });
      clearTimeout(timer);
      if (r.ok) return r;
      // 500대만 재시도, 나머지는 즉시 반환
      if (r.status < 500 || r.status >= 600) return r;
      lastErr = new Error("HTTP " + r.status);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((res) => setTimeout(res, delays[i]));
  }
  throw lastErr ?? new Error("fetchWithRetry failed");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = (searchParams.get("q") || "").trim();
    if (!q) {
      return new NextResponse(JSON.stringify({ ok: false, error: "q(주소 키워드)가 필요합니다." }), {
        status: 400,
        headers: noCache(),
      });
    }

    const host = req.headers.get("host");
    const referer =
      (process.env.NEXT_PUBLIC_BASE_URL && `${process.env.NEXT_PUBLIC_BASE_URL}/`) ||
      (host ? `https://${host}/` : "https://daesu-clean-2.vercel.app/");

    // 1) 주소 → 코드(JUSO)
    const jusoKey = pickJusoKey(host);
    if (!jusoKey) {
      return new NextResponse(JSON.stringify({ ok: false, error: "JUSO_KEY 미설정" }), {
        status: 500,
        headers: noCache(),
      });
    }
    const jusoQS = new URLSearchParams({
      confmKey: jusoKey,
      currentPage: "1",
      countPerPage: "5",
      keyword: q,
      resultType: "json",
    });
    const jusoRes = await fetch(`https://www.juso.go.kr/addrlink/addrLinkApi.do?${jusoQS}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Referer: referer,
        Origin: referer,
      },
    });
    if (!jusoRes.ok) {
      return new NextResponse(JSON.stringify({ ok: false, error: `Juso ${jusoRes.status}` }), {
        status: 502,
        headers: noCache(),
      });
    }
    const jusoRaw = await jusoRes.json();
    const it = (jusoRaw?.results?.juso ?? [])[0];
    if (!it) {
      return new NextResponse(JSON.stringify({ ok: true, items: [], note: "주소 일치 항목 없음" }), {
        status: 200,
        headers: noCache(),
      });
    }

    const admCd = nums(it.admCd);
    const bon = nums(it.lnbrMnnm);
    const bu = nums(it.lnbrSlno, true);

    const addressSummary = {
      roadAddr: it.roadAddr,
      jibunAddr: it.jibunAddr,
      siNm: it.siNm,
      sggNm: it.sggNm,
      emdNm: it.emdNm,
      admCd,
      bon,
      bu,
    };

    // 2) 서울 건축물대장 조회(일반대장)
    const seoulKey = process.env.SEOUL_BUILDING_KEY;
    if (!seoulKey) {
      return new NextResponse(JSON.stringify({ ok: false, error: "SEOUL_BUILDING_KEY 미설정" }), {
        status: 500,
        headers: noCache(),
      });
    }

    const url =
      `http://openapi.seoul.go.kr:8088/${encodeURIComponent(seoulKey)}` +
      `/json/BuildingRegisterGeneral/1/1/${encodeURIComponent(admCd)}/${encodeURIComponent(bon)}/${encodeURIComponent(bu)}`;

    let item: any = null;
    let seoulMsg = "";
    let seoulOk = false;

    try {
      const seoulRes = await fetchWithRetry(url, { headers: { Accept: "application/json" } });
      const seoulText = await seoulRes.text();

      try {
        const parsed = JSON.parse(seoulText);
        if (parsed?.BuildingRegisterGeneral?.row) {
          item = parsed.BuildingRegisterGeneral.row[0] ?? null;
          seoulOk = !!item;
        } else if (parsed?.RESULT?.MESSAGE) {
          seoulMsg = parsed.RESULT.MESSAGE;
        } else if (parsed?.BuildingRegisterGeneral?.RESULT?.MESSAGE) {
          seoulMsg = parsed.BuildingRegisterGeneral.RESULT.MESSAGE;
        } else {
          seoulMsg = "서울시 API 결과가 비었습니다.";
        }
      } catch {
        seoulMsg = "서울시 응답 파싱 실패";
      }
    } catch (e: any) {
      seoulMsg = String(e?.message || e) || "서울시 API 요청 실패";
    }

    return new NextResponse(
      JSON.stringify({
        ok: true,
        query: { q, admCd, bon, bu },
        address: addressSummary,
        seoulOk,
        seoulMsg,
        item, // null이면 UI에서 “대장 일시 조회불가(서울시 API)” 안내
      }),
      { status: 200, headers: noCache() }
    );
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ ok: false, error: e?.message || "building search error" }), {
      status: 500,
      headers: noCache(),
    });
  }
}
