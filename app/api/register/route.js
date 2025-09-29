// app/api/register/route.js
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

let client = null;
async function db() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client.db(process.env.MONGODB_DB || "daesu-clean-2");
}

// 회원가입: { id, email, displayName? }
export async function POST(req) {
  try {
    const { id, email, displayName } = await req.json();
    if (!id || !email) {
      return NextResponse.json({ ok: false, error: "missing id/email" }, { status: 400 });
    }
    const dbo = await db();
    const col = dbo.collection("users");

    // 이미 있으면 업데이트, 없으면 생성 (대기중으로)
    const now = new Date().toISOString();
    await col.updateOne(
      { id },
      {
        $setOnInsert: { id, email, createdAt: now },
        $set: { status: "pending", displayName: displayName || "" },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
