import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// (쿠키 세션을 안 쓰더라도, 엔드포인트는 존재해야 빌드 통과)
export async function POST() {
  // 쿠키 세션을 쓴다면 여기서 쿠키 삭제 로직 추가 가능
  return NextResponse.json({ ok: true });
}

// GET도 허용해 두면 호출하기 편리
export async function GET() {
  return NextResponse.json({ ok: true });
}
