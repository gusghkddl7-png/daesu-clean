// app/api/env/juso/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.JUSO_KEY || "";
  // 키 전체는 절대 노출하지 말고 일부만 마스킹해서 확인
  const mask =
    key && key.length >= 10 ? `${key.slice(0, 6)}…${key.slice(-4)}` : (key ? "set" : null);

  return NextResponse.json({
    ok: !!key,
    mask,
    env: process.env.VERCEL ? "vercel" : "local",
    time: new Date().toISOString(),
  });
}
