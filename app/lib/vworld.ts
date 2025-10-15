// app/lib/vworld.ts
export function getVworldKey() {
  if (typeof window === "undefined") {
    // 서버 사이드: 기본키
    return process.env.VWORLD_KEY || "";
  }
  const host = window.location.hostname;
  if (host === "localhost") return process.env.VWORLD_KEY_LOCALHOST || process.env.VWORLD_KEY || "";
  if (host === "127.0.0.1") return process.env.VWORLD_KEY_LOOPBACK || process.env.VWORLD_KEY || "";
  if (host.endsWith(".vercel.app")) return process.env.VWORLD_KEY_VERCEL || process.env.VWORLD_KEY || "";
  // 기타 도메인: 기본키
  return process.env.VWORLD_KEY || "";
}
