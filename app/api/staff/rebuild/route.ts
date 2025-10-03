// app/api/staff/rebuild/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";
const STAFF = "staff";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

/** GET /api/staff/rebuild
 * users(status:"approved")만 기준으로 staff 컬렉션 재구성
 * 기존 staff 문서는 삭제 후 다시 채움
 */
export async function GET() {
  try {
    const cli = await clientPromise;
    const db = cli.db(DB);

    // 1) 승인 사용자
    const users = await db
      .collection(USERS)
      .find({ status: "approved" })
      .project({ email: 1, name: 1, displayName: 1, createdAt: 1 })
      .toArray();

    // 2) staff 문서로 매핑
    const now = new Date();
    const mapped = users
      .map(u => {
        const email = String(u.email || "").trim().toLowerCase();
        if (!email) return null;
        const displayName = String(u.displayName || u.name || email);
        return {
          email,
          name: String(u.name || ""),
          displayName,
          createdAt: u.createdAt ?? now,
          updatedAt: now,
        };
      })
      .filter(Boolean) as Array<{ email: string; name: string; displayName: string; createdAt: Date; updatedAt: Date }>;

    // 3) staff 초기화 후 재삽입
    await db.collection(STAFF).deleteMany({});
    if (mapped.length) await db.collection(STAFF).insertMany(mapped, { ordered: false });

    // 4) 인덱스
    try { await db.collection(STAFF).createIndex({ email: 1 }, { unique: true }); } catch {}

    return json({ ok: true, summary: { approved_users: users.length, staff_inserted: mapped.length } });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
