import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: { prefix: string } }) {
  const prefix = ctx?.params?.prefix?.toUpperCase?.();
  if (!prefix) return NextResponse.json({ next: "0001" });

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) return NextResponse.json({ next: "0001" });

    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    const col = db.collection("listings");

    const re = new RegExp(`^${prefix}-\\d{4}$`, "i");
    const doc = await col.find({ code: { $regex: re } })
      .project({ code: 1 })
      .sort({ code: -1 })
      .limit(1)
      .next();

    await client.close();

    if (!doc?.code) return NextResponse.json({ next: "0001" });
    const m = String(doc.code).match(/-(\d{4})$/);
    const cur = m ? parseInt(m[1], 10) : 0;
    const nextNum = Math.max(0, cur) + 1;
    const next = String(nextNum).padStart(4, "0");
    return NextResponse.json({ next });
  } catch {
    return NextResponse.json({ next: "0001" });
  }
}