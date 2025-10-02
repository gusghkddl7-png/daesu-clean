// app/api/users/pending/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const PENDING = "users_pending";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET() {
  try {
    const cli = await clientPromise;
    const rows = await cli
      .db(DB)
      .collection(PENDING)
      .find({})
      .project({ passwordHash: 0 }) // 민감정보 숨김
      .sort({ createdAt: -1 })
      .toArray();

    return json({ ok: true, items: rows });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
