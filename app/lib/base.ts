// app/lib/base.ts
export function getClientBaseUrl(): string {
  // 브라우저로 노출 가능한 값만 사용
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL!;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return ""; // base가 없으면 상대경로 사용
}

/** base가 있으면 절대경로, 없으면 상대경로('/api/...') 반환 */
export function withBase(path: string, base?: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const b = (base ?? getClientBaseUrl()).replace(/\/+$/, "");
  if (!b) return cleanPath; // 상대경로
  return `${b}${cleanPath}`;
}
