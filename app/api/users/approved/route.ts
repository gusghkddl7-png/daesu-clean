import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";

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
    const list = await db.collection(USERS)
      .find({}, { projection: { _id:0, passwordHash:0 } })
      .sort({ updatedAt: -1 })
      .toArray();
    return json(list);
  }catch(e:any){
    return json({ ok:false, message:e?.message||"approved error" }, { status:500 });
  }
}
