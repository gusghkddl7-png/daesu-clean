import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const COLL_STAFF = "staff";

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
    const db  = cli.db(DB);
    const rows = await db
      .collection(COLL_STAFF)
      .find({}, { projection: { _id: 0 } })
      .sort({ displayName: 1 })
      .toArray();

    return json(rows);
  } catch (e:any) {
    return json({ ok:false, message:e?.message||"staff error" }, { status:500 });
  }
}
