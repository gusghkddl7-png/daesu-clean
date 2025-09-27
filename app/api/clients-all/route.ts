import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
export const dynamic = "force-dynamic";

export async function GET() {
  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.MONGODB_DB || "daesu-clean";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const docs = await db.collection("clients").find({}).sort({ _id: -1 }).toArray();
  await client.close();
  return NextResponse.json(docs);
}
