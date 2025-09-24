import path from "node:path";
import fs from "node:fs/promises";

const DB = path.join(process.cwd(), "data", "users.json");

async function readUsers(){
  try { const s = await fs.readFile(DB, "utf8"); return JSON.parse(s); }
  catch { return []; }
}
async function writeUsers(list){ await fs.writeFile(DB, JSON.stringify(list, null, 2), "utf8"); }

export async function POST(req) {
  const { id, password, name, phone } = await req.json();
  if(!id || !password || !name || !phone) return new Response(JSON.stringify({ error:"필수 항목 누락" }), { status:400 });
  const users = await readUsers();
  if (users.some(u => u.id === id)) return new Response(JSON.stringify({ error:"이미 존재하는 아이디입니다." }), { status:409 });
  users.push({ id, password, name, phone, approved: false });
  await writeUsers(users);
  return new Response(JSON.stringify({ ok:true, status:"PENDING" }), { status:200, headers:{ "content-type":"application/json" }});
}