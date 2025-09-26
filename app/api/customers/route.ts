// app/api/customers/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const DATA_PATH = path.join(process.cwd(), "data", "inquiries.json");

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const rows = JSON.parse(raw);
    // /api/inquiries와 같은 구조 유지
    return NextResponse.json({ rows, source: "file(customers)" });
  } catch (e: any) {
    return NextResponse.json({ rows: [], source: "empty", error: String(e?.message ?? e) });
  }
}
