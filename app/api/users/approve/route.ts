import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PENDING_KEY = "pending-users";
const APPROVED_KEY = "approved-users";

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(data, { ...init, headers });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase();
  const name = String(body.name || "");

  const pending: any[] = JSON.parse((global as any)[PENDING_KEY] || "[]");
  const approved: any[] = JSON.parse((global as any)[APPROVED_KEY] || "[]");

  // pending에서 제거
  const nextPending = pending.filter((x) => (x?.email || "").toLowerCase() !== email);
  (global as any)[PENDING_KEY] = JSON.stringify(nextPending);

  // approved에 중복 없이 추가
  if (!approved.some((x) => (x?.email || "").toLowerCase() === email)) {
    approved.push({ email, name, createdAt: new Date().toISOString() });
    (global as any)[APPROVED_KEY] = JSON.stringify(approved);
  }

  return json({ ok: true, pending: nextPending.length, approved: approved.length });
}
