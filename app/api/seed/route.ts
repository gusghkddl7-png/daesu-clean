import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "daesu-clean";
const SEED_TOKEN = process.env.SEED_TOKEN || "";

async function upsertMany(col: any, arr: any[]) {
  if (!Array.isArray(arr) || arr.length === 0) return;
  const bulk = col.initializeUnorderedBulkOp();
  for (const doc of arr) {
    const id = (doc._id || doc.id || undefined);
    if (id) bulk.find({ _id: id }).upsert().replaceOne({ ...doc, _id: id });
    else bulk.insert(doc);
  }
  await bulk.execute();
}

export async function POST(req: NextRequest) {
  try {
    if (!uri) return NextResponse.json({ ok: false, error: "MONGODB_URI missing" }, { status: 500 });
    const body = await req.json();

    if (SEED_TOKEN && body?.token !== SEED_TOKEN) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    await upsertMany(db.collection("clients"),   body?.clients   ?? []);
    await upsertMany(db.collection("inquiries"), body?.inquiries ?? []);
    await upsertMany(db.collection("listings"),  body?.listings  ?? []);

    await client.close();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
