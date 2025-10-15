"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** 렌더 깜빡임 방지 */
function HydrateGate({ children }) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok ? children : null;
}

export default function SignInPage() {
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/dashboard";

  const [idOrEmail, setIdOrEmail] = useState("");
  const [password, setPassword]   = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErr("");

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idOrEmail, password })
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j?.ok) {
        setErr(j?.message || "로그인 실패");
        setSubmitting(false);
        return;
      }

      // 세션 로컬 저장(기존 동작 유지)
      try { localStorage.setItem("daesu:session", JSON.stringify(j.session)); } catch {}

      // ✅ 미들웨어 통과용 쿠키 심기 (간편 버전; 추후 서버 Set-Cookie 로 강화 가능)
      const maxAge = 60 * 60 * 24 * 30; // 30일
      document.cookie = `DAESU_UID=${encodeURIComponent(j.session.id)}; path=/; max-age=${maxAge}; samesite=lax`;
      document.cookie = `DAESU_APPROVED=1; path=/; max-age=${maxAge}; samesite=lax`;

      // next 파라미터가 있으면 그리로, 없으면 /dashboard
      router.replace(nextUrl);
    } catch {
      setErr("로그인 오류");
      setSubmitting(false);
    }
  }

  return (
    <HydrateGate>
      <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#f7f8f9" }}>
        <form onSubmit={onSubmit}
              style={{ width: 420, maxWidth: "96%", background: "#fff", border: "1px solid #e5e7eb",
                       borderRadius: 14, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,.06)" }}>
          <h1 style={{ textAlign: "center", fontWeight: 900, margin: "6px 0 14px" }}>대수부동산</h1>

          <label className="lb">이메일</label>
          <input className="ip"
                 value={idOrEmail}
                 onChange={e => setIdOrEmail(e.target.value)}
                 placeholder="ex) apple123@naver.com"
                 autoFocus
                 name="username"
                 autoComplete="username" />

          <label className="lb">비밀번호</label>
          <input className="ip"
                 type="password"
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 name="current-password"
                 autoComplete="current-password" />

          {err && <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 6 }}>{err}</div>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "로그인 중…" : "로그인"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13 }}>
            <a href="/sign-up">회원가입</a>
            <span style={{ display: "flex", gap: 12 }}>
              <a href="/forgot-id">아이디 찾기</a>
              <a href="/forgot-password">비밀번호 찾기</a>
            </span>
          </div>
        </form>

        <style jsx>{`
          .lb{display:block;margin:8px 0 6px;font-size:13.5px;color:#374151}
          .ip{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:10px}
          .btn{width:100%;margin-top:12px;border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:10px;font-weight:800;cursor:pointer}
          .btn[disabled]{opacity:.6;cursor:not-allowed}
          .btn:hover{filter:brightness(1.06)}
        `}</style>
      </main>
    </HydrateGate>
  );
}
