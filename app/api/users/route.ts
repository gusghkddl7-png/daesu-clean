import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db";
import { hashSync } from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";
const PENDING = "users_pending";

const norm = (s:any)=>String(s??"").trim().toLowerCase();
const fixEmail = (s:any)=> norm(String(s||"").replace(/@([^@]+)$/, (_:any,d:any)=>"@"+String(d).replace(/,/g,".")));

function json(data:any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

/** 가입 신청(대기 테이블에 저장) */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({}));
    const emailRaw = String(body.email || "");
    const email = fixEmail(emailRaw);
    const name  = String(body.name || "");
    const phone = String(body.phone || "");
    const birth = String(body.birth || "") || null;     // yyyy-mm-dd
    const joinDate = String(body.joinDate || "") || null;
    const password = String(body.password || "");

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok:false, message:"이메일 형식이 올바르지 않습니다." }, { status:400 });
    }
    if ((password||"").length < 4) {
      return json({ ok:false, message:"비밀번호는 4자리 이상" }, { status:400 });
    }

    const cli = await clientPromise;
    const db  = cli.db(DB);

    // 이미 승인됨?
    const approved = await db.collection(USERS).findOne({ email });
    if (approved) return json({ ok:false, message:"이미 승인된 계정입니다." }, { status:409 });

    // 대기열에 upsert(이메일 기준)
    const passwordHash = hashSync(password, 10);
    await db.collection(PENDING).updateOne(
      { email },
      {
        $set: {
          email, name, phone, birth, joinDate,
          passwordHash,       // 승인 시 그대로 옮김
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "pending",
        }
      },
      { upsert: true }
    );

    return json({ ok:true });
  } catch(e:any){
    return json({ ok:false, message:e?.message||"signup error" }, { status:500 });
  }
}

/** (기존에 있던) DELETE는 그대로 유지해도 됨 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const emailQ = url.searchParams.get("email");
    const idQ = url.searchParams.get("id");
    const email = emailQ ? fixEmail(emailQ) : "";
    const id = (idQ || "").trim();

    if (!email && !id) {
      return json({ error: "email or id query required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB);
    const col = db.collection(USERS);
    const colPending = db.collection(PENDING);

    let r1 = { deletedCount: 0 } as any, r2 = { deletedCount: 0 } as any;

    if (email) {
      r1 = await col.deleteOne({ email });
      if (r1.deletedCount === 0) r1 = await col.deleteOne({ email: emailQ });
      r2 = await colPending.deleteOne({ email });
      if (r2.deletedCount === 0) r2 = await colPending.deleteOne({ email: emailQ });
    }

    if (!email && id) {
      r1 = await col.deleteOne({ id });
      r2 = await colPending.deleteOne({ id });
    }

    if ((r1.deletedCount ?? 0) + (r2.deletedCount ?? 0) === 0) {
      return json({ error: "not found" }, { status: 404 });
    }
    return json({
      ok: true,
      deletedBy: email ? "email" : "id",
      value: email || id,
      counts: { approved: r1.deletedCount, pending: r2.deletedCount },
    });
  } catch (e: any) {
    return json({ error: e?.message || "error" }, { status: 500 });
  }
}
