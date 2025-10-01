import { hashSync, genSaltSync } from "bcryptjs";

export function hashPassword(pw: string) {
  return hashSync(pw, genSaltSync(10));
}

export function makeTempPassword(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function normBirth(s: any) {
  return String(s || "").replace(/\D/g, "").replace(/(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3");
}
