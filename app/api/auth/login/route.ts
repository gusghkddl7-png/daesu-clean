import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";
import { comparePassword } from "../../../../lib/password";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";
const USERS = "users";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

const norm = (s: any) => String(s ?? "").trim();
const normEmail = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/@([^@]+)$/, (_, d) => "@" + d.replace(/,/g, "."));

export async function POST(req: Request) {
  try {
    const { idOrEmail, password } = await req.json().catch(() => ({}));
    const idQ = norm(idOrEmail);
    const emailQ = normEmail(idOrEmail);

    if (!idQ || !password) {
      return json({ ok: false, message: "아이디/이메일과 비밀번호를 입력하세요." }, { status: 400 });
    }

    const cli = await clientPromise;
    const db = cli.db(DB);

    // 민감정보(passwordHash)만 읽고, 나머지는 필요한 필드만
    const user = await db.collection(USERS).findOne(
      { $or: [{ id: idQ }, { email: emailQ }] },
      { projection: { _id: 0, id: 1, email: 1, role: 1, displayName: 1, name: 1, passwordHash: 1 } }
    );

    if (!user) return json({ ok: false, message: "계정을 찾을 수 없습니다." }, { status: 404 });

    // bcrypt 동기 비교
    const ok = comparePassword(password, String(user.passwordHash || ""));
    if (!ok) return json({ ok: false, message: "비밀번호가 올바르지 않습니다." }, { status: 401 });

    const session = {
      id: user.id,
      email: user.email || null,
      role: user.role || "user",
      displayName: user.displayName || user.name || user.id, // 담당자 이름 포함
      ts: Date.now(),
    };

    return json({ ok: true, session });
  } catch (e: any) {
    return json({ ok: false, message: e?.message || "login error" }, { status: 500 });
  }
}
