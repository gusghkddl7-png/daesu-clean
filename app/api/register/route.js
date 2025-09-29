// app/api/register/route.js
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

let client = null;
async function getClient() {
  if (client) return client;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client;
}

/**
 * body: { email, password, displayName }
 * - email: 필수 (소문자 정규화)
 * - password: 필수 (지금은 저장 안 함; 이후 해시 적용 예정)
 * - displayName: 선택
 * 결과: users 컬렉션에 status:"pending"으로 upsert
 */
export async function POST(req) {
  try {
    const { email, password, displayName } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "email/password required" }, { status: 400 });
    }

    const cli = await getClient();
    const db = cli.db(process.env.MONGODB_DB);
    const col = db.collection("users");

    const now = new Date().toISOString();
    const emailNorm = String(email).toLowerCase();

    // 최초 가입이면 pending으로 생성, 있으면(탈퇴/재요청 등) pending으로 갱신
    const r = await col.updateOne(
      { email: emailNorm },
      {
        $setOnInsert: {
          email: emailNorm,
          createdAt: now,
        },
        $set: {
          displayName: displayName || "",
          status: "pending",
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, upserted: !!r.upsertedId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
