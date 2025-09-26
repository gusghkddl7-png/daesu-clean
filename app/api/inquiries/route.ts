import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
const DATA_PATH = path.join(process.cwd(), "data", "inquiries.json");

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const rows = JSON.parse(raw);
    if (Array.isArray(rows)) return NextResponse.json(rows);
    if (Array.isArray(rows?.rows)) return NextResponse.json(rows.rows);
    return NextResponse.json([]);
  } catch { return NextResponse.json([]); }
}
