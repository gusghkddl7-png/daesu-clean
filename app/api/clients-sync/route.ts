// app/api/clients-sync/route.ts
import path from "path";
import fs from "fs/promises";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  phone?: string;
  area?: string;
  need?: string;
  deadline: string; // yyyy-mm-dd
  memo?: string;
};

const DATA_PATH = path.join(process.cwd(), "data", "clients.json");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;
  const dbg: any = { tried: `${base}/api/clients-html` };

  try {
    // 1) 현재 /clients 화면을 HTML-미러 API로 긁어오기
    const r = await fetch(`${base}/api/clients-html`, { cache: "no-store" });
    if (!r.ok) return new Response(JSON.stringify({ ok: false, ...dbg, status: r.status }), { status: r.status });

    const rows = (await r.json()) as Row[];
    dbg.fetched = Array.isArray(rows) ? rows.length : 0;

    // 2) 기존 파일 로드
    const oldRaw = await fs.readFile(DATA_PATH, "utf8").catch(() => "[]");
    const oldArr = JSON.parse(oldRaw) as Row[];

    // 3) 병합(같은 key는 교체). key: phone|deadline
    const map = new Map<string, Row>();
    for (const it of oldArr) map.set(`${it.phone ?? ""}|${it.deadline}`, it);
    for (const it of rows)   map.set(`${it.phone ?? ""}|${it.deadline}`, it);

    const merged = Array.from(map.values());

    // 4) 저장
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(merged, null, 2), "utf8");

    return new Response(JSON.stringify({ ok: true, saved: merged.length, ...dbg }), { headers: { "Content-Type": "application/json" }});
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e), ...dbg }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
}
