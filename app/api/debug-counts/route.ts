import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "daesu-clean";

export async function GET() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const clients   = await db.collection("clients").countDocuments({});
  const inquiries = await db.collection("inquiries").countDocuments({});
  const listings  = await db.collection("listings").countDocuments({});
  await client.close();
  return NextResponse.json({ dbName, counts: { clients, inquiries, listings } });
}
