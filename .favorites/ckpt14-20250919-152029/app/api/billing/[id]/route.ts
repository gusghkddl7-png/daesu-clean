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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const items = await readAll();
  const found = items.find((x: any) => x._id === params.id);
  if (!found) return NextResponse.json({ message: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(found, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const items = await readAll();
    const idx = items.findIndex((x: any) => x._id === params.id);
    if (idx === -1) return NextResponse.json({ message: "NOT_FOUND" }, { status: 404 });

    // 기존 createdAt 유지, _id 고정
    const prev = items[idx];
    const updated = { ...prev, ...body, _id: prev._id, createdAt: prev.createdAt };

    items[idx] = updated;
    await writeAll(items);
    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "PUT error" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const items = await readAll();
  const next = items.filter((x: any) => x._id !== params.id);
  if (next.length === items.length) {
    return NextResponse.json({ message: "NOT_FOUND" }, { status: 404 });
  }
  await writeAll(next);
  return NextResponse.json({ ok: true }, { status: 200 });
}
