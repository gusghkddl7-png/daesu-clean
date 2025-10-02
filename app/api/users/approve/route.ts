// app/api/users/approve/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";
const PENDING = "users_pending";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email: rawEmail, displayName: rawDisplayName } = body || {};
    const email = String(rawEmail || "").trim().toLowerCase();
    const displayName = (rawDisplayName || "").trim();

    if (!userId && !email) {
      return json({ ok: false, error: "userId or email required" }, { status: 400 });
    }

    const cli = await clientPromise;
    const db = cli.db(DB);

    // 1) 대기열 조회
    const filter = userId
      ? { _id: new ObjectId(String(userId)) }
      : { email };

    const pendingDoc = await db.collection(PENDING).findOne(filter);
    if (!pendingDoc) {
      return json({ ok: false, error: "pending_not_found" }, { status: 404 });
    }

    // 2) 기존 승인 중복
    const dupApproved = await db.collection(USERS).findOne({ email: pendingDoc.email });
    if (dupApproved) {
      // 대기열 정리만
      await db.collection(PENDING).deleteOne({ _id: pendingDoc._id });
      return json({ ok: true, note: "already_approved_cleaned" });
    }

    // 3) 승인 문서
    const now = new Date();
    const approvedDoc = {
      email: pendingDoc.email,
      name: pendingDoc.name || "",
      displayName: displayName || pendingDoc.displayName || pendingDoc.name || "", // ✅ 표시명 저장
      phone: pendingDoc.phone || "",
      birth: pendingDoc.birth ?? null,
      joinDate: pendingDoc.joinDate ?? null,
      passwordHash: pendingDoc.passwordHash || "",
      status: "approved",
      createdAt: pendingDoc.createdAt ?? now,
      approvedAt: now,
      updatedAt: now,
    };

    // 4) users에 넣고, pending에서 제거
    await db.collection(USERS).insertOne(approvedDoc);
    await db.collection(PENDING).deleteOne({ _id: pendingDoc._id });

    return json({ ok: true, item: approvedDoc });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
