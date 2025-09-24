// app/api/billing/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "billing.json");

async function readAll() {
  try {
    const buf = await fs.readFile(DB_PATH, "utf-8");
    const arr = JSON.parse(buf);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeAll(arr: any[]) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(arr, null, 2), "utf-8");
}

/** 목록 조회 */
export async function GET() {
  const items = await readAll();
  return NextResponse.json(items, { status: 200 });
}

/** 신규 등록 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.agent) {
      return NextResponse.json({ error: "agent is required" }, { status: 400 });
    }

    const items = await readAll();
    const _id = body?._id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = body?.createdAt ?? new Date().toISOString();

    const saved = { ...body, _id, createdAt };
    await writeAll([saved, ...items]); // 최근순

    return NextResponse.json(saved, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "bad request" }, { status: 400 });
  }
}
