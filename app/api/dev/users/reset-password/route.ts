import { NextResponse } from "next/server";
import clientPromise from "../../../../../lib/db";
import { hashSync } from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";

const norm = (s:any)=>String(s??"").trim().toLowerCase();
const fixEmail = (s:any)=> norm(String(s||"").replace(/@([^@]+)$/, (_:any,d:any)=>"@"+String(d).replace(/,/g,".")));

export async function POST(req: Request) {
  try {
    // 안전장치: 프로덕션에서 실수 방지
    if (process.env.VERCEL_ENV === "production") {
      return NextResponse.json({ ok:false, message:"disabled in production" }, { status:403 });
    }

    const body = await req.json().catch(()=> ({}));
    const raw = String(body.email || body.id || "");
    const pw  = String(body.password || "");
    if (!raw || !pw) return NextResponse.json({ ok:false, message:"email/id, password 필요" }, { status:400 });

    const email = raw.includes("@") ? fixEmail(raw) : null;
    const id    = raw.includes("@") ? null : norm(raw);

    const cli = await clientPromise;
    const db  = cli.db(DB);
    const users = db.collection(USERS);

    const q = email ? { email } : { id };
    const passwordHash = hashSync(pw, 10);

    const r = await users.updateOne(q, {
      $set: { passwordHash, updatedAt: new Date() }
    });

    if (!r.matchedCount) return NextResponse.json({ ok:false, message:"user not found" }, { status:404 });
    return NextResponse.json({ ok:true });
  } catch(e:any){
    return NextResponse.json({ ok:false, message:e?.message||"reset error" }, { status:500 });
  }
}
