// app/api/geocode/route.ts
import { NextResponse } from "next/server";

/** /api/geocode?query=... 또는 /api/geocode?q=... → /api/geocode/fwd 로 프록시 */
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const q = u.searchParams.get("query") || u.searchParams.get("q") || "";
    if (!q) {
      return NextResponse.json({ ok: false, error: "missing query" }, { status: 400 });
    }
    // 같은 서버의 /api/geocode/fwd 로 전달
    const fwd = new URL("/api/geocode/fwd", u.origin);
    fwd.searchParams.set("query", q);

    const r = await fetch(fwd.toString(), { cache: "no-store" });
    const body = await r.text();
    return new NextResponse(body, {
      status: r.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "proxy fail" }, { status: 500 });
  }
}
