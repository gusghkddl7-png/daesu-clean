import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db"; // app/api/listings/route.ts → 루트의 lib/db 로 3단계 상위

export const dynamic = "force-dynamic"; // ✅ API 정적 캐시 끄기
export const revalidate = 0;

const DB_NAME = process.env.MONGODB_DB || "daesu";
const COLL = "listings";

/** ===== 유틸 ===== */
function toNum(v: any) {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function boolish(v: any) {
  return v === true || v === "Y" || v === "1" || v === 1 || v === "true";
}
type Photo = { name: string; dataUrl: string };
function normalizePhotos(p: any): Photo[] {
  if (!Array.isArray(p)) return [];
  return p
    .map((x) => ({
      name: typeof x?.name === "string" ? x.name : "",
      dataUrl: typeof x?.dataUrl === "string" ? x.dataUrl : "",
    }))
    .filter((x) => x.name && x.dataUrl);
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

    // ===== 안전 변환 & 기본값 =====
    const doc: any = {
      createdAt: body.createdAt || new Date().toISOString(),
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

      elevator: boolish(body.elevator) || body.elevator === "Y" ? "Y" : "N",
      parking: boolish(body.parking) || body.parking === "가능" ? "가능" : "불가",
      pets: boolish(body.pets) || body.pets === "가능" ? "가능" : "불가",

      landlord: body.landlord ?? body.landlordName ?? "",
      tenant: body.tenant ?? body.tenantName ?? "",
      contact1: body.contact1 ?? body.landlordPhone ?? "",
      contact2: body.contact2 ?? body.tenantPhone ?? "",

      // 기관/서류 플래그
      lh: !!body.lh,
      sh: !!body.sh,
      hug: !!body.hug,
      hf: !!body.hf,
      guarInsured: !!(body.guarInsured ?? body.guaranteeInsured),
      isBiz: boolish(body.isBiz) ? "Y" : body.isBiz === "Y" ? "Y" : "N",
      airbnb: !!body.airbnb,

      memo: body.memo ?? "",
      vacant:
        !!body.vacant ||
        (typeof body.tenantInfo === "string" && body.tenantInfo.includes("공실")),
      completed: !!body.completed,

      // ★ 신규 필드
      labelColor: typeof body.labelColor === "string" ? body.labelColor : "",
      loft: !!body.loft,
      illegal: !!body.illegal,
      photos: normalizePhotos(body.photos),

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
