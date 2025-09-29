// app/api/users/approved/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
async function getClient() {
  if (client) return client;
  client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  return client;
}

export async function GET() {
  try {
    const cli = await getClient();
    const db = cli.db(process.env.MONGODB_DB);
    const col = db.collection("users");
    const rows = await col.find(
      { status: "approved" },
      { projection: { _id: 0, email: 1, displayName: 1, status: 1, createdAt: 1 } }
    ).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}
