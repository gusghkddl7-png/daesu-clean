// app/api/clients-html/route.ts
export const dynamic = "force-dynamic";

function strip(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")        // React 주석 등
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function toISODate(x: string | null | undefined): string | null {
  if (!x) return null;
  const s = String(x).trim();
  const m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;
  const debug = url.searchParams.get("debug") != null;

  const dbg: any = { tried: [base + "/clients"] };

  try {
    const res = await fetch(base + "/clients", { cache: "no-store" });
    dbg.status = res.status;
    const html = await res.text();
    dbg.htmlLen = html.length;

    // 1) 테이블 전체에서 첫 번째 thead 가 있으면 헤더 인덱스 추출
    const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    const thead = theadMatch ? theadMatch[1] : "";
    const ths: string[] = [];
    if (thead) {
      const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let m: RegExpExecArray | null;
      while ((m = thRe.exec(thead)) !== null) ths.push(strip(m[1]).toLowerCase());
    }
    // 헤더명 → 컬럼 인덱스 매핑(한글/영문 대응)
    const idx = (name: string, fallback: number) => {
      if (!ths.length) return fallback;
      const i = ths.findIndex(t =>
        t.includes(name) ||
        (name === "movein" && (t.includes("입주") || t.includes("이사"))) ||
        (name === "rooms"  && t.includes("방갯")) ||
        (name === "channel"&& t.includes("유입")) ||
        (name === "phone"  && (t.includes("연락처")||t.includes("전화")))
      );
      return i >= 0 ? i : fallback;
    };
    const indexMap = {
      date:    idx("날짜",     0),
      manager: idx("담당",     1),
      price:   idx("가격",     2),
      area:    idx("지역",     3),
      need:    idx("요구",     4),
      rooms:   idx("rooms",   5),
      moveIn:  idx("movein",  6),
      channel: idx("channel", 7),
      phone:   idx("phone",   8),
      memo:    idx("비고",     9),
    };
    dbg.indexMap = indexMap;

    // 2) tbody가 없어도 전체 테이블에서 tr을 긁고, th가 포함된 헤더 tr은 제외
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    const table = tableMatch ? tableMatch[1] : html;
    const trs: string[] = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tm: RegExpExecArray | null;
    while ((tm = trRe.exec(table)) !== null) {
      const row = tm[1];
      // 헤더(tr 안에 th 있는 경우) 건너뜀
      if (/<th[\s>]/i.test(row)) continue;
      trs.push(row);
    }
    dbg.trCount = trs.length;

    const items: any[] = [];
    for (const tr of trs) {
      const tds: string[] = [];
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let m2: RegExpExecArray | null;
      while ((m2 = tdRe.exec(tr)) !== null) tds.push(strip(m2[1]));

      if (tds.length < 5) continue; // 너무 짧은 행 방어

      const get = (k: keyof typeof indexMap) => tds[indexMap[k]] ?? "";
      const area    = get("area");
      const need    = get("need");
      const rooms   = get("rooms");
      const moveIn  = get("moveIn");
      const phone   = get("phone");
      const memo    = get("memo");
      const date    = get("date");
      const manager = get("manager");
      const price   = get("price");
      const channel = get("channel");

      const deadline = toISODate(moveIn);
      if (!deadline) continue;

      const name = "-";
      const id = `${phone || "no-phone"}|${deadline}`;

      items.push({ id, name, phone, area, need, rooms, date, manager, price, channel, deadline, memo });
    }

    dbg.sourceCount = items.length;
    if (debug) return Response.json(dbg);
    return Response.json(items);
  } catch (e: any) {
    dbg.error = String(e?.message ?? e);
    return Response.json(debug ? dbg : [], { status: 500 });
  }
}
