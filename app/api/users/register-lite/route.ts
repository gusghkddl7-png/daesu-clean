import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let client: MongoClient | null = null;
async function getClient() {
  if (client) return client;
  const uri = process.env.MONGODB_URI!;
  client = new MongoClient(uri);
  await client.connect();
  return client;
}

type Body = { email?: string; displayName?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    const displayName = (body.displayName || "").trim();

    if (!email || !displayName) {
      return NextResponse.json({ ok:false, error:"email/displayName required" }, { status:400 });
    }
    // 아주 간단한 이메일 형식 체크
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok:false, error:"bad email" }, { status:400 });
    }

    const cli = await getClient();
    const db  = cli.db(process.env.MONGODB_DB);
    const col = db.collection("users");

    const now = new Date().toISOString();
    // 이미 approved면 건드리지 않고, 없거나 다른 상태면 pending으로 세팅
    const res = await col.findOneAndUpdate(
      { email },
      {
        $set: { email, displayName, status: "pending", updatedAt: now },
        $setOnInsert: { id: email, createdAt: now }
      },
      { upsert: true, returnDocument: "after", projection: { _id:0 } }
    );

    return NextResponse.json({ ok:true, user: res });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}
