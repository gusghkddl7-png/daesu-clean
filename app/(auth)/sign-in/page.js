"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ADMIN = { id: "daesu9544", password: "g4044570!!" };

function loadUsers(){ try{ return JSON.parse(localStorage.getItem("daesu:users")||"[]"); }catch{return[];} }
function saveSession(s){ try{ localStorage.setItem("daesu:session", JSON.stringify(s)); }catch{} }

export default function SignInPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextQ = sp.get("next") || "/dashboard";

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem("neob:id") ?? "";
      const savedPw = localStorage.getItem("neob:pw") ?? "";
      if (savedId) setId(savedId);
      if (savedPw) setPassword(savedPw);
      if (savedId) setRemember(true);
    } catch {}
  }, []);

  async function onSubmit(e){
    e.preventDefault();
    if (loading) return;
    setErr(null); setLoading(true);
    try {
      if (id===ADMIN.id && password===ADMIN.password) {
        saveSession({ id, role: "admin" });
      } else {
        const users = loadUsers();
        const u = users.find(x => x.id === id);
        if(!u) throw new Error("가입된 아이디가 없습니다.");
        if(u.status !== "approved") throw new Error("관리자 승인 대기중입니다.");
        if(u.password !== password) throw new Error("비밀번호가 올바르지 않습니다.");
        saveSession({ id, role: "user" });
      }
      try{
        if (remember){ localStorage.setItem("neob:id", id); localStorage.setItem("neob:pw", password); }
        else { localStorage.removeItem("neob:id"); localStorage.removeItem("neob:pw"); }
      }catch{}
      router.replace(nextQ.startsWith("/") ? nextQ : "/dashboard");
    } catch(e){ setErr(e?.message || "로그인 실패"); }
    finally{ setLoading(false); }
  }

  const go = (path) => (e) => { e.preventDefault(); router.push(path); };

  return (
    <div className="screen">
      <div className="card">
        <div className="brand" aria-disabled>{"대수부동산"}</div>

        <form className="form" onSubmit={onSubmit} id="loginForm">
          <label className="field">
            <span className="label">아이디</span>
            <input
              name="id"
              type="text"
              placeholder={"아이디를 입력하세요"}
              value={id}
              onChange={e=>setId(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span className="label">비밀번호</span>
            <input
              name="password"
              type="password"
              placeholder={"비밀번호를 입력하세요"}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <label className="remember">
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
            <span>아이디/비밀번호 저장</span>
          </label>

          {err && <p className="error">{err}</p>}

          <button className="btn primary" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <div className="actions">
            <a className="link" href="/sign-up" onClick={go("/sign-up")}>회원가입</a><span className="dot">•</span>
            <a className="link" href="/forgot-id" onClick={go("/forgot-id")}>아이디 찾기</a><span className="dot">•</span>
            <a className="link" href="/forgot-password" onClick={go("/forgot-password")}>비밀번호 찾기</a>
          </div>
        </form>
      </div>

      <footer className="site-footer">
        <span className="since"><strong>{"대수부동산"}</strong> <span className="sep">—</span> {"since 2025"}</span>
      </footer>

      <style jsx>{`
        .screen{min-height:100svh;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111}
        .card{width:min(560px,92vw);border-radius:24px;padding:32px 28px 28px;background:#fff;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .brand{font-size:clamp(22px,3.4vw,32px);font-weight:800;letter-spacing:.4px;margin-bottom:18px;color:#111;text-align:center}
        .form{display:grid;gap:14px}
        .field{display:grid;gap:8px}
        .label{font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#555}
        input{width:100%;background:#fff;border:1px solid #d1d5db;border-radius:12px;color:#111;padding:12px 14px;outline:none;transition:.2s}
        input::placeholder{color:#9ca3af}
        input:focus{border-color:#111;box-shadow:0 0 0 3px rgba(0,0,0,.1)}
        .remember{display:flex;align-items:center;gap:8px;margin:2px 0 6px;color:#333;font-size:13px;white-space:nowrap;justify-self:start}
        .error{margin-top:2px;color:#e11d48;font-size:13px}
        .btn{border:1px solid #111;background:#111;color:#fff;border-radius:12px;padding:12px 14px;font-weight:800;letter-spacing:.2px}
        .btn.primary{width:100%}
        .btn.primary:hover{filter:brightness(1.06)}
        .btn.primary:active{transform:translateY(1px)}
        .actions{display:flex;justify-content:center;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap;color:#444;font-size:13.5px}
        .actions .link{color:#111;text-decoration:none;border-bottom:1px dotted rgba(0,0,0,.35)}
        .actions .link:hover{border-bottom-color:#000}
        .dot{opacity:.45}
        .site-footer{position:fixed;left:0;right:0;bottom:16px;display:flex;justify-content:center;pointer-events:none}
        .since{font-size:12.5px;letter-spacing:.5px;color:#444;text-transform:uppercase;opacity:.9;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:8px 14px;box-shadow:0 6px 18px rgba(0,0,0,.06)}
        .since .sep{margin:0 8px;opacity:.5}
      `}</style>
    </div>
  );
}
