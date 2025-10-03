import { NextResponse } from "next/server";
import clientPromise from "../../../../../lib/db";
import { hashSync, genSaltSync } from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";

function denyProd() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok:false, error:"forbidden_in_production" }, { status:403 });
  }
}

export async function POST(req: Request) {
  const deny = denyProd(); if (deny) return deny;
  try {
    const { id = "daesu9544", password = "1111" } = await req.json().catch(()=> ({}));
    const passwordHash = hashSync(String(password), genSaltSync(10));

    const cli = await clientPromise;
    const db  = cli.db(DB);

    // staff 기준으로 관리자 계정 보장
    await db.collection("staff").updateOne(
      { id: String(id) },
      { $set: { id: String(id), role: "admin", isAdmin: true, passwordHash } },
      { upsert: true }
    );

    // users 쪽에도 있으면 동기화
    await db.collection("users").updateOne(
      { id: String(id) },
      { $set: { id: String(id), role: "admin", passwordHash } },
      { upsert: true }
    );

    return NextResponse.json({ ok:true, id, role:"admin" });
  } catch(e:any){
    return NextResponse.json({ ok:false, error: e?.message || "seed_error" }, { status:500 });
  }
}
