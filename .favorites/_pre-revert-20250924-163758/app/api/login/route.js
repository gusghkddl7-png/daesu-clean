import path from "node:path";
import fs from "node:fs/promises";

const DB = path.join(process.cwd(), "data", "users.json");

async function readUsers(){
  try { const s = await fs.readFile(DB, "utf8"); return JSON.parse(s); }
  catch { return []; }
}

export async function POST(req) {
  const { id, password } = await req.json();
  // 관리자 고정 계정
  if (id === "daesu9544" && password === "g4044570!!") {
    return new Response(JSON.stringify({ ok: true, role: "admin" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  const users = await readUsers();
  const u = users.find(x => x.id === id);
  if (!u)  return new Response(JSON.stringify({ error: "존재하지 않는 계정입니다." }), { status: 400 });
  if (!u.approved) return new Response(JSON.stringify({ error: "관리자 승인 대기 중입니다." }), { status: 403 });
  if (u.password !== password) return new Response(JSON.stringify({ error: "아이디/비밀번호가 올바르지 않습니다." }), { status: 401 });
  return new Response(JSON.stringify({ ok: true, role: "user" }), { status: 200, headers: { "content-type": "application/json" } });
}