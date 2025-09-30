import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PENDING_KEY = "pending-users";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  // 캐시 완전 금지
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET() {
  try {
    const raw = (global as any)[PENDING_KEY] || "[]";
    const rows = JSON.parse(raw) as Array<{ email: string; name?: string; createdAt?: string }>;
    return json(rows);
  } catch (e: any) {
    return json({ error: e?.message || "error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // (선택) 테스트용 등록 유지
  const body = await req.json().catch(() => ({}));
  const list = JSON.parse((global as any)[PENDING_KEY] || "[]");
  list.push({ email: String(body.email || "").toLowerCase(), name: String(body.name || ""), createdAt: new Date().toISOString() });
  (global as any)[PENDING_KEY] = JSON.stringify(list);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").toLowerCase();
  const list: any[] = JSON.parse((global as any)[PENDING_KEY] || "[]");
  const next = list.filter((x) => (x?.email || "").toLowerCase() !== email);
  (global as any)[PENDING_KEY] = JSON.stringify(next);
  return json({ ok: true, deleted: list.length - next.length });
}
