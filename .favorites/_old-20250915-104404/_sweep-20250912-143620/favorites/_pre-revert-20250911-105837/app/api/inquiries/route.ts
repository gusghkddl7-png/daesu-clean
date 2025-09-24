import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_PATH = path.join(process.cwd(), "data", "inquiries.json");

export async function GET() {
  // 파일 → 샘플
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const rows = JSON.parse(raw);
    return NextResponse.json({ rows, source: "file" });
  } catch {}

  const sample = [
    { _id: "U-001", title: "네이버 입주희망", manager: "김과장", channel: "고객/문의",
      name: "홍길동", phone: "010-1234-5678", area: "천호/길동", budget: "월 100/50", type: "원룸", deadlineText: "9월 중순" },
    { _id: "U-002", title: "고객 입주희망",    manager: "김부장", channel: "고객/문의",
      name: "김영희", phone: "010-2222-3333", area: "성내",       budget: "전세 2.5억", type: "투룸",  deadline: "2025-09-25" }
  ];
  return NextResponse.json({ rows: sample, source: "sample" });
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const raw = await fs.readFile(DATA_PATH, "utf8").catch(() => "[]");
    const arr = JSON.parse(raw);
    const before = arr.length;
    const key = String(id);
    const next = arr.filter((x: any) => String(x?._id ?? x?.id ?? x?.name) !== key);
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf8");
    return NextResponse.json({ ok: true, removed: before - next.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
