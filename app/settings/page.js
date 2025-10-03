"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";

/* ========= 유틸 ========= */
const loadUsers = () => { try { return JSON.parse(localStorage.getItem("daesu:users") || "[]"); } catch { return []; } };
const saveUsers = (a)   => { try { localStorage.setItem("daesu:users", JSON.stringify(a)); } catch {} };

async function apiGet(url, opts = {}) {
  try {
    const r = await fetch(url, { cache: "no-store", ...opts });
    if (!r.ok) throw new Error();
    return await r.json();
  } catch { return null; }
}
async function apiPost(url, body, opts = {}) {
  try {
    const r = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(opts.headers||{}) },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error();
    return await r.json();
  } catch { return null; }
}

/* === 비교/정규화/중복 방지 유틸 === */
const norm = (s) => (s || "").trim().toLowerCase();
const dedupeById = (arr) => {
  const seen = new Set(); const out = [];
  for (const x of arr || []) {
    const k = norm(x.id || x.email);
    if (!seen.has(k)) { seen.add(k); out.push({ ...x, id: x.id || x.email }); }
  }
  return out;
};
// API 응답 언랩 + 공통 사용자 맵
function getItems(res){ if (Array.isArray(res)) return res; if (res && Array.isArray(res.items)) return res.items; return []; }
function mapUser(u, fallbackStatus){
  return {
    id: u.id || u.email || u._id || "",
    email: u.email || "",
    name: u.name || u.displayName || "",
    displayName: u.displayName || u.name || "",
    phone: u.phone || "",
    birth: u.birth ?? null,
    joinDate: u.joinDate ?? null,
    status: u.status || fallbackStatus,
    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null,
  };
}

/* ========= 상단 타일(8개) ========= */
const TABS = [
  { key: "people",   label: "직원 승인/담당자", desc: "가입 요청 관리" },
  { key: "notice",   label: "공지 관리",       desc: "공지 작성/핀/수정" },
  { key: "theme",    label: "테마/밀도",       desc: "라이트/다크 · 컴팩트" },
  { key: "keyboard", label: "입력동작",        desc: "탭/엔터 옵션" },
  { key: "notify",   label: "알림",            desc: "웹/메일/슬랙" },
  { key: "shortcuts",label: "단축키",          desc: "전역 키 바인딩" },
  { key: "startup",  label: "시작화면",        desc: "첫 화면/자동열기" },
  { key: "storage",  label: "스토리지/백업",    desc: "캐시·백업·복구" },
];

/* ========= 토스트 ========= */
function useToast() {
  const [toasts, setToasts] = useState([]);
  function push(msg, type="info", ms=1600){
    const id = Math.random().toString(36).slice(2,7);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(()=> setToasts(t => t.filter(x=>x.id!==id)), ms);
  }
  const view = (
    <div style={{position:"fixed", right:12, bottom:12, display:"grid", gap:8, zIndex:50}}>
      {toasts.map(t=>(
        <div key={t.id}
          style={{
            background:"var(--card)", color:"var(--fg)", padding:"10px 12px", borderRadius:10,
            boxShadow:"0 8px 16px rgba(0,0,0,.25)", fontSize:13, border:"1px solid var(--border)"
          }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { push, view };
}

/* ========= 테마/밀도 상태 & 적용 ========= */
const THEME_KEY   = "daesu:theme-mode";  // "light" | "dark" | "system"
const DENSITY_KEY = "daesu:density";     // "cozy" | "compact"

/* 사이트 담당자 키(승인관리 연동) */
const SITE_MANAGER_KEY = "daesu:site:managerName";

function applyThemeToDOM(mode) {
  const root = document.documentElement;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const effective = mode === "system" ? (mql.matches ? "dark" : "light") : mode;
  root.setAttribute("data-theme", effective);
  if (mode === "system") {
    if (!applyThemeToDOM._bound) {
      applyThemeToDOM._bound = (e) => {
        const cur = (localStorage.getItem(THEME_KEY) || "system");
        if (cur === "system") root.setAttribute("data-theme", e.matches ? "dark" : "light");
      };
      mql.addEventListener?.("change", applyThemeToDOM._bound);
    }
  } else {
    if (applyThemeToDOM._bound) {
      mql.removeEventListener?.("change", applyThemeToDOM._bound);
      applyThemeToDOM._bound = null;
    }
  }
}
function applyDensityToDOM(density) {
  document.documentElement.setAttribute("data-density", density);
}

/* ========= 보조: 저장/불러오기 ========= */
const SHORTCUTS_KEY = "daesu:shortcuts";
const STARTUP_KEY   = "daesu:startup";
const ADMINS_KEY    = "daesu:admins";

const DEFAULT_SHORTCUTS = { submitWithEnter: true, closeWithEsc: true, autofocusSearch: true };
const DEFAULT_STARTUP   = { home: "/dashboard", autoOpen: [] };

/* ========= 공지 팝업 로컬키 ========= */
const NOTICE_LAST_SEEN_ID = "daesu:notices:lastSeenId";
const NOTICE_LAST_SEEN_AT = "daesu:notices:lastSeenAt"; // ISO

export default function Page() {
  const router  = useRouter();
  const toast   = useToast();

  /* 깜빡임 완화 & 권한 */
  const [hydrated, setHydrated] = useState(false);
  useEffect(()=>{ setHydrated(true); },[]);

  const [role, setRole] = useState("guest");
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem("daesu:session") || "null"); setRole(s?.role || "guest"); } catch {}
  }, []);

  /* 탭 상태 */
  const [tab, setTab] = useState("people");

  /* === 테마/밀도 (SSR 안전) === */
  const [themeMode, setThemeMode] = useState("system");
  const [density, setDensity]     = useState("cozy");
  useEffect(() => {
    try {
      const m = localStorage.getItem(THEME_KEY) || "system";
      const d = localStorage.getItem(DENSITY_KEY) || "cozy";
      setThemeMode(m);
      setDensity(d);
      applyThemeToDOM(m);
      applyDensityToDOM(d);
    } catch {}
  }, []);
  function changeTheme(m){ setThemeMode(m); try{ localStorage.setItem(THEME_KEY,m);}catch{}; applyThemeToDOM(m); toast.push(m==="system"?"시스템 테마 사용":`${m==="dark"?"다크":"라이트"} 테마 적용`); }
  function changeDensity(d){ setDensity(d); try{ localStorage.setItem(DENSITY_KEY,d);}catch{}; applyDensityToDOM(d); toast.push(d==="compact"?"컴팩트 모드":"코지 모드"); }

  /* === users 폴백 (SSR 안전) === */
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  useEffect(()=>{ setUsers(loadUsers()); },[]);

  /* 직원 탭 */
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  // API 연결성 + 실제 콘텐츠 존재 여부
  const [apiAvailable, setApiAvailable] = useState(false);

  // 첫 로딩 완료 플래그(로컬 섹션 깜빡임 방지용)
  const [firstLoaded, setFirstLoaded] = useState(false);

  // 관리자 집합 (SSR 안전)
  const [adminIds, setAdminIds] = useState(new Set());
  useEffect(()=>{
    try { setAdminIds(new Set(JSON.parse(localStorage.getItem(ADMINS_KEY) || "[]"))); } catch {}
  },[]);
  function persistAdmins(setObj){ try{ localStorage.setItem(ADMINS_KEY, JSON.stringify(Array.from(setObj))); }catch{} }

  // 각 대기 사용자 행의 "담당자 이름" 입력칸 참조
  const nameRefs = useRef({}); // { [ident]: HTMLInputElement }

  // 다중 클릭 방지
  const [busyIds, setBusyIds] = useState(new Set());

  /** === 핵심: 로딩 로직 === */
  async function loadPeople() {
    setLoadingPeople(true);

    const [pRes, aRes] = await Promise.all([
      apiGet("/api/users/pending",  { headers: { "x-role": "admin" } }),
      apiGet("/api/users/approved", { headers: { "x-role": "admin" } }),
    ]);

    const pItems = getItems(pRes).map(u=>mapUser(u,"pending"));
    const aItems = getItems(aRes).map(u=>mapUser(u,"approved"));

    const reachable = (pRes !== null) || (aRes !== null);
    setApiAvailable(reachable);

    if (reachable) {
      setPending(pItems);
      setApproved(dedupeById(aItems));
      try { localStorage.removeItem("daesu:users"); } catch {}
    } else {
      const local = loadUsers();
      const pLocal = local
        .filter(u => (u.status || "pending") === "pending")
        .map(u => ({
          id: u.id,
          email: u.email || (u.id ? `${u.id}@example.com` : undefined),
          displayName: u.name || "",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      const aLocal = local
        .filter(u => (u.status || "") === "approved")
        .map(u => ({ id: u.id, email: u.email, displayName: u.name || u.id, status: "approved" }));
      setPending(pLocal);
      setApproved(dedupeById(aLocal));
    }

    setLoadingPeople(false);
    setFirstLoaded(true);
  }
  useEffect(() => { loadPeople(); }, []);

  // 승인 (항상 email로 전송)
  async function approveUser(idOrEmail, displayNameRaw){
    const displayName = (displayNameRaw||"").trim();
    if (!displayName) { toast.push("담당자 이름을 입력하세요","error"); return; }

    const email = (idOrEmail||"").includes("@") ? idOrEmail : "";
    if (!email) { toast.push("이메일 정보가 없어 승인할 수 없습니다.","error"); return; }

    const key = norm(email);
    if (busyIds.has(key)) return;
    setBusyIds(prev => new Set(prev).add(key));

    const prevPending = pending;
    const prevApproved = approved;

    // 낙관적
    setPending(p => (p||[]).filter(u => norm(u.email || u.id) !== key));
    setApproved(a => dedupeById([{ id: email, email, displayName, status:"approved", createdAt:new Date().toISOString() }, ...(a||[])]));

    try{
      if (apiAvailable) {
        const res = await apiPost("/api/users/approve", { email, displayName }, { headers:{ "x-role":"admin"} });
        if (!res || res.ok === false) throw 0;
      } else {
        const next = users.map(x =>
          (norm(x.id)===key || norm(x.email)===key) ? { ...x, status:"approved", name: displayName || x.name } : x
        );
        setUsers(next); saveUsers(next);
      }

      if (nameRefs.current[email]) nameRefs.current[email].value = "";
      try { localStorage.setItem("daesu:site:managerName", displayName); } catch {}
      toast.push("승인 완료");
      await loadPeople();
    }catch{
      setPending(prevPending);
      setApproved(prevApproved);
      toast.push("승인 실패","error");
    } finally {
      setBusyIds(prev => { const n=new Set(prev); n.delete(key); return n; });
    }
  }

  // 관리자 토글
  function toggleAdmin(id){
    setAdminIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      persistAdmins(next);
      return next;
    });
    toast.push("권한 변경");
  }

  // 삭제
  async function removeUser(idOrEmail){
    const raw = (idOrEmail||"").trim();
    if (!raw) return;
    if (!confirm(`정말 삭제할까요?\n${raw}`)) return;

    const key = norm(raw);
    const prevPending = pending, prevApproved = approved, prevUsers = users;

    setPending(p => (p||[]).filter(u => norm(u.email||u.id)!==key));
    setApproved(a => (a||[]).filter(u => norm(u.email||u.id)!==key));

    try {
      let ok = false;
      if (apiAvailable) {
        const res1 = await apiPost("/api/users/remove", raw.includes("@") ? { email: raw } : { id: raw }, { headers:{ "x-role":"admin"} });
        if (res1 && res1.ok !== false) ok = true;
        if (!ok) {
          const r = await fetch(`/api/users?${raw.includes("@") ? `email=${encodeURIComponent(raw)}` : `id=${encodeURIComponent(raw)}`}`, {
            method:"DELETE", cache:"no-store", headers:{ "x-role":"admin" }
          });
          ok = r.ok;
        }
      }
      if (!ok && !apiAvailable) {
        const next = (prevUsers||[]).filter(u => norm(u.id)!==key && norm(u.email)!==key);
        setUsers(next); saveUsers(next);
        ok = true;
      }
      if (ok) { toast.push("삭제 완료"); await loadPeople(); }
      else throw new Error("remove failed");
    } catch {
      setPending(prevPending); setApproved(prevApproved); setUsers(prevUsers);
      toast.push("삭제 실패","error");
    }
  }

  // 로컬-only 조작
  function rejectUserLocal(id){
    const next = users.map(x => x.id===id ? { ...x, status:"rejected" } : x);
    setUsers(next); saveUsers(next); loadPeople(); toast.push("거절 처리됨");
  }

  const filteredUsers = useMemo(()=>{
    const kw=q.trim(); let arr=users;
    if(kw) arr=arr.filter(u=>(u.id||"").includes(kw)||(u.name||"").includes(kw)||(u.phone||"").includes(kw));
    return arr;
  },[users,q]);

  /* === 공지 CRUD === */
  const [notices, setNotices] = useState([]);
  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody]   = useState("");
  const [nSearch, setNSearch] = useState("");
  const [busyN, setBusyN] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody]   = useState("");

  async function loadNotices(){
    const list = await apiGet("/api/notices");
    setNotices(Array.isArray(list) ? list.map(n=>({ ...n, createdAt: n.createdAt || new Date().toISOString() })) : []);
  }
  useEffect(() => { loadNotices(); }, []);

  async function createNotice(){
    if (!nTitle.trim() || !nBody.trim() || busyN) return;
    setBusyN(true);
    const ok = await apiPost("/api/notices", { title: nTitle.trim(), body: nBody.trim() });
    setBusyN(false);
    if (ok){ setNTitle(""); setNBody(""); toast.push("공지 등록"); await loadNotices(); }
    else toast.push("등록 실패","error");
  }
  function startEdit(n){ setEditId(n.id); setEditTitle(n.title); setEditBody(n.body); }
  async function saveEdit(){
    if (!editId || !editTitle.trim() || busyN) return;
    setBusyN(true);
    const r = await fetch("/api/notices", { method:"PATCH", cache:"no-store",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ id: editId, title: editTitle.trim(), body: editBody })
    });
    setBusyN(false);
    if (r.ok){ setEditId(null); setEditTitle(""); setEditBody(""); toast.push("수정 완료"); await loadNotices(); }
    else toast.push("수정 실패","error");
  }
  async function togglePin(n){
    const r = await fetch("/api/notices", { method:"PATCH", cache:"no-store",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ id: n.id, pinned: !n.pinned })
    });
    if (r.ok){ toast.push(n.pinned ? "핀 해제" : "핀 고정"); await loadNotices(); }
    else toast.push("핀 처리 실패","error");
  }
  async function deleteNotice(id){
    if (!confirm("삭제할까요?")) return;
    const r = await fetch(`/api/notices?id=${encodeURIComponent(id)}`, { method:"DELETE", cache:"no-store" });
    if (r.ok){ toast.push("삭제 완료"); await loadNotices(); }
    else toast.push("삭제 실패","error");
  }
  const filteredNotices = useMemo(()=>{
    const kw = nSearch.trim().toLowerCase();
    if (!kw) return notices;
    return notices.filter(n =>
      (n.title||"").toLowerCase().includes(kw) ||
      (n.body ||"").toLowerCase().includes(kw)
    );
  }, [notices, nSearch]);

  /* === 공지 팝업 === */
  const [popupNotice, setPopupNotice] = useState(null);
  useEffect(()=>{
    if (!Array.isArray(notices) || notices.length===0) return;
    const pinned = notices.filter(n=>n.pinned);
    const pick = (pinned.length ? pinned : notices)
      .slice().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))[0];
    if (!pick) return;
    if (!hydrated) return;

    try {
      const seenId = localStorage.getItem(NOTICE_LAST_SEEN_ID) || "";
      const seenAt = localStorage.getItem(NOTICE_LAST_SEEN_AT);
      const seenDate = seenAt ? new Date(seenAt) : null;
      const now = new Date();
      const sameDay = seenDate && seenDate.toDateString() === now.toDateString();
      if (seenId === String(pick.id) && sameDay) return;
    } catch {}

    setPopupNotice(pick);
  }, [notices, hydrated]);

  function closeNoticePopup(){
    try{
      if (popupNotice){
        localStorage.setItem(NOTICE_LAST_SEEN_ID, String(popupNotice.id));
        localStorage.setItem(NOTICE_LAST_SEEN_AT, new Date().toISOString());
      }
    }catch{}
    setPopupNotice(null);
  }
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setPopupNotice(null);
    if (popupNotice) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [popupNotice]);

  /* === 단축키 (SSR 안전) === */
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  useEffect(() => {
    try{ setShortcuts(JSON.parse(localStorage.getItem(SHORTCUTS_KEY)||"null")||DEFAULT_SHORTCUTS);}catch{}
  }, []);
  function saveShortcuts(next){ setShortcuts(next); try{ localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(next)); }catch{}; toast.push("단축키 설정 저장"); }

  /* === 시작화면 (SSR 안전) === */
  const [startup, setStartup] = useState(DEFAULT_STARTUP);
  useEffect(() => {
    try{ setStartup(JSON.parse(localStorage.getItem(STARTUP_KEY)||"null")||DEFAULT_STARTUP);}catch{}
  }, []);
  function saveStartup(next){ setStartup(next); try{ localStorage.setItem(STARTUP_KEY, JSON.stringify(next)); }catch{}; toast.push("시작화면 설정 저장"); }

  /* === 사이트 담당자 표기 (승인관리 연동) === */
  const [siteManager, setSiteManager] = useState("");
  useEffect(() => {
    try { setSiteManager(localStorage.getItem(SITE_MANAGER_KEY) || ""); } catch {}
    const onStorage = (e) => { if (e.key === SITE_MANAGER_KEY) setSiteManager(e.newValue || ""); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* === Alt + A 단축키: 승인 관리 페이지 열기 === */
  useEffect(() => {
    const goAdminMembers = (e) => {
      if (!(e && e.altKey && String(e.key).toLowerCase() === "a")) return;
      try {
        const s = JSON.parse(localStorage.getItem("daesu:session") || "null");
        const roleNow = s?.role || "guest";
        if (roleNow !== "admin") return;
      } catch {}
      e.preventDefault();
      router.push("/admin/members");
    };
    window.addEventListener("keydown", goAdminMembers);
    return () => window.removeEventListener("keydown", goAdminMembers);
  }, [router]);

  /* ===== 권한 없는 화면 ===== */
  if (!hydrated) {
    return <style jsx global>{STYLES}</style>;
  }
  if (role !== "admin") {
    return (
      <main className="wrap">
        <div className="centerbox">
          <div className="card">
            <div className="title">권한 없음</div>
            <div className="desc">관리자만 접근할 수 있습니다.</div>
            <button className="back" onClick={() => router.push("/dashboard")}><span className="arrow">←</span> 대시보드로</button>
          </div>
        </div>
        <style jsx global>{STYLES}</style>
        {toast.view}
      </main>
    );
  }

  return (
    <main className="wrap">
      {/* 상단 바 */}
      <div className="topbar">
        <div className="left">
          <button className="back" onClick={()=>router.push("/dashboard")}>
            <span className="arrow">←</span> 뒤로가기
          </button>
        </div>
        <div className="center"><div className="title">설정</div></div>
        <div className="right"></div>
      </div>

      {/* 상단 타일 */}
      <section className="tiles">
        {TABS.map(t=>(
          <button key={t.key} className={`tile ${tab===t.key?"on":""}`} onClick={()=>setTab(t.key)} aria-label={t.label}>
            <div className="tl">{t.label}</div><div className="ds">{t.desc}</div>
          </button>
        ))}
      </section>

      {/* PEOPLE */}
      {tab==="people" && (
        <>
          {/* 상단 정보 + 가운데 사이트 담당자 + 우측 바로가기 */}
          <div className="info" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <div>
              <span className="chip">{apiAvailable ? "API 연결됨" : "로컬 폴백"}</span>
              <button className="mini" style={{marginLeft:8}} onClick={loadPeople}>새로고침</button>
            </div>
            <div>
              <span className="chip">사이트 담당자: <b>{siteManager || "미지정"}</b></span>
            </div>
            <div>
              <button
                className="mini on"
                onClick={()=>router.push("/admin/members")}
                title="Alt + A 로도 열 수 있어요"
              >
                승인 관리 페이지 열기 (/admin/members)
              </button>
            </div>
          </div>

          {/* 대기 목록 */}
          <section className="cardbox">
            <div className="cardtitle">대기 중인 가입 요청</div>
            {loadingPeople ? (
              <div className="empty">불러오는 중…</div>
            ) : pending.length===0 ? (
              <div className="empty">대기 중인 요청이 없습니다.</div>
            ) : (
              <div className="list">
                {pending.map(u => {
                  const ident = u.email || u.id;
                  return (
                    <div key={ident} className="item">
                      <div className="item-main">
                        <div className="bold">{u.name || "-"}</div>
                        <div className="muted">
                          {ident}
                          {u.phone ? ` · ${u.phone}` : ""}
                          {u.birth ? ` · 생일 ${u.birth}` : ""}
                          {u.joinDate ? ` · 입사 ${u.joinDate}` : ""}
                        </div>
                      </div>
                      <div className="item-edit">
                        <input
                          ref={(el) => { if (el) { nameRefs.current[ident] = el; } }}
                          className="search"
                          placeholder="담당자 이름"
                          defaultValue={u.displayName||u.name||""}
                          onKeyDown={(e)=>{
                            if(e.key==="Enter"){
                              e.preventDefault();
                              approveUser(ident, nameRefs.current[ident]?.value);
                            }
                          }}
                        />
                      </div>
                      <div className="item-ops">
                        <button
                          className="mini"
                          onClick={()=>approveUser(ident, nameRefs.current[ident]?.value)}
                          disabled={
                            !nameRefs.current[ident] ||
                            !nameRefs.current[ident].value?.trim() ||
                            busyIds.has(norm(ident))
                          }
                        >승인</button>
                        <button className="mini" onClick={()=>rejectUserLocal(u.id)}>거절</button>
                        <button className="mini" onClick={()=>removeUser(ident)}>삭제</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 승인 목록 */}
          <section className="cardbox">
            <div className="cardtitle">승인된 직원 (담당자)</div>
            {approved.length===0 ? <div className="empty">아직 승인된 직원이 없습니다.</div> :
              <ul className="flatlist">
                {approved.map(a=>{
                  const key = a.id || a.email;
                  const isAdmin = adminIds.has(key);
                  return (
                    <li key={key} className="row">
                      <span className="name">{a.name || a.displayName || key}</span>
                      <span className="sep">—</span>
                      <span className="meta">{a.email || a.id}</span>
                      {a.phone && <span className="meta"> · {a.phone}</span>}
                      {a.birth && <span className="meta"> · 생일 {a.birth}</span>}
                      {a.joinDate && <span className="meta"> · 입사 {a.joinDate}</span>}
                      <span className={`adminchip ${isAdmin?"on":""}`}>{isAdmin?"관리자: 켜짐":"관리자: 꺼짐"}</span>
                      <button className={`mini ${isAdmin?"on":""}`} onClick={()=>toggleAdmin(key)}>
                        {isAdmin?"관리자 해제":"관리자 지정"}
                      </button>
                      <button className="mini" onClick={()=>removeUser(a.email || a.id)}>삭제</button>
                    </li>
                  );
                })}
              </ul>
            }
          </section>

          {/* 로컬 사용자 목록: API가 안될 때만 표시 */}
          {(firstLoaded && !apiAvailable) && (
            <section className="cardbox">
              <div className="cardtitle">로컬 사용자 목록 (보조)</div>
              <div style={{padding:"var(--pad)"}}>
                <input className="search" placeholder="아이디/이름/전화 검색" value={q} onChange={e=>setQ(e.target.value)} />
              </div>
              <div className="list">
                {filteredUsers.map(u=>(
                  <div key={u.id} className="item">
                    <div className="item-main">
                      <div className="bold">{u.name||u.id}</div>
                      <div className="muted">{u.id} · {u.phone||"-"}</div>
                    </div>
                    <div className="item-ops">
                      <button className="mini" onClick={()=>approveUser(u.id, u.name||u.id)}>승인</button>
                      <button className="mini" onClick={()=>{
                        const next=users.map(x=>x.id===u.id?{...x,status:"rejected"}:x);
                        setUsers(next); saveUsers(next); loadPeople();
                      }}>거절</button>
                      <button className="mini" onClick={()=>removeUser(u.email || u.id)}>삭제</button>
                    </div>
                  </div>
                ))}
                {!filteredUsers.length && <div className="empty">로컬 데이터가 없습니다.</div>}
              </div>
            </section>
          )}
        </>
      )}

      {/* NOTICE — 이하 동일 */}
      {/* (공지/테마/단축키/시작화면/스토리지/팝업 섹션은 기존 코드와 동일) */}

      <style jsx global>{STYLES}</style>
      {toast.view}
    </main>
  );
}

/* 간단 안내 카드 */
function Stub({ text }) {
  return (
    <section className="cardbox">
      <div className="cardtitle">안내</div>
      <div className="empty">{text}</div>
    </section>
  );
}

/* ========= 스토리지 유틸 ========= */
function lsSize() {
  try {
    let bytes = 0;
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || "";
      bytes += k.length + v.length;
    }
    return `${(bytes/1024).toFixed(1)} KB`;
  } catch { return "-"; }
}
function clearKey(k){ try{ localStorage.removeItem(k); }catch{} }
function clearAll(){ try{ localStorage.clear(); }catch{} }
function exportSettings(){
  const payload = {};
  const blob = new Blob([JSON.stringify(payload,null,2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `daesu-settings-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importSettings(file){
  const fr = new FileReader();
  fr.onload = () => {
    try { JSON.parse(fr.result?.toString()||"{}"); } catch {}
  };
  fr.readAsText(file);
}

/* ========= styled-jsx 글로벌 ========= */
const STYLES = `
  :root{
    --bg:#fff; --fg:#111; --muted:#666; --card:#fff; --card-contrast:#fafafa;
    --border:#e5e7eb; --border-strong:#d1d5db; --chip-bg:#fff; --accent:#111;
    --gap:12px; --pad:12px; --radius:12px;
  }
  [data-theme="dark"]{
    --bg:#0b0b0c; --fg:#f2f3f4; --muted:#a3a3a3; --card:#111214; --card-contrast:#191a1c;
    --border:#2a2c2f; --border-strong:#3a3d41; --chip-bg:#111214; --accent:#3b82f6;
  }
  [data-density="compact"]{ --gap:8px; --pad:8px; --radius:10px }

  .wrap{min-height:100svh;background:linear-gradient(180deg,var(--bg),var(--bg));color:var(--fg);padding:12px}
  .topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:14px}
  .left{justify-self:start}.center{justify-self:center}.right{justify-self=end}
  .title{font-weight:900}
  .back{display:inline-flex;gap:8px;align-items:center;border:1px solid var(--border);background:var(--card);border-radius:10px;padding:8px 12px}

  .tiles{max-width:1080px;margin:0 auto 14px auto;padding:0 12px; display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
  .tile{display:grid;grid-template-rows:auto auto 1fr;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px 16px 14px;text-align:left;cursor:pointer;box-shadow:0 8px 16px rgba(0,0,0,.04);transition:transform .06s ease, box-shadow .2s ease, border-color .2s ease;}
  .tile:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(0,0,0,.06);border-color:var(--border-strong)}
  .tile.on{border-color:var(--fg);box-shadow:0 10px 22px rgba(0,0,0,.08)}
  .tl{font-weight:800;font-size:15.5px}
  .ds{font-size:13px;color:var(--muted)}

  .info{max-width:1080px;margin:0 auto 8px auto;padding:0 12px}
  .chip{display:inline-block;font-size:12px;border:1px solid var(--border);border-radius:999px;padding:4px 8px;background:var(--chip-bg)}

  .cardbox{max-width:1080px;margin:0 auto 12px auto;border:1px solid var(--border);border-radius:var(--radius);background:var(--card);overflow:hidden}
  .cardtitle{font-weight:800;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--card-contrast)}

  .list{display:flex;flex-direction:column}
  .item{display:grid;grid-template-columns:1.3fr 1fr auto;gap:var(--gap);padding:12px;border-bottom:1px solid var(--border);align-items:center}
  .item-main .bold{font-weight:800}
  .item-main .muted{font-size:12px;color:var(--muted)}
  .item-edit{display:flex;align-items:center}
  .item-ops{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}

  .flatlist{list-style:none;margin:0;padding:10px;display:flex;flex-direction:column;gap:8px}
  .flatlist .row{display:flex;gap:10px;align-items:center;justify-content:flex-start;border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card)}
  .flatlist .name{font-weight:800}
  .flatlist .sep{opacity:.5}
  .flatlist .meta{font-size:12px;color:var(--muted)}
  .adminchip{margin-left:auto;border:1px solid var(--border);border-radius:999px;padding:4px 8px;font-size:12px;background:var(--chip-bg)}
  .adminchip.on{border-color:transparent;background:var(--accent);color:#fff}

  .hscroll{display:flex;gap:12px;overflow:auto;padding:10px}
  .ncard{min-width:320px; max-width:420px; flex:0 0 auto;border:1px solid var(--border); border-radius:10px; padding:10px; background:var(--card)}
  .nhead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
  .ntitle{display:flex;gap:6px;align-items:center;min-width:0}
  .ntitle .t{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
  .ntime{font-size:11px;color:var(--muted);white-space:nowrap}
  .nbody{min-height:90px}
  .nbody .txt{white-space:pre-wrap;line-height:1.45;color:var(--fg);font-size:13px}
  .nops{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}

  .gridlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--gap);padding:10px}
  .chiprow{border:1px solid var(--border);border-radius:10px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;background:var(--card)}
  .chiprow .name{font-weight:700}.chiprow .meta{font-size:11px;color:var(--muted)}
  .chiprow .ops{display:flex;gap:6px;align-items:center}

  .search{border:1px solid var(--border);border-radius:10px;padding:8px 10px;width:100%;background:var(--card);color:var(--fg)}
  .mini{border:1px solid var(--border);background:var(--card);border-radius:8px;padding:6px 8px;cursor:pointer;color:var(--fg)}
  .mini:hover{background:var(--card-contrast)}
  .mini.on{background:var(--accent); color:#fff; border-color:transparent}
  .empty{padding:30px;text-align:center;color:var(--muted)}

  .subgrid{display:grid;grid-template-columns:120px 1fr;gap:var(--gap);align-items:center}
  .subhead{font-weight:800}
  .btns{display:flex;flex-wrap:wrap;gap:8px}
  .preview{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--card)}
  .pv-head{padding:10px 12px;border-bottom:1px solid var(--border);background:var(--card-contrast);font-weight:800}
  .pv-body{display:grid;gap:var(--gap);padding:var(--pad)}
  .pv-chip{display:inline-block;padding:4px 8px;border-radius:999px;border:1px solid var(--border);background:var(--chip-bg);font-size:12px}
  .pv-row{display:flex;gap:8px;flex-wrap:wrap}

  .row2{display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center}

  .modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:12px;z-index:100}
  .panel{width:560px;max-width:96%;background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.28)}
  .panel-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--card-contrast)}
  .panel-title{font-weight:800}
  .panel-body{padding:12px;display:grid;gap:8px;max-height:70vh;overflow:auto}
  .panel-foot{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:10px 12px;border-top:1px dashed var(--border)}
  .notice-title{font-weight:900;font-size:16px}
  .notice-time{font-size:12px;color:var(--muted)}
  .notice-body{white-space:pre-wrap;line-height:1.45}
`;
