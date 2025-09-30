// app/api/staff/route.js
import { NextResponse } from "next/server";

/**
 * 임시 데이터 (DB 붙이기 전 테스트용)
 * approved === true 이고 '정확히 3글자'인 이름만 반환.
 * 나중에 DB 연동 시 여기만 교체하면 됩니다.
 */
const ALL = [
  { name: "김부장", approved: true },
  { name: "김과장", approved: true },
  { name: "강실장", approved: true },
  { name: "김미녀", approved: true },
  { name: "홍길동", approved: true },
  { name: "최팀장", approved: false }, // 미승인 → 제외
  { name: "이대리님", approved: true }, // 4글자 → 제외
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const approvedOnly = searchParams.get("approved") === "1";

    let list = ALL;
    if (approvedOnly) list = list.filter((x) => x.approved !== false);

    // 정확히 3글자 + 중복 제거
    const names = Array.from(
      new Set(
        list
          .map((x) => (typeof x === "string" ? x : x.name)?.trim())
          .filter((n) => !!n && n.length === 3)
      )
    );

    return NextResponse.json(names, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
