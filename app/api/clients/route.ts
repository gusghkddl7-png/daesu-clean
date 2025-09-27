// app/api/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/mongo";

export const dynamic = "force-dynamic";

// GET /api/clients -> 전체 목록 (MongoDB)
export async function GET() {
  try {
    const db = await getDb();
    const docs = await db.collection("clients").find({}).sort({ _id: -1 }).toArray();
    return NextResponse.json(docs, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

// POST /api/clients -> 업서트
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDb();

    const id = body?.id || `c${Date.now()}`;
    const doc = { ...body, _id: id, id };

    await db.collection("clients").updateOne(
      { _id: id },
      { $set: doc },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, _id: id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
