// app/api/users/approve/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let client: MongoClient | null = null;
async function getClient() {
  if (client) return client;
  const uri = process.env.MONGODB_URI!;
  client = new MongoClient(uri);
  await client.connect();
  return client;
}

type Body = { id?: string; email?: string; displayName?: string };

export async function POST(req: Request) {
  // 관리자 체크
  const role = req.headers.get("x-role");
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const idOrEmail = (body.id || body.email || "").trim();
  const displayName = (body.displayName || "").trim();

  if (!idOrEmail || !displayName) {
    return NextResponse.json({ ok: false, error: "id/email or displayName missing" }, { status: 400 });
  }

  try {
    const cli = await getClient();
    const db = cli.db(process.env.MONGODB_DB);
    const col = db.collection("users");

    // id 또는 email 어느 쪽으로든 찾아서 승인 처리
    const now = new Date().toISOString();

    const res = await col.findOneAndUpdate(
      { $or: [{ id: idOrEmail }, { email: idOrEmail }] },
      {
        $set: {
          id: idOrEmail, // 없던 문서에도 통일된 키로 보관
          email: idOrEmail, // 가입이 email 기반이라면 email에도 동일 저장
          displayName,
          status: "approved",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { returnDocument: "after", upsert: true, projection: { _id: 0 } }
    );

    return NextResponse.json({ ok: true, user: res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
