// app/lib/auth.ts
export const UID_COOKIE = "DAESU_UID";
export const APPROVED_COOKIE = "DAESU_APPROVED";
export const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30일

/**
 * 승인 회원 판정:
 * - users 컬렉션에 approved: true 가 있으면 승인
 * - 또는 role 이 허용 목록에 있으면 승인
 */
export function isApprovedUser(user: any): boolean {
  const approvedField = user?.approved === true;
  const role = String(user?.role ?? "").toLowerCase();
  const allowedRoles = ["admin", "manager", "agent", "staff"]; // 필요시 확장
  return approvedField || allowedRoles.includes(role);
}
