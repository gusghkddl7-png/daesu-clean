// app/api/staff/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const COLL_USERS = "users";
const COLL_STAFF = "staff";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

// 표시 라벨 계산: displayName > name > email
function labelOf(x: any) {
  const label = String(x?.displayName || x?.name || x?.label || x?.email || "").trim();
  return label;
}
// 이메일 키(소문자)
function emailKey(x: any) {
  const e = String(x?.email || x?.id || "").trim().toLowerCase();
  return e;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wantLabels = url.searchParams.has("labels") || url.searchParams.has("approved");

    const cli = await clientPromise;
    const db = cli.db(DB);

    // 1) users 승인 목록
    const users = await db.collection(COLL_USERS)
      .find({ status: "approved" })
      .project({ _id: 0, email: 1, name: 1, displayName: 1, approvedAt: 1, createdAt: 1 })
      .toArray();

    // 2) staff 컬렉션(있으면) - 선택 목록 캐시용
    const staff = await db.collection(COLL_STAFF)
      .find({}, { projection: { _id: 0 } })
      .toArray();

    // 3) 합치고 이메일 기준 중복제거
    const merged = [...users, ...staff].filter(x => emailKey(x));
    const byEmail = new Map<string, any>();
    for (const x of merged) {
      const k = emailKey(x);
      if (!k) continue;
      // users 값 우선 → staff 값(보조)
      if (!byEmail.has(k)) {
        byEmail.set(k, {
          id: k,
          email: k,
          name: String(x?.name || "").trim(),
          displayName: String(x?.displayName || x?.label || "").trim(),
        });
      } else {
        const cur = byEmail.get(k);
        cur.name ||= String(x?.name || "").trim();
        cur.displayName ||= String(x?.displayName || x?.label || "").trim();
      }
    }

    // 4) 정규화 + 정렬
    const items = Array.from(byEmail.values()).map((x) => ({
      id: x.email,
      email: x.email,
      name: String(x.name || ""),
      displayName: String(x.displayName || ""),
      label: labelOf(x),
    })).filter(x => x.label);

    items.sort((a, b) => a.label.localeCompare(b.label, "ko"));

    // 5) 라벨 배열 모드(과거 호환: ?approved=1)
    if (wantLabels) {
      const labels = Array.from(new Set(items.map(x => x.label)));
      return json(labels);
    }

    // 6) 기본 모드: 상세 아이템
    return json({ ok: true, items });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "staff error" }, { status: 500 });
  }
}
