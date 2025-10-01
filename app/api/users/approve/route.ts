import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";
const PENDING = "users_pending";

const norm = (s:any)=>String(s??"").trim().toLowerCase();
const fixEmail = (s:any)=> norm(String(s||"").replace(/@([^@]+)$/, (_:any,d:any)=>"@"+String(d).replace(/,/g,".")));

function json(data:any, init: ResponseInit = {}) {
  const h = new Headers(init.headers);
  h.set("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  h.set("Pragma","no-cache"); h.set("Expires","0");
  return NextResponse.json(data, { ...init, headers: h });
}

export async function POST(req: Request) {
  try{
    const body = await req.json().catch(()=> ({}));
    const email = fixEmail(String(body.email || ""));
    if (!email) return json({ ok:false, message:"email required" }, { status:400 });

    const cli = await clientPromise;
    const db  = cli.db(DB);

    // 대기열에서 꺼냄
    const pend = await db.collection(PENDING).findOne({ email });
    if (!pend) return json({ ok:false, message:"pending not found" }, { status:404 });

    // users 로 upsert (passwordHash 포함, 관리자 확인용 필드 유지)
    await db.collection(USERS).updateOne(
      { email },
      { $set: {
          email,
          name: pend.name || "",
          phone: pend.phone || "",
          birth: pend.birth || null,
          joinDate: pend.joinDate || null,
          passwordHash: pend.passwordHash || null,
          role: "user",
          status: "approved",
          updatedAt: new Date(),
          createdAt: pend.createdAt || new Date(),
        }
      },
      { upsert: true }
    );

    // 대기열에서 제거
    await db.collection(PENDING).deleteOne({ email });

    return json({ ok:true });
  }catch(e:any){
    return json({ ok:false, message:e?.message||"approve error" }, { status:500 });
  }
}
