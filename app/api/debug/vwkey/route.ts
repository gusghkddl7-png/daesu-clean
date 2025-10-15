// app/api/debug/vwkey/route.ts
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const envs = {
    VWORLD_KEY: process.env.VWORLD_KEY || "",
    VWORLD_KEY_LOCALHOST: process.env.VWORLD_KEY_LOCALHOST || "",
    VWORLD_KEY_LOOPBACK: process.env.VWORLD_KEY_LOOPBACK || "",
    VWORLD_KEY_VERCEL: process.env.VWORLD_KEY_VERCEL || "",
  };
  const pick =
    envs.VWORLD_KEY ||
    envs.VWORLD_KEY_LOCALHOST ||
    envs.VWORLD_KEY_LOOPBACK ||
    "";

  const mask = (s: string) =>
    s ? `${s.slice(0, 6)}...${s.slice(-6)}` : "";

  return NextResponse.json({
    picked: mask(pick),
    picked_source: pick
      ? (process.env.VWORLD_KEY ? "VWORLD_KEY"
        : process.env.VWORLD_KEY_LOCALHOST ? "VWORLD_KEY_LOCALHOST"
        : "VWORLD_KEY_LOOPBACK")
      : "(none)",
    envs_masked: {
      VWORLD_KEY: mask(envs.VWORLD_KEY),
      VWORLD_KEY_LOCALHOST: mask(envs.VWORLD_KEY_LOCALHOST),
      VWORLD_KEY_LOOPBACK: mask(envs.VWORLD_KEY_LOOPBACK),
      VWORLD_KEY_VERCEL: mask(envs.VWORLD_KEY_VERCEL),
    },
  });
}
