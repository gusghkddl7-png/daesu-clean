import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const STAFF = "staff";
// “가입 대기/초대” 컬렉션명이 다르면 아래를 실제 이름으로 변경하세요.
const JOIN_REQ = "join_requests";

/** 안전 ObjectId */
function oid(id: string) {
  try { return new ObjectId(id); } catch { return null; }
}

/** 단건 조회 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "bad id" }, { status: 400 });

  try {
    const client = await clientPromise;
    const col = client.db(DB).collection(STAFF);
    const doc = await col.findOne({ _id });
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ...doc, _id: (doc as any)._id?.toString?.() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

/** 일부 수정(승인/이름 등) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  // 허용 필드만 업데이트
  const allow = ["name", "approved", "role", "email"] as const;
  const $set: any = {};
  for (const k of allow) {
    if (k in body) $set[k] = body[k];
  }
  if (!Object.keys($set).length) {
    return NextResponse.json({ ok: false, error: "no fields" }, { status: 400 });
  }
  $set.updatedAt = new Date();

  try {
    const client = await clientPromise;
    const col = client.db(DB).collection(STAFF);
    const r = await col.updateOne({ _id }, { $set });
    if (!r.matchedCount) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

/** 삭제 + 관련 대기요청(이메일/이름 매칭)도 정리 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "bad id" }, { status: 400 });

  try {
    const client = await clientPromise;
    const db = client.db(DB);
    const staffCol = db.collection(STAFF);
    const joinCol  = db.collection(JOIN_REQ);

    // 지울 직원 문서 조회(이메일/이름 확보)
    const doc = await staffCol.findOne({ _id });
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

    // 직원 삭제
    await staffCol.deleteOne({ _id });

    // 가입 대기/초대 문서 함께 정리 (있을 때만)
    const q: any = {};
    if (doc.email) q.email = doc.email;
    // 이메일이 없고 이름이 있으면 이름으로도 한 번 청소 (환경에 따라 불필요하면 지워도 됨)
    if (!q.email && doc.name) q.name = doc.name;

    if (Object.keys(q).length) {
      await joinCol.deleteMany(q);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
