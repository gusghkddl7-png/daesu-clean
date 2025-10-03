import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 클라이언트에서 로그인 상태 체크용으로 쓸 수 있게 심플하게 응답
export async function GET() {
  // (지금은 로컬스토리지 세션이라 서버가 확인할 건 없음)
  return NextResponse.json({ ok: true });
}

// 필요하면 POST도 허용
export async function POST() {
  return NextResponse.json({ ok: true });
}
