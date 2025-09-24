"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ICON = {
  schedule: "🗓️",
  clients: "👥",
  listings: "🏢",
  urgent: "🚨",
  contracts: "📝",
  billing: "💳",
  payroll: "💼",
  settings: "⚙️",
};

const TILES = [
  { key: "schedule",  label: "일정/할일",     desc: "투어·계약·결제", path: "/schedule" },
  { key: "clients",   label: "고객/문의",     desc: "의뢰·파이프라인", path: "/clients" },
  { key: "listings",  label: "매물관리",      desc: "신규·공동중개",   path: "/listings" },
  { key: "urgent",    label: "급한 임차문의",  desc: "D-30 핫리드",     path: "/urgent" },
  { key: "contracts", label: "계약/문서",     desc: "계약서·부속합의", path: "/contracts" },
  { key: "billing",   label: "결제/청구",     desc: "입금·정리",       path: "/billing" },
  { key: "payroll",   label: "급여/정산",     desc: "관리자 전용",     path: "/payroll",  adminOnly: true },
  { key: "settings",  label: "설정",          desc: "관리자 전용",     path: "/settings", adminOnly: true },
];

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null); // { id, role }
  const role = session?.role ?? "guest";

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("daesu:session") || "null");
      if (!s) { router.replace("/sign-in"); return; }
      setSession(s);
    } catch {
      router.replace("/sign-in");
    }
  }, [router]);

  function logout(){
    try { localStorage.removeItem("daesu:session"); } catch {}
    router.replace("/sign-in");
  }

  const tiles = useMemo(
    () => TILES.filter(t => !(t.adminOnly && role !== "admin")),
    [role]
  );

  return (
    <main className="wrap">
      {/* 상단 바 */}
      <div className="topbar">
        <div className="top-inner">
          <button className="brand" onClick={()=>router.push("/dashboard")} aria-label="대시보드로">
            대수부동산
          </button>
          {session && (
            <div className="account">
              <span className="id">{session.id}</span>
              <span className={`role ${role}`}>{role==="admin" ? "(관리자)" : "(일반)"}</span>
              <button className="logout" onClick={logout}>로그아웃</button>
            </div>
          )}
        </div>
      </div>

      {/* 본문 헤더 */}
      <header className="head">
        <div className="sub">빠른 작업 타일</div>
      </header>

      {/* 타일 그리드 */}
      <section className="grid">
        {tiles.map(t => (
          <button key={t.key} className="tile" onClick={() => router.push(t.path)} aria-label={t.label}>
            <div className="icon">{ICON[t.key]}</div>
            <div className="tl">{t.label}</div>
            <div className="ds">{t.desc}</div>
          </button>
        ))}
      </section>

      <style jsx>{`
        .wrap{min-height:100svh;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111}
        /* 상단바 */
        .topbar{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 0 rgba(0,0,0,.02)}
        .top-inner{max-width:1080px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:12px 10px}
        .brand{font-size:18px;font-weight:900;letter-spacing:.3px;background:transparent;border:none;color:#111;cursor:pointer;padding:6px 8px;border-radius:10px}
        .brand:hover{background:#f3f4f6}
        .account{display:flex;align-items:center;gap:10px;color:#333}
        .account .id{font-weight:700}
        .account .role{font-size:12.5px;color:#555}
        .account .logout{border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:6px 10px;font-weight:800;cursor:pointer}
        .account .logout:hover{filter:brightness(1.06)}
        /* 본문 헤더 */
        .head{max-width:1080px;margin:14px auto 12px auto;padding:0 12px}
        .sub{color:#555}
        /* 타일 */
        .grid{max-width:1080px;margin:0 auto;padding:0 12px 24px 12px;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
        .tile{
          display:grid;grid-template-rows:auto auto 1fr;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;
          padding:16px 16px 14px;text-align:left;cursor:pointer;box-shadow:0 8px 16px rgba(0,0,0,.04);
          transition:transform .06s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .tile:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(0,0,0,.06);border-color:#d1d5db}
        .icon{font-size:28px;line-height:1}
        .tl{font-weight:800;font-size:15.5px}
        .ds{font-size:13px;color:#555}
      `}</style>
    </main>
  );
}