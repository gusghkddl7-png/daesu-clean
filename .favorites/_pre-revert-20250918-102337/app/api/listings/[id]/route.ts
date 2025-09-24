import { NextResponse } from "next/server";
import clientPromise from "$RELIMPORT";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
const DB_NAME = process.env.MONGODB_DB || "daesu";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const col = client.db(DB_NAME).collection("listings");
    const doc = await col.findOne({ _id: new ObjectId(params.id) });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...doc, _id: (doc as any)._id?.toString?.() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const col = client.db(DB_NAME).collection("listings");
    const data = await req.json();
    delete (data as any)._id;             // _id는 변경 금지
    (data as any).updatedAt = new Date(); // 업데이트 시각
    await col.updateOne({ _id: new ObjectId(params.id) }, { $set: data }, { upsert: false });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}