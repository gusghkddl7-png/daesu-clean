import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
const DB_NAME = process.env.MONGODB_DB || "daesu";
const COLL = "listings";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);
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
    const col = client.db(DB_NAME).collection(COLL);
    const data = await req.json();
    delete (data as any)._id;
    (data as any).updatedAt = new Date();
    await col.updateOne({ _id: new ObjectId(params.id) }, { $set: data }, { upsert: false });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);
    await col.deleteOne({ _id: new ObjectId(params.id) });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
