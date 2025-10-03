// lib/password.ts
import bcrypt from "bcryptjs";

// 동기 버전이 서버리스에서 안정적
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(String(plain ?? ""), 10);
}

export function comparePassword(plain: string, hashed: string): boolean {
  try {
    return bcrypt.compareSync(String(plain ?? ""), String(hashed ?? ""));
  } catch {
    return false;
  }
}
