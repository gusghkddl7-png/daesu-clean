import { NextResponse } from "next/server";

// 개발서버에서만 쓰는 아주 단순한 메모리 카운터에요.
// 서버 재시작하면 초기화됩니다.
const counters = new Map<string, number>();

export async function GET(
  _req: Request,
  ctx: { params: { prefix: string } }
) {
  const prefix = ctx?.params?.prefix || "";
  if (!/^[A-Z]{1,2}$/.test(prefix)) {
    // 예: C, J, R, BO, BL, BS 등만 허용 (원하면 규칙 완화 가능)
    return NextResponse.json({ error: "bad prefix" }, { status: 400 });
  }

  const current = counters.get(prefix) ?? 0;
  const next = current + 1;
  counters.set(prefix, next);

  // 4자리 0패딩
  const nextStr = String(next).padStart(4, "0");
  return NextResponse.json({ next: nextStr }, { status: 200 });
}
