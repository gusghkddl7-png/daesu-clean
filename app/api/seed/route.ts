import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "daesu-clean";
const SEED_TOKEN = process.env.SEED_TOKEN || "";

type Doc = Record<string, any>;

async function upsertMany(colName: string, arr: Doc[] | undefined) {
  if (!Array.isArray(arr) || arr.length === 0) return { col: colName, matched: 0, upserted: 0, inserted: 0, errors: 0 };
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const col = db.collection(colName);

  let matched = 0, upserted = 0, inserted = 0, errors = 0;

  for (const doc of arr) {
    try {
      const id = (doc._id || doc.id);
      if (id) {
        const res = await col.updateOne({ _id: id }, { $set: { ...doc, _id: id } }, { upsert: true });
        matched  += res.matchedCount ?? 0;
        upserted += res.upsertedCount ?? 0;
        // insert가 아닌 upsert는 inserted 숫자를 따로 주지 않음
      } else {
        const r = await col.insertOne({ ...doc });
        inserted += r?.acknowledged ? 1 : 0;
      }
    } catch (e) {
      errors += 1;
    }
  }

  await client.close();
  return { col: colName, matched, upserted, inserted, errors };
}

export async function POST(req: NextRequest) {
  try {
    if (!uri) return NextResponse.json({ ok: false, error: "MONGODB_URI missing" }, { status: 500 });

    const body = await req.json();
    if (SEED_TOKEN && body?.token !== SEED_TOKEN) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const s1 = await upsertMany("clients",   body?.clients);
    const s2 = await upsertMany("inquiries", body?.inquiries);
    const s3 = await upsertMany("listings",  body?.listings);

    return NextResponse.json({ ok: true, dbName, summary: [s1, s2, s3] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
