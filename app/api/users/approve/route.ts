// app/api/users/approve/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";
const PENDING = "users_pending";
const STAFF = "staff";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

export async function POST(req: Request) {
  try {
    const { userId, email: rawEmail, displayName: rawDisplayName } = await req.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    const displayName = String(rawDisplayName || "").trim();

    if (!userId && !email) {
      return json({ ok: false, error: "userId or email required" }, { status: 400 });
    }

    const cli = await clientPromise;
    const db = cli.db(DB);

    // 1) 대기열에서 후보 찾기
    const filter = userId ? { _id: new ObjectId(String(userId)) } : { email };
    const pendingDoc = await db.collection(PENDING).findOne(filter);
    if (!pendingDoc) {
      return json({ ok: false, error: "pending_not_found" }, { status: 404 });
    }

    // 2) 이미 승인된 계정 중복 체크
    const dupApproved = await db.collection(USERS).findOne({ email: pendingDoc.email });
    const now = new Date();

    if (dupApproved) {
      // displayName 갱신만 (있으면)
      if (displayName) {
        await db.collection(USERS).updateOne(
          { _id: dupApproved._id },
          { $set: { displayName, updatedAt: now } }
        );
        await db.collection(STAFF).updateOne(
          { email: dupApproved.email.toLowerCase() },
          {
            $set: {
              email: dupApproved.email.toLowerCase(),
              displayName: displayName || dupApproved.displayName || dupApproved.name || dupApproved.email,
              name: dupApproved.name || "",
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true }
        );
      }
      // 대기열 정리
      await db.collection(PENDING).deleteOne({ _id: pendingDoc._id });
      return json({ ok: true, note: "already_approved_cleaned" });
    }

    // 3) 승인 문서 구성
    const approvedDoc = {
      email: String(pendingDoc.email || email).toLowerCase(),
      name: pendingDoc.name || "",
      displayName: displayName || pendingDoc.displayName || pendingDoc.name || pendingDoc.email || "",
      phone: pendingDoc.phone || "",
      birth: pendingDoc.birth ?? null,
      joinDate: pendingDoc.joinDate ?? null,
      passwordHash: pendingDoc.passwordHash || "",
      status: "approved",
      createdAt: pendingDoc.createdAt ?? now,
      approvedAt: now,
      updatedAt: now,
    };

    // 4) users에 넣고, pending에서 제거 (승격)
    await db.collection(USERS).insertOne(approvedDoc);
    await db.collection(PENDING).deleteOne({ _id: pendingDoc._id });

    // 5) staff 업서트 (선택 목록용)
    await db.collection(STAFF).updateOne(
      { email: approvedDoc.email },
      {
        $set: {
          email: approvedDoc.email,
          displayName: approvedDoc.displayName || approvedDoc.name || approvedDoc.email,
          name: approvedDoc.name || "",
          phone: approvedDoc.phone || "",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return json({ ok: true });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
