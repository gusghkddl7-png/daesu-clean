"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ====== 공지 팝업 로컬 키 ====== */
const NOTICE_LAST_SEEN_ID = "daesu:notices:lastSeenId";
const NOTICE_LAST_SEEN_AT = "daesu:notices:lastSeenAt";

/* ====== 아이콘/타일 ====== */
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

/* ====== 가벼운 GET 유틸 ====== */
async function apiGet(url, opts = {}) {
  try {
    const r = await fetch(url, { cache: "no-store", ...opts });
    if (!r.ok) throw 0;
    return await r.json();
  } catch {
    return null;
  }
}

/* ====== 공지 팝업 컴포넌트 ====== */
function NoticePopup() {
  const [list, setList] = useState([]);
  const [popup, setPopup] = useState(null);

  // 공지 불러오기
  useEffect(() => {
    (async () => {
      const res = await apiGet("/api/notices");
      setList(Array.isArray(res) ? res : []);
    })();
  }, []);

  // 노출 판단
  useEffect(() => {
    if (!list.length) return;

    // 1) pinned 중 최신 1건, 없으면 전체 최신 1건
    const pinned = list.filter(n => !!n.pinned);
    const pick = (pinned.length ? pinned : list)
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (!pick) return;

    // 2) 오늘 이미 같은 공지를 봤다면 표시 안 함
    try {
      const seenId = localStorage.getItem(NOTICE_LAST_SEEN_ID) || "";
      const seenAt = localStorage.getItem(NOTICE_LAST_SEEN_AT);
      const seenDate = seenAt ? new Date(seenAt) : null;
      const now = new Date();
      const sameDay = seenDate && seenDate.toDateString() === now.toDateString();

      if (String(pick.id) === seenId && sameDay) return;
    } catch {}

    setPopup(pick);
  }, [list]);

  function close(snoozeToday = false) {
    try {
      if (popup) {
        localStorage.setItem(NOTICE_LAST_SEEN_ID, String(popup.id));
        if (snoozeToday) localStorage.setItem(NOTICE_LAST_SEEN_AT, new Date().toISOString());
        else localStorage.setItem(NOTICE_LAST_SEEN_AT, new Date().toISOString()); // 기본도 오늘 본 것으로 처리
      }
    } catch {}
    setPopup(null);
  }

  if (!popup) return null;

  return (
    <div className="modal" onClick={() => close()}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div className="panel-title">공지</div>
          <button className="mini" onClick={() => close()}>닫기</button>
        </div>
        <div className="panel-body">
          <div className="notice-title">{popup.pinned ? "📌 " : ""}{popup.title}</div>
          <div className="notice-time">{popup.createdAt ? new Date(popup.createdAt).toLocaleString() : "-"}</div>
          <div className="notice-body">{popup.body}</div>
        </div>
        <div className="panel-foot">
          <button className="mini" onClick={() => close(true)}>오늘 다시 보지 않기</button>
          <div style={{ flex: 1 }} />
          <button className="mini on" onClick={() => close()}>확인</button>
        </div>
      </div>

      <style jsx>{`
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:12px;z-index:100}
        .panel{width:560px;max-width:96%;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.28)}
        .panel-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#fafafa}
        .panel-title{font-weight:800}
        .panel-body{padding:12px}
        .notice-title{font-weight:900;font-size:16px;margin-bottom:4px}
        .notice-time{font-size:12px;color:#6b7280;margin-bottom:8px}
        .notice-body{white-space:pre-wrap;line-height:1.5}
        .panel-foot{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:10px 12px;border-top:1px dashed #e5e7eb}
        .mini{border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:6px 8px;cursor:pointer}
        .mini.on{background:#111;color:#fff;border-color:#111}
      `}</style>
    </div>
  );
}

/* ====== 대시보드 ====== */
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

      {/* 공지 팝업 */}
      <NoticePopup />

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
