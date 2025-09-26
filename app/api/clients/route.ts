// app/api/clients/route.ts
import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

type Row = {
  id?: string;
  name: string;
  phone?: string;
  area?: string;
  need?: string;
  deadline: string; // yyyy-mm-dd
  memo?: string;
};

const DATA_PATH = path.join(process.cwd(), "data", "clients.json");

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8").catch(() => "[]");
    const arr = JSON.parse(raw);
    return NextResponse.json(arr);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Row; // {name, phone, area, need, deadline, memo}
    if (!body?.deadline) return NextResponse.json({ ok: false, error: "deadline required" }, { status: 400 });
    if (!body?.name) body.name = "-";

    const raw = await fs.readFile(DATA_PATH, "utf8").catch(() => "[]");
    const arr: Row[] = JSON.parse(raw);

    // 키: phone|deadline (필요시 변경)
    const key = `${body.phone ?? ""}|${body.deadline}`;
    const map = new Map(arr.map((x) => [`${x.phone ?? ""}|${x.deadline}`, x]));
    map.set(key, { ...map.get(key), ...body });

    const merged = Array.from(map.values());
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(merged, null, 2), "utf8");

    return NextResponse.json({ ok: true, saved: merged.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
