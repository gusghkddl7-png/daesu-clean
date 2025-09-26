"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  { key: "schedule",  label: "일정/할일",     desc: "투어·계약·결제",            path: "/schedule" },
  { key: "clients",   label: "고객/문의",     desc: "의뢰·파이프라인",            path: "/clients" },
  { key: "listings",  label: "매물관리",      desc: "신규·공동중개",              path: "/listings" },
  { key: "urgent",    label: "급한 임차문의",  desc: "D-30 핫리드",                path: "/urgent" },
  { key: "contracts", label: "계약/문서",     desc: "계약서·부속합의",            path: "/contracts" },
  { key: "billing",   label: "결제/청구",     desc: "입금·정리 *관리자전용",      path: "/billing" },
  { key: "payroll",   label: "급여/정산",     desc: "직원급여 *관리자전용",       path: "/payroll" },
  { key: "settings",  label: "설정",          desc: "관리자 전용",                path: "/settings" },
];

/* ====== 공통 유틸 ====== */
const ymd = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayStr = ()=> ymd(new Date());
const onlyArr = (a)=> Array.isArray(a) ? a : [];
const safeLoad = (k, fallback)=> { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? fallback; } catch { return fallback; } };

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

/* ====== 공지 모달 (오늘일정 모달과 동일 크기) ====== */
function NoticeCenter({ open, onClose }){
  const [list, setList] = useState([]);
  useEffect(()=>{ if(!open) return; (async()=>{ const res=await apiGet("/api/notices"); setList(onlyArr(res)); })(); },[open]);
  if(!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="panel" onClick={(e)=>e.stopPropagation()}>
        <div className="head">
          <div className="title">공지</div>
          <button className="mini" onClick={onClose}>닫기</button>
        </div>
        <div className="body">
          {list.length ? list
            .slice().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))
            .map(n=>(
              <div key={n.id} className="item">
                <div className="row1">
                  <div className="t">{n.pinned ? "📌 " : ""}{n.title}</div>
                  <div className="time">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <div className="content">{n.body}</div>
              </div>
            ))
            : <div className="empty">등록된 공지가 없습니다.</div>}
        </div>
      </div>

      <style jsx>{`
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:150}
        .panel{
          width:min(80vw,1080px); height:min(80vh,900px);
          background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.28);
          display:flex;flex-direction:column;
        }
        .head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fafafa}
        .title{font-weight:900}
        .body{padding:10px;overflow:auto;display:grid;gap:10px}
        .item{border:1px solid #f1f5f9;border-radius:10px;padding:8px 10px;background:#fff}
        .row1{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
        .t{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
        .time{font-size:12px;color:#6b7280}
        .content{font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.45;display:-webkit-box;-webkit-line-clamp:10;-webkit-box-orient:vertical;overflow:hidden}
        .empty{color:#888;text-align:center;padding:20px}
        .mini{border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:6px 8px;cursor:pointer}
      `}</style>
    </div>
  );
}

/* ====== 오늘 일정 모달 ====== */
function TodayScheduleModal({ open, onClose }){
  const [events, setEvents] = useState([]);
  useEffect(()=>{ if(!open) return; setEvents(onlyArr(safeLoad("daesu:events", []))); },[open]);
  if(!open) return null;

  const today = todayStr();
  const list = events
    .filter(e=>e.date===today && !e.canceled)
    .sort((a,b)=> String(a.time||"").localeCompare(String(b.time||"")));

  return (
    <div className="modal" onClick={onClose}>
      <div className="panel" onClick={(e)=>e.stopPropagation()}>
        <div className="head">
          <div className="title">오늘 일정 ({today})</div>
          <button className="mini" onClick={onClose}>닫기</button>
        </div>
        <div className="body">
          {list.length ? list.map(ev=>(
            <div key={ev.id} className="row" title={ev.memo||""}>
              <div className="col time">{ev.time||"-"}</div>
              <div className="col main">
                <b>{ev.type||"-"}</b>
                {ev.staff && <span className="sep"> · </span>}
                <span>{ev.staff||""}</span>
                {(ev.phone4||ev.nickname) && <span className="sep"> · </span>}
                <span>{[ev.phone4, ev.nickname].filter(Boolean).join(" / ")}</span>
              </div>
            </div>
          )) : <div className="empty">오늘 등록된 일정이 없습니다.</div>}
        </div>
      </div>
      <style jsx>{`
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:150}
        .panel{
          width:min(80vw,1080px); height:min(80vh,900px);
          background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;
        }
        .head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fafafa}
        .title{font-weight:900}
        .body{padding:10px;overflow:auto;display:flex;flex-direction:column;gap:8px}
        .row{display:grid;grid-template-columns:110px 1fr;gap:10px;border:1px solid #f1f5f9;border-radius:10px;padding:10px}
        .time{font-weight:800}
        .sep{color:#9aa0a6}
        .empty{color:#888;text-align:center;padding:20px}
        .mini{border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:6px 8px;cursor:pointer}
      `}</style>
    </div>
  );
}

/* ====== 계약 일정 카드(왼쪽) ====== */
function ContractScheduleCard({ onGo }){
  const [events, setEvents] = useState([]);
  useEffect(()=>{ setEvents(onlyArr(safeLoad("daesu:events", []))); },[]);
  const KEYWORDS = ["본계약","잔금","중도금","잔금및입주"];

  const list = events
    .filter(e=>{
      const t=(e.type||"")+""; return KEYWORDS.some(k=>t.includes(k));
    })
    .map(e=>{
      const d = new Date(`${e.date||"1970-01-01"}T${(e.time||"00:00")}:00`);
      return { ...e, _ts: +d };
    })
    .sort((a,b)=> a._ts - b._ts)
    .slice(0,6);

  return (
    <section className="cardbox">
      <div className="cardtitle">계약 일정</div>
      <div className="list">
        {list.length ? list.map(ev=>(
          <div key={ev.id} className="row" title={ev.memo||""}>
            <div className="title">
              <b>{ev.type}</b> · {ev.staff||"-"}
            </div>
            <div className="meta">
              {ev.date||"-"} {ev.time||""} { (ev.phone4||ev.nickname) ? `· ${[ev.phone4, ev.nickname].filter(Boolean).join("/")}` : "" }
            </div>
          </div>
        )) : <div className="empty">표시할 계약 일정이 없습니다.</div>}
      </div>
      <div className="foot">
        <button className="mini" onClick={()=>onGo("/schedule")}>일정/할일 이동</button>
      </div>
      <style jsx>{`
        .cardbox{border:1px solid #e5e7eb;border-radius:12px;background:#fff;overflow:hidden;max-width:520px}
        .cardtitle{font-weight:800;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#fafafa}
        .list{display:flex;flex-direction:column}
        .row{padding:10px 12px;border-bottom:1px solid #f7f7f7}
        .row:last-child{border-bottom:none}
        .title{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .meta{font-size:12px;color:#6b7280}
        .empty{padding:16px;text-align:center;color:#888}
        .foot{display:flex;justify-content:flex-end;padding:8px 12px;border-top:1px solid #f1f5f9}
        .mini{border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:6px 8px;cursor:pointer}
      `}</style>
    </section>
  );
}

/* ====== 최근 활동 (오른쪽) ====== */
function RecentActivityCompact(){
  const [events, setEvents]   = useState([]);
  const [clients, setClients] = useState([]);
  const [urgent, setUrgent]   = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(()=>{
    setEvents(onlyArr(safeLoad("daesu:events", [])));
    setClients(onlyArr(safeLoad("daesu:clients", [])));
    setUrgent(onlyArr(safeLoad("daesu:urgent", [])));
    (async ()=>{ const list=await apiGet("/api/notices"); setNotices(onlyArr(list)); })();
  },[]);

  function tsFromId(id){ const m = String(id||"").match(/\d{10,}/); return m ? Number(m[0]) : 0; }

  const items = [
    ...events.map(e=>({ t: tsFromId(e.id), type:"🗓️", label:`일정 ${e.type||""}${e.staff?` · ${e.staff}`:""}`, sub:`${e.date||""} ${e.time||""}` })),
    ...clients.map(c=>({ t: tsFromId(c.id), type:"👥", label:`고객 등록${c.staff?` · ${c.staff}`:""}`, sub:`${c.inquiryDate||""} · ${c.sourceAlias||"-"}` })),
    ...urgent.map(u=>({ t: tsFromId(u.id), type:"🚨", label:`급한 문의 ${u.title||""}`, sub:`마감 ${u.due||"-"}` })),
    ...notices.map(n=>({ t: new Date(n.createdAt||0).getTime()||0, type:"📣", label:`공지 ${n.title||""}`, sub: n.pinned ? "📌 고정" : "" })),
  ].filter(x=>x.t>0).sort((a,b)=>b.t-a.t).slice(0,6);

  return (
    <section className="cardbox">
      <div className="cardtitle">최근 활동</div>
      <ul className="timeline">
        {items.length ? items.map((x,i)=>(
          <li key={i}><span className="ico">{x.type}</span><div className="main">{x.label}</div><div className="sub">{x.sub}</div></li>
        )) : <div className="empty">표시할 활동이 없습니다.</div>}
      </ul>
      <style jsx>{`
        .cardbox{border:1px solid #e5e7eb;border-radius:12px;background:#fff;overflow:hidden;max-width:520px}
        .cardtitle{font-weight:800;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#fafafa}
        .timeline{list-style:none;margin:0;padding:8px;display:grid;gap:6px}
        .timeline li{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:start;border:1px solid #f1f5f9;border-radius:10px;padding:8px}
        .ico{font-size:16px;line-height:1;margin-top:2px}
        .main{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sub{font-size:12px;color:#6b7280}
        .empty{padding:16px;text-align:center;color:#888}
      `}</style>
    </section>
  );
}

/* ====== 요약 바 (숫자/라벨 중앙정렬) ====== */
function SummaryBar({ onOpenToday, onOpenNotice }) {
  const [events, setEvents]   = useState([]);
  const [clients, setClients] = useState([]);
  const [listings, setListings] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(()=>{
    try{
      setEvents(onlyArr(safeLoad("daesu:events", [])));
      setClients(onlyArr(safeLoad("daesu:clients", [])));
      setListings(onlyArr(safeLoad("daesu:listings", [])));
    }catch{}
    (async ()=>{ const list = await apiGet("/api/notices"); setNotices(onlyArr(list)); })();
  },[]);

  const today = todayStr();
  const todayEvents  = events.filter(e=>e.date===today && !e.canceled);

  const totalListings = listings.length;
  const doneListing = (x)=> !!(x?.closed || x?.dealDone || x?.sold || x?.completed || x?.status==="closed" || x?.status==="거래완료");
  const activeListings = listings.filter(l=>!doneListing(l)).length;

  const totalClients = clients.length;
  const activeClients = clients.filter(c=>!c?.closed).length;

  const pinnedCount   = notices.filter(n=>n.pinned).length;

  return (
    <section className="summary">
      <button className="card clickable" onClick={onOpenToday} aria-label="오늘 일정 열기">
        <div className="k">오늘 일정</div><div className="v">{todayEvents.length}</div>
      </button>
      <div className="card">
        <div className="k">총 매물관리</div>
        <div className="v">{activeListings} / {totalListings}</div>
      </div>
      <div className="card">
        <div className="k">총 임차문의</div>
        <div className="v">{activeClients} / {totalClients}</div>
      </div>
      <button className="card clickable" onClick={onOpenNotice} aria-label="공지 열기">
        <div className="k">공지사항</div><div className="v">{pinnedCount} / {notices.length}</div>
      </button>
      <style jsx>{`
        .summary{
          max-width:1080px;margin:0 auto 14px auto;padding:0 12px;
          display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))
        }
        .card{
          background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;
          display:grid;gap:6px;box-shadow:0 8px 16px rgba(0,0,0,.04);
          text-align:center;
        }
        .k{font-size:12px;color:#6b7280}
        .v{font-size:22px;font-weight:900;letter-spacing:.2px}
        .clickable{cursor:pointer;transition:transform .06s ease,border-color .2s ease,box-shadow .2s ease}
        .clickable:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(0,0,0,.08);border-color:#d1d5db}
      `}</style>
    </section>
  );
}

/* ====== 대시보드 ====== */
export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null); // { id, role }
  const role = session?.role ?? "guest";

  // 모달 상태
  const [openNotice, setOpenNotice] = useState(false);
  const [openToday,  setOpenToday]  = useState(false);

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

  // 타일은 모두 표시 (관리자만 접근 제한: billing / payroll / settings)
  const tiles = useMemo(() => TILES, []);
  const RESTRICT = new Set(["billing","payroll","settings"]);
  const go = (t)=>{
    if (!t?.path) return;
    if (RESTRICT.has(t.key) && role !== "admin") {
      alert("관리자만 이용할 수 있습니다.");
      return;
    }
    router.push(t.path);
  };

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

      {/* 타일 그리드 */}
      <section className="grid">
        {tiles.map(t => (
          <button
            key={t.key}
            className={`tile ${RESTRICT.has(t.key) && role!=="admin" ? "lock":""}`}
            onClick={() => go(t)}
            aria-label={t.label}
            title={RESTRICT.has(t.key)&&role!=="admin" ? "관리자 전용" : ""}
          >
            <div className="icon">{ICON[t.key]}</div>
            <div className="tl">
              {t.label} {RESTRICT.has(t.key) && role!=="admin" ? <span className="lockBadge">🔒</span> : null}
            </div>
            <div className="ds">{t.desc}</div>
          </button>
        ))}
      </section>

      {/* (공지 미리보기는 제거했습니다) */}

      {/* 요약 바 */}
      <SummaryBar onOpenToday={()=>setOpenToday(true)} onOpenNotice={()=>setOpenNotice(true)} />

      {/* 좌: 계약 일정 / 우: 최근 활동 */}
      <section className="twos">
        <ContractScheduleCard onGo={(p)=>router.push(p)} />
        <RecentActivityCompact />
      </section>

      {/* 모달들 (크기 동일) */}
      <NoticeCenter open={openNotice} onClose={()=>setOpenNotice(false)} />
      <TodayScheduleModal open={openToday} onClose={()=>setOpenToday(false)} />

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
        /* 타일 */
        .grid{max-width:1080px;margin:14px auto 10px auto;padding:0 12px;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
        .tile{
          display:grid;grid-template-rows:auto auto 1fr;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;
          padding:16px 16px 14px;text-align:left;cursor:pointer;box-shadow:0 8px 16px rgba(0,0,0,.04);
          transition:transform .06s ease, box-shadow .2s ease, border-color .2s ease, opacity .2s ease;
        }
        .tile:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(0,0,0,.06);border-color:#d1d5db}
        .tile.lock{opacity:.9}
        .icon{font-size:28px;line-height:1}
        .tl{font-weight:800;font-size:15.5px;display:flex;align-items:center;gap:6px}
        .lockBadge{font-size:14px;opacity:.85}
        .ds{font-size:13px;color:#555}

        /* 좌/우 2열(폼카드 크기) */
        .twos{max-width:1080px;margin:0 auto 14px auto;padding:0 12px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media (max-width: 980px){ .twos{grid-template-columns:1fr;} }
      `}</style>
    </main>
  );
}
