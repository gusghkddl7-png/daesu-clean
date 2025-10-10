// app/api/buildings/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

/**
 * GET /api/buildings
 *   - 전체/검색/동 필터
 *   - ?q=검색어  (건물명/주소)
 *   - ?dong=성내동
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const dong = (searchParams.get("dong") || "").trim();

    const cli = await clientPromise;
    const db  = cli.db(DB);
    const col = db.collection("buildings");

    const cond: any = {};
    if (dong) cond.dong = dong;
    if (q) {
      cond.$or = [
        { name:   { $regex: q, $options: "i" } },
        { address:{ $regex: q, $options: "i" } },
      ];
    }

    const items = await col
      .find(cond)
      .project({ _id: 1, name: 1, address: 1, dong: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(300)
      .toArray();

    const rows = items.map(it => ({
      id: String(it._id),
      name: it.name,
      address: it.address,
      dong: it.dong,
      createdAt: it.createdAt,
    }));

    return json({ ok: true, items: rows });
  } catch (e:any) {
    return json({ ok:false, error:e?.message||"buildings list error" }, { status:500 });
  }
}

/**
 * POST /api/buildings
 *   body: { name: string, address: string, dong?: string }
 *   - 주소에서 강동구 ___동 자동 추출(옵션)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || "").trim();
    const address = (body?.address || "").trim();
    let dong = (body?.dong || "").trim();

    if (!name || !address) {
      return json({ ok:false, error:"name, address 필수" }, { status:400 });
    }
    if (!dong) {
      const m = address.match(/강동구\s*([가-힣]+동)/);
      dong = m?.[1] ?? "성내동";
    }

    const cli = await clientPromise;
    const db  = cli.db(DB);
    const col = db.collection("buildings");

    const now = new Date();
    const doc = { name, address, dong, createdAt: now };
    const ins = await col.insertOne(doc);

    return json({
      ok: true,
      item: { id: String(ins.insertedId), ...doc }
    });
  } catch (e:any) {
    return json({ ok:false, error:e?.message||"buildings create error" }, { status:500 });
  }
}
