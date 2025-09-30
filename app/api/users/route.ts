import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const COLL = "users";
const PENDING = "users_pending";

function safeDecode(v: string | null): string {
  if (!v) return "";
  try { return decodeURIComponent(v); } catch { return v; }
}
function normalizeEmail(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/,/g, ".").toLowerCase();
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const emailQ = safeDecode(url.searchParams.get("email"));
    const idQ = safeDecode(url.searchParams.get("id"));

    const email = normalizeEmail(emailQ);
    const id = (idQ || "").trim();

    if (!email && !id) {
      return NextResponse.json({ error: "email or id query required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB);
    const col = db.collection(COLL);
    const colPending = db.collection(PENDING);

    let r1 = { deletedCount: 0 }, r2 = { deletedCount: 0 };

    if (email) {
      r1 = await col.deleteOne({ email });
      if (r1.deletedCount === 0) r1 = await col.deleteOne({ email: emailQ });
      r2 = await colPending.deleteOne({ email });
      if (r2.deletedCount === 0) r2 = await colPending.deleteOne({ email: emailQ });
    }

    if (!email && id) {
      r1 = await col.deleteOne({ id });
      r2 = await colPending.deleteOne({ id });
    }

    if ((r1.deletedCount ?? 0) + (r2.deletedCount ?? 0) === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      deletedBy: email ? "email" : "id",
      value: email || id,
      counts: { approved: r1.deletedCount, pending: r2.deletedCount },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
