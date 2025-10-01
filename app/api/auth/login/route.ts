import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";
import { compareSync } from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB = process.env.MONGODB_DB || "daesu";

/** 쉼표 -> 점, 소문자, 공백 제거 */
function normEmail(raw: string) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  return s.replace(/\s+/g, "").replace(/,/g, ".");
}
function isEmail(s: string) {
  return /@/.test(s);
}
function emailLocalPart(s: string) {
  const m = String(s).split("@")[0] || "";
  return m.toLowerCase();
}

export async function POST(req: Request) {
  try {
    const { idOrEmail = "", password = "" } = await req.json().catch(() => ({}));

    const input = String(idOrEmail || "").trim();
    if (!input) {
      return NextResponse.json({ ok: false, message: "아이디/이메일을 입력하세요" }, { status: 400 });
    }

    // 매칭 후보 만들기: id / email / email-local-part
    const emailNorm = isEmail(input) ? normEmail(input) : "";
    const idNorm    = isEmail(input) ? emailLocalPart(emailNorm) : input.toLowerCase();
    const localPart = emailLocalPart(emailNorm || input);

    // users 컬렉션에서 한 번에 탐색
    const cli = await clientPromise;
    const db  = cli.db(DB);
    const users = db.collection("users");

    const user = await users.findOne({
      $or: [
        { id: idNorm },
        { email: emailNorm },
        { id: localPart },                 // 이메일 로컬파트로 로그인하는 경우 지원
        { email: { $regex: `^${emailNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }, // 대소문자 변형 대비
      ],
    });

    if (!user) {
      // (보조) 승인목록(staff)만 있고 users에 계정이 안 생긴 케이스 안내
      const staff = await db.collection("staff").findOne({
        $or: [
          { id: idNorm },
          { email: emailNorm },
          { id: localPart },
        ],
      });
      if (staff) {
        return NextResponse.json(
          { ok: false, message: "승인된 직원입니다. 회원가입 시 만든 비밀번호로 로그인하려면 'users' 계정이 필요합니다. 회원가입을 다시 완료해 주세요." },
          { status: 403 }
        );
      }
      return NextResponse.json({ ok: false, message: "아이디가 존재하지 않습니다." }, { status: 404 });
    }

    // 비밀번호 검증
    if (!user.passwordHash) {
      return NextResponse.json(
        { ok: false, message: "이 계정은 비밀번호가 설정되어 있지 않습니다. 회원가입을 완료해 주세요." },
        { status: 403 }
      );
    }
    if (!password || !compareSync(String(password), String(user.passwordHash))) {
      return NextResponse.json({ ok: false, message: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    // 세션 발급 (로컬스토리지에 저장해서 사용)
    const session = {
      id: String(user.id || emailLocalPart(String(user.email || ""))),
      role: String(user.role || "user"),
    };

    return NextResponse.json({ ok: true, session });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "login error" }, { status: 500 });
  }
}
