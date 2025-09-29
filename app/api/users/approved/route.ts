// app/api/users/approve/route.ts
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

export async function POST(req: Request) {
  // 간단 권한 체크
  if (req.headers.get("x-role") !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const { id, displayName } = await req.json();
    if (!id || !displayName?.trim()) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }
    const col = (await db()).collection("users");
    const r = await col.updateOne(
      { id },
      { $set: { status: "approved", displayName: displayName.trim() } }
    );
    if (!r.matchedCount) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
