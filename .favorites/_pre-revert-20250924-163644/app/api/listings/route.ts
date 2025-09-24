import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db"; // app/api/listings/route.ts → 루트의 lib/db 로 3단계 상위
export const dynamic = "force-dynamic";     // ✅ API 정적 캐시 끄기
export const revalidate = 0;

const DB_NAME = process.env.MONGODB_DB || "daesu";
const COLL = "listings";

function toNum(v: any) {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    const rows = docs.map((d: any) => ({ ...d, _id: d._id?.toString?.() }));
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 최소 필드 정리(문자→숫자 변환, 기본값)
    const doc: any = {
      createdAt: body.createdAt || new Date().toISOString().slice(0, 10),
      agent: body.agent ?? "",
      code: body.code ?? "",
      dealType: body.dealType ?? "월세",
      buildingType: body.buildingType ?? "",
      deposit: toNum(body.deposit),
      rent: toNum(body.rent),
      mgmt: toNum(body.mgmt),
      tenantInfo: body.tenantInfo ?? "",
      address: body.address ?? body.addressJibeon ?? "",
      addressSub: body.addressSub ?? "",
      areaM2: toNum(body.areaM2),
      rooms: toNum(body.rooms),
      baths: toNum(body.baths),
      elevator: body.elevator ? "Y" : (body.elevator === "Y" ? "Y" : "N"),
      parking: body.parking ? "가능" : (body.parking === "가능" ? "가능" : "불가"),
      pets: body.pets ? "가능" : (body.pets === "가능" ? "가능" : "불가"),
      landlord: body.landlord ?? body.landlordName ?? "",
      tenant: body.tenant ?? body.tenantName ?? "",
      contact1: body.contact1 ?? body.landlordPhone ?? "",
      contact2: body.contact2 ?? body.tenantPhone ?? "",
      isBiz: body.isBiz ? "Y" : (body.isBiz === "Y" ? "Y" : "N"),
      memo: body.memo ?? "",
      vacant: !!body.vacant || (typeof body.tenantInfo === "string" && body.tenantInfo.includes("공실")),
      completed: !!body.completed,
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);
    const r = await col.insertOne(doc);
    return NextResponse.json({ ok: true, _id: r.insertedId.toString() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
