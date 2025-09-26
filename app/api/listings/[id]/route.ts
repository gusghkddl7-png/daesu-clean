import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
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
    const body = await req.json();

    // ===== 업데이트 문서(안전 변환) =====
    const data: any = {
      // 기본/거래
      dealType: body.dealType ?? undefined,
      buildingType: body.buildingType ?? undefined,

      // 금액
      deposit: toNum(body.deposit),
      rent: toNum(body.rent),
      mgmt: toNum(body.mgmt),

      // 주소/세입자 상태
      tenantInfo: body.tenantInfo ?? "",
      address: body.address ?? body.addressJibeon ?? "",
      addressSub: body.addressSub ?? "",

      // 면적/구조
      areaM2: toNum(body.areaM2),
      rooms: toNum(body.rooms),
      baths: toNum(body.baths),

      // 설비
      elevator: boolish(body.elevator) || body.elevator === "Y" ? "Y" : "N",
      parking: boolish(body.parking) || body.parking === "가능" ? "가능" : "불가",
      pets: boolish(body.pets) || body.pets === "가능" ? "가능" : "불가",

      // 연락
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

      // 상태/메모
      memo: body.memo ?? "",
      vacant: !!body.vacant,
      completed: !!body.completed,

      // ★ 신규 필드
      labelColor: typeof body.labelColor === "string" ? body.labelColor : "",
      loft: !!body.loft,
      illegal: !!body.illegal,
      photos: normalizePhotos(body.photos),

      updatedAt: new Date(),
    };

    // _id 등 보호 필드 제거
    delete (data as any)._id;
    delete (data as any).createdAt;

    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);
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
