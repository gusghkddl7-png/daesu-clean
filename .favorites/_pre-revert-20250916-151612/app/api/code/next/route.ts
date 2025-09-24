import { NextResponse, NextRequest } from "next/server";
import { peekNextCode, takeNextCode } from "@/lib/code";

export async function GET() {
  return NextResponse.json(peekNextCode(), { headers: { "cache-control": "no-store" } });
}

export async function POST(_req: NextRequest) {
  // 실제 발급(증가/저장)
  return NextResponse.json(takeNextCode(), { headers: { "cache-control": "no-store" } });
}