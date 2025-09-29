// app/api/users/pending/route.ts
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

export async function GET(req: Request) {
  try {
    // 간단 보호: 관리자만
    const role = req.headers.get("x-role");
    if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const db = await getDb();
    const list = await db
      .collection("users")
      .find({ status: "pending" }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
