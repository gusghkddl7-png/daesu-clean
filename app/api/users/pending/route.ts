// app/api/users/pending/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
async function db() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
  }
  return client.db(process.env.MONGODB_DB || "daesu-clean-2");
}

export async function GET(req: Request) {
  // 간단 권한 체크 (관리자 전용)
  if (req.headers.get("x-role") !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const col = (await db()).collection("users");
    const rows = await col
      .find({ status: "pending" }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
