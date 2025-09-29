// app/api/users/approve/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
async function getClient() {
  if (client) return client;
  client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  return client;
}

export async function POST(req: Request) {
  const role = req.headers.get("x-role");
  if (role !== "admin") return NextResponse.json({ ok:false, error:"forbidden" }, { status:403 });

  try {
    const { email, displayName } = await req.json();
    if (!email) return NextResponse.json({ ok:false, error:"email required" }, { status:400 });

    const cli = await getClient();
    const db = cli.db(process.env.MONGODB_DB);
    const col = db.collection("users");

    const r = await col.updateOne(
      { email: String(email).toLowerCase() },
      { $set: { status:"approved", displayName: displayName || "" } }
    );
    if (!r.matchedCount) return NextResponse.json({ ok:false, error:"not found" }, { status:404 });

    return NextResponse.json({ ok:true });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}
