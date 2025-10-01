import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const PENDING = "users_pending";

function json(data:any, init: ResponseInit = {}) {
  const h = new Headers(init.headers);
  h.set("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  h.set("Pragma","no-cache"); h.set("Expires","0");
  return NextResponse.json(data, { ...init, headers: h });
}

export async function GET() {
  try{
    const cli = await clientPromise;
    const db  = cli.db(DB);
    const rows = await db.collection(PENDING)
      .find({}, { projection: { _id:0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return json(rows);
  }catch(e:any){
    return json({ ok:false, message:e?.message||"pending error" }, { status:500 });
  }
}
