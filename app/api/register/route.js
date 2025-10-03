// app/api/register/route.js
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { hashSync } from "bcryptjs";

let client = null;
async function getClient() {
  if (client) return client;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client;
}

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";
const PENDING = "users_pending";

const norm = (s) => String(s ?? "").trim().toLowerCase();
const fixEmail = (s) =>
  norm(String(s || "").replace(/@([^@]+)$/, (_m, d) => "@" + String(d).replace(/,/g, ".")));

export async function POST(req) {
  try {
    const { email: rawEmail, password, displayName, name, phone, birth, joinDate } = await req.json();
    const email = fixEmail(rawEmail || "");
    if (!email || !password) return json({ ok: false, error: "email/password required" }, { status: 400 });
    if ((password || "").length < 4) return json({ ok: false, error: "password too short" }, { status: 400 });

    const cli = await getClient();
    const db = cli.db(DB);

    // 이미 승인된 계정이면 차단
    const dup = await db.collection(USERS).findOne({ email });
    if (dup) return json({ ok: false, error: "already approved" }, { status: 409 });

    // 대기열로 upsert
    const now = new Date();
    const passwordHash = hashSync(password, 10);

    await db.collection(PENDING).updateOne(
      { email },
      {
        $set: {
          email,
          name: name ?? displayName ?? "",
          phone: phone ?? "",
          birth: birth ?? null,
          joinDate: joinDate ?? null,
          passwordHash,
          status: "pending",
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
