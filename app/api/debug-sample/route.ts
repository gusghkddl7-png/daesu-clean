import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "daesu-clean";

export async function GET(req: NextRequest) {
  const col = (new URL(req.url)).searchParams.get("col") || "clients";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const docs = await db.collection(col).find({}).limit(5).toArray();
  await client.close();
  return NextResponse.json({ dbName, col, sample: docs });
}
