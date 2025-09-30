import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const norm = (s:any)=>String(s??"").trim().replace(/,/g,".").toLowerCase();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = norm(url.searchParams.get("email"));
    const cli = await clientPromise;
    const db  = cli.db(DB);

    const collections = [
      "staff",
      "pending_users","users_pending","join_requests","users_requests",
      "users"
    ];

    const result: any = {
      ok: true,
      vercelUrl: process.env.VERCEL_URL || "(local?)",
      dbName: DB,
      email,
      hits: [] as any[],
      routes: {
        pending: "/api/users/pending",
        approved: "/api/users/approved",
        approve: "/api/users/approve"
      }
    };

    if (email) {
      for (const c of collections) {
        try {
          const cnt = await db.collection(c).countDocuments({ email: { $regex: `^${email}$`, $options: "i" } });
          result.hits.push({ collection: c, count: cnt });
        } catch {}
      }
    } else {
      // 전체 카운트만 (무거우면 건너뜀)
      for (const c of collections) {
        try {
          const cnt = await db.collection(c).estimatedDocumentCount();
          result.hits.push({ collection: c, estimated: cnt });
        } catch {}
      }
    }

    return NextResponse.json(result);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||"debug error" }, { status:500 });
  }
}
