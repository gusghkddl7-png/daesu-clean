import { NextResponse } from "next/server";
import clientPromise from "../../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";

const norm = (s:any)=>String(s??"").trim().toLowerCase();
const fixEmail = (s:any)=> norm(String(s||"").replace(/@([^@]+)$/, (_:any,d:any)=>"@"+String(d).replace(/,/g,".")));

export async function GET(req: Request) {
  try {
    if (process.env.VERCEL_ENV === "production") {
      return NextResponse.json({ ok:false, message:"disabled in production" }, { status:403 });
    }

    const url = new URL(req.url);
    const raw = String(url.searchParams.get("q") || "");
    if (!raw) return NextResponse.json({ ok:false, message:"q(이메일 또는 id) 필요" }, { status:400 });

    const email = raw.includes("@") ? fixEmail(raw) : null;
    const id    = raw.includes("@") ? null : norm(raw);

    const cli = await clientPromise;
    const db  = cli.db(DB);

    const doc = await db.collection(USERS).findOne(
      email ? { email } : { id },
      { projection: { /* 해시 숨김 */ passwordHash: 0 } }
    );

    if (!doc) return NextResponse.json({ ok:false, message:"not found" }, { status:404 });
    return NextResponse.json({ ok:true, user: doc });
  } catch(e:any){
    return NextResponse.json({ ok:false, message:e?.message||"inspect error" }, { status:500 });
  }
}
