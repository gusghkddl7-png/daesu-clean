import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APPROVED_KEY = "approved-users";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET() {
  try {
    const raw = (global as any)[APPROVED_KEY] || "[]";
    const list = JSON.parse(raw);
    return json(list);
  } catch (e: any) {
    return json({ error: e?.message || "error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase();
  const name = String(body.name || "");
  const list = JSON.parse((global as any)[APPROVED_KEY] || "[]");
  // 중복 방지
  const exists = list.some((x: any) => (x?.email || "").toLowerCase() === email);
  if (!exists) list.push({ email, name, createdAt: new Date().toISOString() });
  (global as any)[APPROVED_KEY] = JSON.stringify(list);
  return json({ ok: true });
}
