import { NextResponse } from "next/server";

export async function GET() {
  // TODO: DB 연동 시 notices 컬렉션에서 가져오도록 교체
  return NextResponse.json([], { status: 200 });
}
