// app/api/seoul/building/route.ts
import { NextRequest, NextResponse } from "next/server";

type JusoItem = {
  admCd?: string;      // 법정동코드(10자리)
  lnbrMnnm?: string;   // 본번
  lnbrSlno?: string;   // 부번(없으면 "0"일 수 있음)
  roadAddr?: string;
  jibunAddr?: string;
  siNm?: string;
  sggNm?: string;
  emdNm?: string;
};

function pickNums(s?: string, defaultZero = false) {
  const n = (s ?? "").replace(/\D/g, "");
  if (!n && defaultZero) return "0";
  return n;
}

// 사용자가 동+지번만 넣어도 돌아가게 시/구를 자동 보정
function normalizeAddr(input: string) {
  const t = input.trim();
  const hasSeoul = /서울/.test(t);
  const hasGangdong = /(강동구|江東區)/.test(t);
  if (!hasSeoul && !hasGangdong) {
    // 동+지번만 들어왔다고 가정하고 prefix 부착
    return `서울특별시 강동구 ${t}`;
  }
  if (hasSeoul && !hasGangdong) {
    return t.replace(/서울[^ ]*/, "서울특별시 강동구");
  }
  return t;
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.SEOUL_BUILDING_KEY || "";
    if (!key) {
      return NextResponse.json({ ok: false, error: "SEOUL_BUILDING_KEY missing" }, { status: 500 });
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || "";
    if (!base) {
      return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_BASE_URL missing" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const rawAddr = (searchParams.get("addr") || "").trim();
    if (!rawAddr) {
      return NextResponse.json({ ok: false, error: "addr is required" }, { status: 400 });
    }

    // 1) 주소 보정(시/구 자동 붙이기)
    const addr = normalizeAddr(rawAddr);

    // 2) 우리 서버의 /api/juso/search 재사용 (키는 서버쪽에서 붙음)
    const jusoRes = await fetch(`${base}/api/juso/search?q=${encodeURIComponent(addr)}`, { cache: "no-store" });
    if (!jusoRes.ok) {
      return NextResponse.json({ ok: false, error: `JUSO HTTP ${jusoRes.status}` }, { status: 502 });
    }
    const j = await jusoRes.json();

    const items: JusoItem[] =
      Array.isArray(j?.items) ? j.items
        : Array.isArray(j?.juso?.results?.juso) ? j.juso.results.juso
        : [];

    if (!items.length) {
      return NextResponse.json({
        ok: true,
        query: { addr },
        source: "juso",
        item: null,
        message: "주소 검색 결과가 없습니다.",
      }, { status: 200 });
    }

    // 첫 후보
    const it = items[0];
    const admCd = pickNums(it.admCd);
    const bon = pickNums(it.lnbrMnnm);
    const bu = pickNums(it.lnbrSlno, true); // 부번 없으면 0

    // JUSO로부터 최소 정보는 리턴(화면에 비어 있지 않게)
    const jusoSummary = {
      jibunAddr: it.jibunAddr ?? addr,
      roadAddr: it.roadAddr ?? "",
      admCd, bon, bu,
    };

    if (!admCd || !bon) {
      return NextResponse.json({
        ok: true,
        query: { addr },
        source: "juso",
        item: null,
        juso: jusoSummary,
        message: "법정동/본번 정보가 부족합니다. 주소를 좀 더 구체적으로 입력해 주세요.",
      }, { status: 200 });
    }

    // 3) 서울시 건축물대장 조회
    const url = `http://openapi.seoul.go.kr:8088/${key}/json/BuildingRegisterGeneral/1/1/${admCd}/${bon}/${bu}`;
    const seoulRes = await fetch(url, { cache: "no-store" });
    const raw = await seoulRes.json();

    let data: any = null;
    let seoulOk = false;
    let seoulMsg = "";

    if (raw?.BuildingRegisterGeneral?.row) {
      data = raw.BuildingRegisterGeneral.row[0] ?? null;
      seoulOk = !!data;
    } else if (raw?.RESULT?.MESSAGE) {
      seoulMsg = raw.RESULT.MESSAGE;
    } else if (raw?.BuildingRegisterGeneral?.RESULT?.MESSAGE) {
      seoulMsg = raw.BuildingRegisterGeneral.RESULT.MESSAGE;
    } else {
      seoulMsg = "서울시 API 결과가 비었습니다.";
    }

    return NextResponse.json({
      ok: true,
      query: { addr, admCd, bon, bu },
      source: "seoul",
      seoulOk,
      seoulMsg,
      item: data,          // null이면 UI에서 "건축물대장 없음(미확인)" 표시
      juso: jusoSummary,   // 항상 내려줘서 리스트를 만들 수 있게
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
