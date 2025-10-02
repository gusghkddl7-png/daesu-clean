// app/api/users/approved/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";

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
      .collection(USERS)
      .find({ status: "approved" })
      .project({ passwordHash: 0 })
      .sort({ approvedAt: -1, createdAt: -1 })
      .toArray();

    return json({ ok: true, items: rows });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
