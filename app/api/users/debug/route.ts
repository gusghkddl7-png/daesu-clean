import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const COLL_USERS = "users";
const COLL_PENDING = "users_pending";
const COLL_STAFF = "staff";

const esc = (s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const normEmail = (s:any)=> String(s??"").trim().toLowerCase().replace(/\s+/g,"").replace(/,/g,".")
  .replace(/@([^@]+)$/,(_,dom)=>"@"+String(dom||"").replace(/,/g,"."));

function json(data:any, init:ResponseInit={}) {
  const h = new Headers(init.headers);
  h.set("Cache-Control","no-store"); return NextResponse.json(data,{...init, headers:h});
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("email") || "";
    const email = normEmail(raw);
    if (!email) return json({ ok:false, message:"email query required" }, { status:400 });

    const cli = await clientPromise;
    const db  = cli.db(DB);
    const eq = { email: { $regex: `^${esc(email)}$`, $options: "i" } };

    const [users, pending, staff] = await Promise.all([
      db.collection(COLL_USERS).find(eq, { projection:{ _id:0, email:1 } }).toArray().catch(()=>[]),
      db.collection(COLL_PENDING).find(eq, { projection:{ _id:0, email:1 } }).toArray().catch(()=>[]),
      db.collection(COLL_STAFF).find(eq, { projection:{ _id:0, email:1 } }).toArray().catch(()=>[]),
    ]);

    return json({
      ok: true,
      raw,
      normalized: email,
      counts: { users: users.length, pending: pending.length, staff: staff.length },
      samples: { users, pending, staff },
    });
  } catch (e:any) {
    return json({ ok:false, error:e?.message||"debug error" }, { status:500 });
  }
}
