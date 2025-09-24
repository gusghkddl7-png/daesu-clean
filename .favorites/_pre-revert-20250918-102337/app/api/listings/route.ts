import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db";

export const dynamic = "force-dynamic";
const DB_NAME = process.env.MONGODB_DB || "daesu";

export async function GET() {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection("listings");
  const items = await col.find({}).sort({ createdAt: -1 }).limit(500).toArray();
  // ObjectId 직렬화 안전 처리
  const normalized = items.map((it: any) => ({
    ...it,
    _id: it?._id?.toString?.() ?? it._id,
  }));
  return NextResponse.json(normalized);
}

export async function POST(req: Request) {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection("listings");
  const data = await req.json();
  if (!data.createdAt) data.createdAt = new Date(); // 서버시간 보강
  const result = await col.insertOne(data);
  return NextResponse.json({ _id: result.insertedId.toString(), ...data }, { status: 201 });
}
