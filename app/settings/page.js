"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ========= 유틸 ========= */
const loadUsers = () => { try { return JSON.parse(localStorage.getItem("daesu:users") || "[]"); } catch { return []; } };
const saveUsers = (a)   => { try { localStorage.setItem("daesu:users", JSON.stringify(a)); } catch {} };

async function apiGet(url, opts = {}) {
  try { const r = await fetch(url, { cache: "no-store", ...opts }); if (!r.ok) throw 0; return await r.json(); }
  catch { return null; }
}
async function apiPost(url, body, opts = {}) {
  try {
    const r = await fetch(url, { method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", ...(opts.headers||{}) }, body: JSON.stringify(body) });
    if (!r.ok) throw 0; return await r.json();
  } catch { return null; }
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

const DEFAULT_SHORTCUTS = {
  submitWithEnter: true,
  closeWithEsc: true,
  autofocusSearch: true,
};
const DEFAULT_STARTUP = {
  home: "/dashboard",        // 첫 화면
  autoOpen: [],              // 자동으로 열 패널 키들
};

/* ========= 공지 팝업 로컬키 ========= */
const NOTICE_LAST_SEEN_ID = "daesu:notices:lastSeenId";
const NOTICE_LAST_SEEN_AT = "daesu:notices:lastSeenAt"; // ISO

export default function Page() {
  const router  = useRouter();
  const toast   = useToast();

  /* 권한 */
  const [role, setRole] = useState("guest");
  useEffect(() => { try {
      const s = JSON.parse(localStorage.getItem("daesu:session") || "null"); setRole(s?.role || "guest");
    } catch {} }, []);

  /* 탭 상태 */
  const [tab, setTab] = useState("people");

  /* === 테마/밀도 === */
  const [themeMode, setThemeMode] = useState("system");
  const [density, setDensity]     = useState("cozy");
  useEffect(() => {
    try {
      const m = localStorage.getItem(THEME_KEY)   || "system";
      const d = localStorage.getItem(DENSITY_KEY) || "cozy";
      setThemeMode(m); setDensity(d);
      applyThemeToDOM(m); applyDensityToDOM(d);
    } catch {}
  }, []);
  function changeTheme(m){ setThemeMode(m); try{ localStorage.setItem(THEME_KEY,m);}catch{}; applyThemeToDOM(m); toast.push(m==="system"?"시스템 테마 사용":`${m==="dark"?"다크":"라이트"} 테마 적용`); }
  function changeDensity(d){ setDensity(d); try{ localStorage.setItem(DENSITY_KEY,d);}catch{}; applyDensityToDOM(d); toast.push(d==="compact"?"컴팩트 모드":"코지 모드"); }

  /* === users 폴백 === */
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  useEffect(() => { setUsers(loadUsers()); }, []);

  /* 직원 탭 */
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);

  async function loadPeople() {
    setLoadingPeople(true);
    const p = await apiGet("/api/users/pending", { headers: { "x-role": "admin" } });
    const a = await apiGet("/api/users/approved");
    if (Array.isArray(p) || Array.isArray(a)) {
      setApiAvailable(true);
      setPending(Array.isArray(p) ? p : []);
      setApproved(Array.isArray(a) ? a : []);
      setLoadingPeople(false); return;
    }
    const local = loadUsers();
    const p2 = local.filter(u => (u.status||"pending")==="pending").map(u=>({
      id:u.id, email:u.id+"@example.com", displayName:u.name||"", status:u.status||"pending", createdAt:new Date().toISOString()
    }));
    const a2 = local.filter(u => (u.status||"")==="approved").map(u=>({ id:u.id, displayName:u.name||u.id }));
    setApiAvailable(false); setPending(p2); setApproved(a2); setLoadingPeople(false);
  }
  useEffect(() => { loadPeople(); }, []);

  async function approveUser(id, displayName){
    try{
      if (apiAvailable) {
        const ok = await apiPost("/api/users/approve", { id, displayName }, { headers:{ "x-role":"admin"} });
        if (!ok) throw 0;
      } else {
        const next = users.map(x => x.id===id ? { ...x, status:"approved", name: displayName || x.name } : x);
        setUsers(next); saveUsers(next);
      }
      toast.push("승인 완료"); await loadPeople();
    }catch{ toast.push("승인 실패", "error"); }
  }
  function rejectUserLocal(id){ const next = users.map(x => x.id===id ? { ...x, status:"rejected" } : x); setUsers(next); saveUsers(next); loadPeople(); toast.push("거절 처리됨"); }
  function toggleAdminLocal(u){ const next = users.map(x => x.id===u.id ? { ...x, role:(x.role==="admin"?"user":"admin") } : x); setUsers(next); saveUsers(next); loadPeople(); toast.push("권한 변경"); }

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

  async function loadNotices(){ const list = await apiGet("/api/notices"); setNotices(Array.isArray(list) ? list : []); }
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

  /* === 공지 팝업: 로그인 후 자동 노출 === */
  const [popupNotice, setPopupNotice] = useState(null);
  useEffect(()=>{
    if (!Array.isArray(notices) || notices.length===0) return;
    const pinned = notices.filter(n=>n.pinned);
    const pick = (pinned.length ? pinned : notices)
      .slice().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))[0];
    if (!pick) return;

    try {
      const seenId = localStorage.getItem(NOTICE_LAST_SEEN_ID) || "";
      const seenAt = localStorage.getItem(NOTICE_LAST_SEEN_AT);
      const seenDate = seenAt ? new Date(seenAt) : null;
      const now = new Date();
      const sameDay = seenDate && seenDate.toDateString() === now.toDateString();
      if (seenId === String(pick.id) && sameDay) return;
    } catch {}

    setPopupNotice(pick);
  }, [notices]);

  // 항상 "오늘 본 것으로" 기록 (snooze 구분 제거)
  function closeNoticePopup(){
    try{
      if (popupNotice){
        localStorage.setItem(NOTICE_LAST_SEEN_ID, String(popupNotice.id));
        localStorage.setItem(NOTICE_LAST_SEEN_AT, new Date().toISOString());
      }
    }catch{}
    setPopupNotice(null);
  }

  // ESC로 공지 팝업 닫기 (편의)
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setPopupNotice(null);
    if (popupNotice) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [popupNotice]);

  /* === 단축키 === */
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  useEffect(()=>{ try{ setShortcuts(JSON.parse(localStorage.getItem(SHORTCUTS_KEY)||"null")||DEFAULT_SHORTCUTS);}catch{} },[]);
  function saveShortcuts(next){ setShortcuts(next); try{ localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(next)); }catch{}; toast.push("단축키 설정 저장"); }

  /* === 시작화면 === */
  const [startup, setStartup] = useState(DEFAULT_STARTUP);
  useEffect(()=>{ try{ setStartup(JSON.parse(localStorage.getItem(STARTUP_KEY)||"null")||DEFAULT_STARTUP);}catch{} },[]);
  function saveStartup(next){ setStartup(next); try{ localStorage.setItem(STARTUP_KEY, JSON.stringify(next)); }catch{}; toast.push("시작화면 설정 저장"); }

  /* === 스토리지/백업 === */
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
  function clearKey(k){ try{ localStorage.removeItem(k); toast.push("삭제됨"); }catch{ toast.push("실패","error"); } }
  function clearAll(){ try{ localStorage.clear(); toast.push("로컬 스토리지 전체 삭제"); }catch{ toast.push("실패","error"); } }
  function exportSettings(){
    const payload = {
      themeMode, density, shortcuts, startup,
      users, notices,
      at: new Date().toISOString()
    };
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
      try {
        const data = JSON.parse(fr.result?.toString()||"{}");
        if (data.themeMode){ localStorage.setItem(THEME_KEY, data.themeMode); setThemeMode(data.themeMode); applyThemeToDOM(data.themeMode); }
        if (data.density){ localStorage.setItem(DENSITY_KEY, data.density); setDensity(data.density); applyDensityToDOM(data.density); }
        if (data.shortcuts){ localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(data.shortcuts)); setShortcuts(data.shortcuts); }
        if (data.startup){ localStorage.setItem(STARTUP_KEY, JSON.stringify(data.startup)); setStartup(data.startup); }
        if (Array.isArray(data.users)){ saveUsers(data.users); setUsers(data.users); }
        toast.push("백업 복구 완료");
      } catch { toast.push("복구 실패","error"); }
    };
    fr.readAsText(file);
  }

  /* ===== 권한 없는 화면 ===== */
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
        <div className="left"><button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 뒤로가기</button></div>
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
          <div className="info"><span className="chip">{apiAvailable ? "API 연결됨" : "로컬 폴백"}</span></div>

          <section className="cardbox">
            <div className="cardtitle">대기 중인 가입 요청</div>
            {loadingPeople ? <div className="empty">불러오는 중…</div> :
              pending.length===0 ? <div className="empty">대기 중인 요청이 없습니다.</div> :
              <div className="list">
                {pending.map(u => (
                  <div key={u.id} className="item">
                    <div className="item-main">
                      <div className="bold">{u.email || u.id}</div>
                      <div className="muted">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</div>
                    </div>
                    <div className="item-edit">
                      <input className="search" placeholder="담당자 이름" defaultValue={u.displayName||""}
                        onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); const val=e.currentTarget.value.trim(); if(val) approveUser(u.id, val); }}} />
                    </div>
                    <div className="item-ops">
                      <button className="mini" onClick={()=>{
                        const val = (document.activeElement && document.activeElement.value)||"";
                        approveUser(u.id, val || u.displayName || u.id);
                      }}>승인</button>
                      <button className="mini" onClick={()=>rejectUserLocal(u.id)}>거절</button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </section>

          <section className="cardbox">
            <div className="cardtitle">승인된 직원 (담당자)</div>
            {approved.length===0 ? <div className="empty">아직 승인된 직원이 없습니다.</div> :
              <ul className="gridlist">{approved.map(a=>(
                <li key={a.id} className="chiprow">
                  <span className="name">{a.displayName || a.id}</span>
                  <div className="ops">
                    <span className="meta">{a.id}</span>
                    <button className="mini" onClick={()=>toggleAdminLocal({id:a.id, role:"user"})}>관리자 지정/해제</button>
                  </div>
                </li>
              ))}</ul>}
          </section>

          {/* 로컬 사용자 목록 */}
          <section className="cardbox">
            <div className="cardtitle">로컬 사용자 목록 (간단)</div>
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
                    <button className="mini" onClick={()=>{ const next=users.map(x=>x.id===u.id?{...x,status:"rejected"}:x); setUsers(next); saveUsers(next); loadPeople(); }}>거절</button>
                    <button className="mini" onClick={()=>toggleAdminLocal(u)}>{u.role==="admin"?"관리자 해제":"관리자 지정"}</button>
                  </div>
                </div>
              ))}
              {!filteredUsers.length && <div className="empty">데이터가 없습니다.</div>}
            </div>
          </section>
        </>
      )}

      {/* NOTICE */}
      {tab==="notice" && (
        <section className="cardbox">
          <div className="cardtitle">공지 관리</div>
          <div style={{ padding: "var(--pad)", display: "grid", gap: "var(--gap)" }}>
            <input className="search" placeholder="제목/내용 검색" value={nSearch} onChange={e=>setNSearch(e.target.value)} />
            <input className="search" placeholder="제목" value={nTitle} onChange={e=>setNTitle(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); createNotice(); } }} />
            <textarea className="search" placeholder="내용" value={nBody} rows={4} onChange={e=>setNBody(e.target.value)} />
            <div style={{ display:"flex", gap:"var(--gap)", alignItems:"center" }}>
              <button className="mini" onClick={createNotice} disabled={!nTitle.trim() || !nBody.trim() || busyN}>{busyN?"저장 중…":"공지 등록"}</button>
              <span className="chip">총 {filteredNotices.length}건</span>
            </div>
          </div>

          {filteredNotices.length===0 ? (
            <div className="empty">등록된 공지가 없습니다.</div>
          ) : (
            <ul className="gridlist" style={{ paddingTop: 0 }}>
              {filteredNotices.map(n=>(
                <li key={n.id} className="chiprow" style={{ alignItems:"start" }}>
                  <div style={{maxWidth:"calc(100% - 220px)"}}>
                    {editId===n.id ? (
                      <>
                        <input className="search" value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="제목" />
                        <textarea className="search" value={editBody} rows={3} onChange={e=>setEditBody(e.target.value)} placeholder="내용" />
                      </>
                    ) : (
                      <>
                        <div className="name" style={{display:"flex", gap:8, alignItems:"center"}}>
                          {n.pinned && <span style={{fontSize:12}}>📌</span>}
                          {n.title}
                        </div>
                        <div className="meta">{new Date(n.createdAt).toLocaleString()}</div>
                        <div style={{fontSize:13, color:"var(--muted)", marginTop:4, whiteSpace:"pre-wrap"}}>{n.body}</div>
                      </>
                    )}
                  </div>
                  <div style={{ display:"grid", gap:6 }}>
                    {editId===n.id ? (
                      <>
                        <button className="mini" onClick={saveEdit} disabled={!editTitle.trim() || busyN}>저장</button>
                        <button className="mini" onClick={()=>{ setEditId(null); setEditTitle(""); setEditBody(""); }}>취소</button>
                      </>
                    ) : (
                      <>
                        <button className="mini" onClick={()=>togglePin(n)}>{n.pinned?"핀 해제":"핀 고정"}</button>
                        <button className="mini" onClick={()=>startEdit(n)}>수정</button>
                        <button className="mini" onClick={()=>deleteNotice(n.id)}>삭제</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* THEME */}
      {tab==="theme" && (
        <section className="cardbox">
          <div className="cardtitle">테마/밀도</div>
          <div style={{ padding: "var(--pad)", display:"grid", gap:"var(--gap)" }}>
            <div className="subgrid">
              <div className="subhead">테마</div>
              <div className="btns">
                <button className={`mini ${themeMode==="light"?"on":""}`} onClick={()=>changeTheme("light")}>라이트</button>
                <button className={`mini ${themeMode==="dark"?"on":""}`}  onClick={()=>changeTheme("dark")}>다크</button>
                <button className={`mini ${themeMode==="system"?"on":""}`} onClick={()=>changeTheme("system")}>시스템</button>
              </div>
            </div>
            <div className="subgrid">
              <div className="subhead">밀도</div>
              <div className="btns">
                <button className={`mini ${density==="cozy"?"on":""}`}     onClick={()=>changeDensity("cozy")}>코지(기본)</button>
                <button className={`mini ${density==="compact"?"on":""}`}  onClick={()=>changeDensity("compact")}>컴팩트</button>
              </div>
            </div>
            <div className="preview">
              <div className="pv-head">미리보기</div>
              <div className="pv-body">
                <div className="pv-chip">태그</div>
                <input className="search" placeholder="입력 미리보기" />
                <div className="pv-row">
                  <button className="mini">기본 버튼</button>
                  <button className="mini on">선택됨</button>
                  <button className="mini" disabled>비활성</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KEYBOARD (Stub) */}
      {tab==="keyboard" && <Stub text="키보드/입력 동작(탭/엔터) 옵션은 전역 모듈과 연결 예정입니다." />}

      {/* NOTIFY (Stub) */}
      {tab==="notify" && <Stub text="알림(웹/이메일/슬랙) 연동은 후속 단계에서 구성합니다." />}

      {/* SHORTCUTS */}
      {tab==="shortcuts" && (
        <section className="cardbox">
          <div className="cardtitle">단축키</div>
          <div style={{ padding:"var(--pad)", display:"grid", gap:"var(--gap)" }}>
            <label style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="checkbox" checked={shortcuts.submitWithEnter} onChange={e=>saveShortcuts({ ...shortcuts, submitWithEnter:e.target.checked })} />
              Enter로 폼 제출
            </label>
            <label style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="checkbox" checked={shortcuts.closeWithEsc} onChange={e=>saveShortcuts({ ...shortcuts, closeWithEsc:e.target.checked })} />
              Esc로 닫기/취소
            </label>
            <label style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="checkbox" checked={shortcuts.autofocusSearch} onChange={e=>saveShortcuts({ ...shortcuts, autofocusSearch:e.target.checked })} />
              페이지 진입 시 검색창 자동 포커스
            </label>
            <div className="empty" style={{textAlign:"left"}}>
              * 실제 키 바인딩은 공용 레이아웃에 연결할 예정입니다.
            </div>
          </div>
        </section>
      )}

      {/* STARTUP */}
      {tab==="startup" && (
        <section className="cardbox">
          <div className="cardtitle">시작화면</div>
          <div style={{ padding:"var(--pad)", display:"grid", gap:"var(--gap)" }}>
            <div className="subgrid">
              <div className="subhead">첫 화면</div>
              <div className="btns">
                {["/dashboard","/listings","/schedule","/settings"].map(path=>(
                  <button key={path} className={`mini ${startup.home===path?"on":""}`} onClick={()=>saveStartup({ ...startup, home:path })}>
                    {path}
                  </button>
                ))}
              </div>
            </div>
            <div className="subgrid">
              <div className="subhead">자동 열기</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["notice","urgent","billing"].map(key=>(
                  <label key={key} style={{display:"inline-flex",gap:6,alignItems:"center",border:"1px solid var(--border)",borderRadius:8,padding:"6px 10px",background:"var(--chip-bg)"}}>
                    <input type="checkbox"
                      checked={startup.autoOpen.includes(key)}
                      onChange={e=>{
                        const set = new Set(startup.autoOpen);
                        e.target.checked ? set.add(key) : set.delete(key);
                        saveStartup({ ...startup, autoOpen:[...set] });
                      }}/>
                    {key}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STORAGE */}
      {tab==="storage" && (
        <section className="cardbox">
          <div className="cardtitle">스토리지 / 백업</div>
          <div style={{ padding:"var(--pad)", display:"grid", gap:"var(--gap)" }}>
            <div>현재 localStorage 사용량: <b>{lsSize()}</b></div>
            <div className="pv-row">
              <button className="mini" onClick={()=>clearKey("daesu:users")}>users만 삭제</button>
              <button className="mini" onClick={()=>clearKey("daesu:theme-mode")}>테마 삭제</button>
              <button className="mini" onClick={()=>clearKey("daesu:density")}>밀도 삭제</button>
              <button className="mini" onClick={()=>clearKey(SHORTCUTS_KEY)}>단축키 삭제</button>
              <button className="mini" onClick={()=>clearKey(STARTUP_KEY)}>시작화면 삭제</button>
              <button className="mini" onClick={clearAll}>전체 삭제</button>
            </div>
            <div className="pv-row">
              <button className="mini" onClick={exportSettings}>백업(다운로드)</button>
              <label className="mini" style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                복구(파일 불러오기)
                <input type="file" accept="application/json" style={{display:"none"}} onChange={e=>{ const f=e.target.files?.[0]; if(f) importSettings(f); }} />
              </label>
            </div>
          </div>
        </section>
      )}

      {/* === 공지 팝업 === */}
      {popupNotice && (
        <div className="modal" onClick={()=>closeNoticePopup()}>
          <div className="panel" onClick={(e)=>e.stopPropagation()}>
            <div className="panel-head">
              <div className="panel-title">공지</div>
              <button className="mini" onClick={()=>closeNoticePopup()}>닫기</button>
            </div>
            <div className="panel-body">
              <div className="notice-title">{popupNotice.pinned ? "📌 " : ""}{popupNotice.title}</div>
              <div className="notice-time">{new Date(popupNotice.createdAt).toLocaleString()}</div>
              <div className="notice-body">{popupNotice.body}</div>
            </div>
            <div className="panel-foot">
              <button className="mini" onClick={()=>closeNoticePopup()}>오늘 다시 보지 않기</button>
              <div style={{flex:1}}/>
              <button className="mini on" onClick={()=>closeNoticePopup()}>확인</button>
            </div>
          </div>
        </div>
      )}

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
  .left{justify-self:start}.center{justify-self:center}.right{justify-self:end}
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
  .gridlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--gap);padding:10px}
  .chiprow{border:1px solid var(--border);border-radius:10px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;background:var(--card)}
  .chiprow .name{font-weight:700}.chiprow .meta{font-size:11px;color:var(--muted)}
  .chiprow .ops{display:flex;gap:6;align-items:center}

  /* 간단 리스트형 */
  .list{display:flex;flex-direction:column}
  .item{display:grid;grid-template-columns:1.3fr 1fr auto;gap:var(--gap);padding:12px;border-bottom:1px solid var(--border);align-items:center}
  .item-main .bold{font-weight:800}
  .item-main .muted{font-size:12px;color:var(--muted)}
  .item-edit{display:flex;align-items:center}
  .item-ops{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}

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

  /* 공지 팝업 */
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
