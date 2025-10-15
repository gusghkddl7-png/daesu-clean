// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { UID_COOKIE, APPROVED_COOKIE } from "./lib/auth";

/** 완전 공개 경로(정확 일치) */
const PUBLIC_PATHS = new Set([
  "/sign-in",
  "/api/auth/login",
  "/api/auth/logout",
  "/favicon.ico",
  "/robots.txt",
]);

/** 접두사로 허용할 공개 경로 */
const PUBLIC_PREFIXES = [
  "/_next",          // Next 정적
  "/assets",         // 정적
  "/api/geocode",    // ← 좌표 API 전부 허용
  "/api/building",   // ← 건물요약 API(쓸 경우)
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|map|txt)$/i.test(pathname)) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const hasUid = !!req.cookies.get(UID_COOKIE)?.value;
  const approved = req.cookies.get(APPROVED_COOKIE)?.value === "1";

  if (!hasUid || !approved) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: "/:path*" };
