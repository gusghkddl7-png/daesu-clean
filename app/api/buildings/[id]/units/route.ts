// app/api/buildings/[id]/units/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../../../lib/db";
import { ObjectId } from "mongodb";

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
 * GET /api/buildings/:id/units
 *  - 지정 건물의 호실 목록
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const bid = ctx.params.id;
    if (!bid) return json({ ok:false, error:"invalid id" }, { status:400 });

    const cli = await clientPromise;
    const db  = cli.db(DB);
    const col = db.collection("units");

    const items = await col
      .find({ buildingId: new ObjectId(bid) })
      .project({
        _id:1, buildingId:1, floor:1, ho:1,
        rentMemo:1, tenantMemo:1, expireAt:1, createdAt:1
      })
      .sort({ floor: -1, ho: 1 })
      .limit(1000)
      .toArray();

    const rows = items.map(it => ({
      id: String(it._id),
      floor: it.floor,
      ho: it.ho,
      rentMemo: it.rentMemo || "",
      tenantMemo: it.tenantMemo || "",
      expireAt: it.expireAt ? String(it.expireAt).slice(0,10) : "",
      createdAt: it.createdAt,
    }));

    return json({ ok:true, items: rows });
  } catch (e:any) {
    return json({ ok:false, error:e?.message||"units list error" }, { status:500 });
  }
}

/**
 * POST /api/buildings/:id/units
 *  body: { floor: number, ho: string, rentMemo?, tenantMemo?, expireAt?: "YYYY-MM-DD" }
 */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const bid = ctx.params.id;
    if (!bid) return json({ ok:false, error:"invalid id" }, { status:400 });

    const body = await req.json().catch(() => ({}));
    const floor = Number(body?.floor);
    const ho = (body?.ho || "").trim();
    const rentMemo = (body?.rentMemo || "").trim();
    const tenantMemo = (body?.tenantMemo || "").trim();
    const expireAtStr = (body?.expireAt || "").trim();
    const expireAt = expireAtStr ? new Date(expireAtStr) : null;

    if (!Number.isFinite(floor) || !ho) {
      return json({ ok:false, error:"floor(숫자), ho(문자) 필수" }, { status:400 });
    }

    const cli = await clientPromise;
    const db  = cli.db(DB);
    const col = db.collection("units");

    const now = new Date();
    const doc = {
      buildingId: new ObjectId(bid),
      floor,
      ho,
      rentMemo,
      tenantMemo,
      expireAt: expireAt && !isNaN(expireAt.getTime()) ? expireAt : null,
      createdAt: now,
    };
    const ins = await col.insertOne(doc);

    return json({ ok:true, item: { id:String(ins.insertedId), ...doc } });
  } catch (e:any) {
    return json({ ok:false, error:e?.message||"units create error" }, { status:500 });
  }
}
