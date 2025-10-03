import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const esc = (s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const norm = (s:any)=>String(s??"").trim().replace(/,/g,".").toLowerCase();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const e = norm(email);
    if (!e) return NextResponse.json({ ok:false, error:"email required" }, { status:400 });

    const cli = await clientPromise;
    const db  = cli.db(DB);
    const eq  = { email: { $regex: `^${esc(e)}$`, $options: "i" } };

    let deleted = 0;
    for (const c of ["pending_users","users_pending","join_requests","users_requests","users"]) {
      try { const r = await db.collection(c).deleteMany(eq); deleted += r?.deletedCount ?? 0; } catch {}
    }
    // staff 는 승인 목록이라 기본적으로 건드리지 않음

    return NextResponse.json({ ok:true, deleted });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||"remove error" }, { status:500 });
  }
}
