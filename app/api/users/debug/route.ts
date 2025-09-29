// app/api/users/debug/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
async function getClient() {
  if (client) return client;
  client = new MongoClient(process.env.MONGODB_URI as string);
  await client.connect();
  return client;
}

export async function GET() {
  try {
    const cli = await getClient();
    const db = cli.db(process.env.MONGODB_DB);
    const collections = await db.listCollections().toArray();
    const colNames = collections.map(c => c.name);

    const users = db.collection("users");
    const count = await users.countDocuments({});
    const latest5 = await users
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      ok: true,
      db: db.databaseName,
      collections: colNames,
      usersCount: count,
      usersSample: latest5,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
