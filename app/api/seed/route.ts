import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "daesu-clean";
const SEED_TOKEN = process.env.SEED_TOKEN || "";

// 이미 DB 쓰는 것으로 알려진 것들(기본 제외)
const DEFAULT_EXCLUDE = new Set<string>([
  "billing","payments","users","auth","sessions"
]);

async function upsertMany(col: any, arr: any[]) {
  if (!Array.isArray(arr) || arr.length === 0) return;
  const bulk = col.initializeUnorderedBulkOp();
  for (const doc of arr) {
    const id = (doc._id ?? doc.id ?? undefined);
    if (id) bulk.find({ _id: id }).upsert().replaceOne({ ...doc, _id: id });
    else     bulk.insert(doc);
  }
  await bulk.execute();
}

export async function POST(req: NextRequest) {
  try {
    if (!uri) return NextResponse.json({ ok: false, error: "MONGODB_URI missing" }, { status: 500 });
    const payload = await req.json();

    if (SEED_TOKEN && payload?.token !== SEED_TOKEN) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // payload 형태 예시:
    // { datasets: { clients:[...], inquiries:[...], listings:[...], schedules:[...], ... },
    //   exclude: ["billing"], include: ["clients", ...] }
    const datasets = payload?.datasets || {};
    const include: string[] | null = Array.isArray(payload?.include) ? payload.include : null;
    const extraExclude = new Set<string>(Array.isArray(payload?.exclude) ? payload.exclude : []);
    const exclude = new Set<string>([...DEFAULT_EXCLUDE, ...extraExclude]);

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    const summary: Record<string, number> = {};
    for (const [name, arr] of Object.entries(datasets as Record<string, any[]>)) {
      const key = name.trim();
      if (!key) continue;
      if (exclude.has(key)) { summary[key] = -1; continue; }
      if (include && !include.includes(key)) { summary[key] = -2; continue; }
      await upsertMany(db.collection(key), arr || []);
      summary[key] = Array.isArray(arr) ? arr.length : 0;
    }

    await client.close();
    return NextResponse.json({ ok: true, dbName, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
