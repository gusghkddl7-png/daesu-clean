import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 폴백(3글자 승인명)
const FALLBACK = ["김미녀", "김부장", "김실장"];

// staff 문서 예시: { _id, name: "김부장", approved: true }
const DB_NAME = process.env.MONGODB_DB || "daesu";
const COLL = "staff";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const approved = url.searchParams.get("approved");
  try {
    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);

    const cond = approved === "1" ? { approved: true } : {};
    // 목록은 기존 동작 유지: 이름만(3글자 필터) 반환
    const docs = await col.find(cond, { projection: { _id: 0, name: 1 } }).toArray();
    const names = docs.map((d: any) => String(d?.name || "")).filter((s) => s.trim());
    const only3 = names.filter((s) => s.trim().length === 3);
    return NextResponse.json(only3.length ? only3 : FALLBACK);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}

/**
 * POST: 직원 추가
 * Body: { name: "김부장", approved: true }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const approved = !!body?.approved;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (name.length !== 3) return NextResponse.json({ error: "name must be 3 chars" }, { status: 400 });

    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);

    // 중복 방지: 같은 이름 있으면 업데이트
    await col.updateOne({ name }, { $set: { name, approved } }, { upsert: true });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

/**
 * PUT: 직원 승인/이름 변경
 * Body: { name: "김부장", approved: true }
 *  - name이 키 역할. 존재하면 갱신, 없으면 400
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);

    const r = await col.updateOne(
      { name },
      { $set: { name, approved: !!body?.approved } },
      { upsert: false }
    );
    if (r.matchedCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

/**
 * DELETE: 직원 삭제
 * 쿼리로 name 전달 (한글 깨짐 방지용으로 브라우저에서 바로 호출 가능)
 * 예) /api/staff?name=김부장
 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const name = String(url.searchParams.get("name") || "").trim();
    if (!name) return NextResponse.json({ error: "name query is required" }, { status: 400 });

    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLL);

    const r = await col.deleteOne({ name });
    if (r.deletedCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleted: name });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
