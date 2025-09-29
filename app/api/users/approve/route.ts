// app/api/users/approve/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
  }
  return client.db(process.env.MONGODB_DB);
}

export async function POST(req: Request) {
  try {
    const role = req.headers.get("x-role");
    if (role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const { id, displayName, email } = await req.json();
    if (!id || !displayName) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });

    const db = await getDb();
    // 없으면 생성, 있으면 갱신
    await db.collection("users").updateOne(
      { id },
      {
        $setOnInsert: {
          id,
          email: email || `${id}@example.com`,
          createdAt: new Date().toISOString(),
        },
        $set: {
          displayName,
          status: "approved",
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
