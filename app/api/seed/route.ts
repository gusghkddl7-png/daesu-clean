import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "daesu-clean";
const SEED_TOKEN = process.env.SEED_TOKEN || "";

// 기본 제외를 배열로 유지(호환성)
const DEFAULT_EXCLUDE = ["billing","payments","users","auth","sessions"];

async function upsertMany(col: any, arr: any[]) {
  if (!Array.isArray(arr) || arr.length === 0) return;
  const bulk = col.initializeUnorderedBulkOp();
  for (let idx = 0; idx < arr.length; idx++) {
    const doc = arr[idx];
    const id = (doc && (doc._id ?? doc.id)) as (string | undefined);
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

    // datasets: { key: any[] }
    const datasets = (payload && payload.datasets) || {};
    const include: string[] | null = Array.isArray(payload?.include) ? payload.include : null;
    const extraExcludeArr: string[] = Array.isArray(payload?.exclude) ? payload.exclude : [];
    // 배열 합치고 Set.has 로만 사용 (Set 전개/반복 금지)
    const exclude = new Set<string>(DEFAULT_EXCLUDE.concat(extraExcludeArr));

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    const summary: Record<string, number> = {};
    const keys = Object.keys(datasets as Record<string, any[]>);
    for (let i = 0; i < keys.length; i++) {
      const name = keys[i];
      const arr = (datasets as any)[name];
      if (exclude.has(name)) { summary[name] = -1; continue; }
      if (include && include.indexOf(name) === -1) { summary[name] = -2; continue; }
      await upsertMany(db.collection(name), Array.isArray(arr) ? arr : []);
      summary[name] = Array.isArray(arr) ? arr.length : 0;
    }

    await client.close();
    return NextResponse.json({ ok: true, dbName, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
