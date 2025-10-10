// app/api/env/juso/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function pick(host: string | null) {
  const h = (host || "").toLowerCase();
  if (h.includes("daesu-clean-2.vercel.app")) return process.env.JUSO_KEY_VERCEL || process.env.JUSO_KEY;
  if (h.includes("127.0.0.1")) return process.env.JUSO_KEY_127 || process.env.JUSO_KEY_LOCAL || process.env.JUSO_KEY;
  if (h.includes("localhost")) return process.env.JUSO_KEY_LOCAL || process.env.JUSO_KEY_127 || process.env.JUSO_KEY;
  return process.env.JUSO_KEY;
}

export async function GET(req: Request) {
  const host = req.headers.get("host");
  const key = pick(host) || "";
  const mask = key && key.length >= 10 ? `${key.slice(0, 6)}…${key.slice(-4)}` : (key ? "set" : null);

  return NextResponse.json({
    ok: !!key,
    selectedFor: host,
    mask,
    env: process.env.VERCEL ? "vercel" : "local",
    time: new Date().toISOString(),
  });
}
