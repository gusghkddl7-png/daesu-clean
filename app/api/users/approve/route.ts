import { NextResponse } from "next/server";
import { MongoClient, WithId } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let client: MongoClient | null = null;
async function getClient() {
  if (client) return client;
  client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  return client;
}

type Body = { email?: string; id?: string; displayName?: string };
const norm = (s?: string) => (s || "").trim().toLowerCase();

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = norm(body.email);
    const id    = norm(body.id);
    const displayName = (body.displayName || "").trim();
    if (!displayName || (!email && !id)) {
      return NextResponse.json({ ok:false, error:"displayName + (email|id) required" }, { status:400 });
    }

    const cli = await getClient();
    const db  = cli.db(process.env.MONGODB_DB);
    const col = db.collection("users");
    const now = new Date().toISOString();

    // 후보 전부 찾기 (email/id 어느 쪽이든)
    const candidates = await col.find({
      $or: [
        ...(email ? [{ email }, { id: email }] : []),
        ...(id    ? [{ email: id }, { id }]     : []),
      ],
    }, { projection: { _id:0 } }).toArray();

    const key = email || id!;

    if (candidates.length === 0) {
      // 없으면 새로 만들되 곧바로 approved
      await col.updateOne(
        { email: key },
        {
          $set: { email: key, id: key, displayName, status: "approved", updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );
    } else {
      // 대표 문서 하나로 정규화
      const main = candidates[0] as WithId<any>;
      const canonical = norm((main as any).email) || norm((main as any).id);

      await col.updateOne(
        { $or: [{ email: canonical }, { id: canonical }] },
        {
          $set: { email: canonical, id: canonical, displayName, status: "approved", updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );

      // 나머지 중복 키 수집
      const dupKeys = new Set<string>([canonical]);
      for (const c of candidates.slice(1)) {
        const k = norm((c as any).email) || norm((c as any).id);
        if (k && !dupKeys.has(k)) dupKeys.add(k);
      }

      // canonical 제외하고 삭제 (※ Array.from으로 변경)
      const toRemove = Array.from(dupKeys).filter(k => k !== canonical);
      if (toRemove.length) {
        await col.deleteMany({
          $or: toRemove.reduce((acc, k) => (acc.push({ email:k }, { id:k }), acc), [] as any[])
        });
      }
    }

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}
