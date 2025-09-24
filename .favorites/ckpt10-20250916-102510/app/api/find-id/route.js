import path from "node:path";
import fs from "node:fs/promises";

const DB = path.join(process.cwd(), "data", "users.json");
async function readUsers(){ try { return JSON.parse(await fs.readFile(DB, "utf8")); } catch { return []; } }

export async function POST(req){
  const { name, phone } = await req.json();
  const users = await readUsers();
  const u = users.find(x => x.name === name && x.phone === phone);
  if(!u) return new Response(JSON.stringify({ error:"일치하는 회원이 없습니다." }), { status:404 });
  return new Response(JSON.stringify({ id: u.id }), { status:200, headers:{ "content-type":"application/json" }});
}