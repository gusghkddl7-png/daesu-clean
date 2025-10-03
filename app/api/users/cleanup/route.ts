import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const PENDING = "users_pending";
const STAFF = "staff";

function normEmail(s: any) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/@([^@]+)$/, (_, dom) => "@" + dom.replace(/,/g, "."));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email ? normEmail(body.email) : null;

    const client = await clientPromise;
    const db = client.db(DB);
    if (email) {
      // 단일 대상 정리
      await db.collection(PENDING).deleteMany({ email });
      await db.collection(PENDING).deleteMany({ $or: [{ email: { $exists: false } }, { email: "" }] });
      return NextResponse.json({ ok: true, target: email });
    }
    // 일반 정리: email 없는 레코드 제거
    const r = await db.collection(PENDING).deleteMany({ $or: [{ email: { $exists: false } }, { email: "" }] });
    return NextResponse.json({ ok: true, removed: r.deletedCount ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, ping: "cleanup" });
}
