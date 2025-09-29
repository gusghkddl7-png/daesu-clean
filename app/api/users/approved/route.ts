// app/api/users/approved/route.ts
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

export async function GET() {
  try {
    const cli = await getClient();
    const db = cli.db(process.env.MONGODB_DB);
    const col = db.collection("users");

    const rows = await col
      .find({ status: "approved" })
      .project({
        _id: 0,
        id: 1,
        email: 1,
        displayName: 1,
        status: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // id가 비어 있으면 email로 대체
    const list = rows.map((r: any) => ({ ...r, id: r.id || r.email }));

    return new NextResponse(JSON.stringify(list), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
