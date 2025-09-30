import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const db  = cli.db(process.env.MONGODB_DB);
    const col = db.collection("users");

    const list = await col.find(
      { status: "approved" },
      { projection: { _id:0, id:1, email:1, displayName:1, status:1, createdAt:1, updatedAt:1 } }
    ).sort({ createdAt: -1 }).toArray();

    const fixed = list.map(u => ({ ...u, id: u.id || u.email }));
    return NextResponse.json(fixed);
  } catch {
    return NextResponse.json([]);
  }
}
