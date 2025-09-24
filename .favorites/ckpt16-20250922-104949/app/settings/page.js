"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ===== 유틸 (이전 코드 유지) ===== */
const loadUsers = () => { try { return JSON.parse(localStorage.getItem("daesu:users") || "[]"); } catch { return []; } };
const saveUsers = (a) => { try { localStorage.setItem("daesu:users", JSON.stringify(a)); } catch {} };

async function apiGet(url, opts = {}) {
  try { const r = await fetch(url, { ...opts }); if (!r.ok) throw 0; return await r.json(); } catch { return null; }
}
async function apiPost(url, body, opts = {}) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(opts.headers||{}) }, body: JSON.stringify(body) });
    if (!r.ok) throw 0; return await r.json();
  } catch { return null; }
}

/* ===== 상단 타일 정의 (대시보드 스타일) ===== */
const TABS = [
  { key:"people",  label:"직원 승인/담당자", desc:"가입 요청 관리" },
  { key:"notice",  label:"공지 관리",       desc:"공지 작성/핀"   },
  { key:"theme",   label:"테마/밀도",       desc:"UI 선호도"     },
  { key:"keyboard",label:"입력동작",        desc:"탭/엔터 옵션"  },
  { key:"notify",  label:"알림",            desc:"웹/메일/슬랙"  },
];

export default function Page(){
  const router = useRouter();

  /* 권한 */
  const [role,setRole] = useState("guest");
  useEffect(()=>{ try{ const s=JSON.parse(localStorage.getItem("daesu:session")||"null"); setRole(s?.role||"guest"); }catch{} },[]);

  /* 탭 상태 */
  const [tab,setTab] = useState("people");

  /* 공통 검색(로컬 users용) */
  const [q,setQ] = useState("");

  /* 로컬 users (폴백용) */
  const [users,setUsers] = useState([]);
  useEffect(()=>{ setUsers(loadUsers()); },[]);

  /* 직원 탭: 원격 + 폴백 */
  const [pending,setPending] = useState([]);
  const [approved,setApproved] = useState([]);
  const [loadingPeople,setLoadingPeople] = useState(false);
  const [apiAvailable,setApiAvailable] = useState(false);

  async function loadPeople(){
    setLoadingPeople(true);
    const p = await apiGet("/api/users/pending",{ headers:{ "x-role":"admin" }});
    const a = await apiGet("/api/users/approved");
    if (Array.isArray(p) || Array.isArray(a)) {
      setApiAvailable(true);
      setPending(Array.isArray(p)?p:[]);
      setApproved(Array.isArray(a)?a:[]);
      setLoadingPeople(false);
      return;
    }
    const local = loadUsers();
    const p2 = local.filter(u => (u.status||"pending")==="pending")
      .map(u=>({ id:u.id, email:u.id+"@example.com", displayName:u.name||"", status:u.status||"pending", createdAt:new Date().toISOString() }));
    const a2 = local.filter(u => (u.status||"") === "approved")
      .map(u=>({ id:u.id, displayName:u.name||u.id }));
    setApiAvailable(false); setPending(p2); setApproved(a2); setLoadingPeople(false);
  }
  useEffect(()=>{ loadPeople(); },[]);

  async function approveUser(id, displayName){
    if (apiAvailable) {
      const ok = await apiPost("/api/users/approve", { id, displayName }, { headers:{ "x-role":"admin"} });
      if (ok) { await loadPeople(); return; }
    }
    const next = users.map(x => x.id===id ? { ...x, status:"approved", name: displayName || x.name } : x);
    setUsers(next); saveUsers(next); await loadPeople();
  }
  function rejectUserLocal(id){
    const next = users.map(x => x.id===id ? { ...x, status:"rejected" } : x);
    setUsers(next); saveUsers(next); loadPeople();
  }
  function toggleAdminLocal(u){
    const next = users.map(x => x.id===u.id ? { ...x, role:(x.role==="admin"?"user":"admin") } : x);
    setUsers(next); saveUsers(next); loadPeople();
  }

  const filtered = useMemo(()=>{
    const kw=q.trim(); let arr=users;
    if(kw) arr=arr.filter(u=>(u.id||"").includes(kw)||(u.name||"").includes(kw)||(u.phone||"").includes(kw));
    return arr;
  },[users,q]);

  /* 권한 없는 화면(원래 UI 유지) */
  if(role!=="admin"){
    return (
      <main className="wrap">
        <div className="centerbox">
          <div className="card">
            <div className="title">권한 없음</div>
            <div className="desc">관리자만 접근할 수 있습니다.</div>
            <button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 대시보드로</button>
          </div>
        </div>
        <style jsx>{`
          .wrap{min-height:100svh;display:grid;place-items:center;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111;padding:12px}
          .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px 20px;box-shadow:0 10px 30px rgba(0,0,0,.06);text-align:center}
          .title{font-weight:900;font-size:20px;margin-bottom:6px}.desc{color:#555;margin-bottom:10px}
          .back{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px}
        `}</style>
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

      {/* 상단 타일(대시보드 스타일) */}
      <section className="tiles">
        {TABS.map(t=>(
          <button key={t.key} className={`tile ${tab===t.key?"on":""}`} onClick={()=>setTab(t.key)} aria-label={t.label}>
            <div className="tl">{t.label}</div>
            <div className="ds">{t.desc}</div>
          </button>
        ))}
      </section>

      {/* 탭별 내용 */}
      {tab==="people" && (
        <>
          <div className="info">
            <span className="chip">{apiAvailable ? "API 연결됨" : "로컬 폴백"}</span>
          </div>

          {/* 대기중 */}
          <section className="cardbox">
            <div className="cardtitle">대기 중인 가입 요청</div>
            {loadingPeople ? <div className="empty">불러오는 중…</div> :
              pending.length===0 ? <div className="empty">대기 중인 요청이 없습니다.</div> :
              <div className="tbody">
                {pending.map(u => <PendingRow key={u.id} u={u} onApprove={approveUser} onReject={rejectUserLocal} />)}
              </div>}
          </section>

          {/* 승인됨 */}
          <section className="cardbox">
            <div className="cardtitle">승인된 직원 (담당자)</div>
            {approved.length===0
              ? <div className="empty">아직 승인된 직원이 없습니다.</div>
              : <ul className="gridlist">
                  {approved.map(a=>(
                    <li key={a.id} className="chiprow">
                      <span className="name">{a.displayName || a.id}</span>
                      <span className="meta">{a.id}</span>
                    </li>
                  ))}
                </ul>}
          </section>

          {/* (보조) 로컬 users 테이블 – 기존 UX 유지 */}
          <section className="table">
            <div className="filters">
              <input className="search" placeholder="아이디/이름/전화 검색" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            <div className="thead"><div>아이디</div><div>이름</div><div>전화</div><div>상태</div><div>권한</div><div>작업</div></div>
            <div className="tbody">
              {filtered.map(u=>(
                <div key={u.id} className="row">
                  <div className="b">{u.id}</div><div>{u.name||"-"}</div><div>{u.phone||"-"}</div>
                  <div>{u.status||"pending"}</div>
                  <div>{u.role||"user"}</div>
                  <div className="ops">
                    <button className="mini" onClick={()=>approveUser(u.id, u.name || u.id)}>승인</button>
                    <button className="mini" onClick={()=>{ const next=users.map(x=>x.id===u.id?{...x,status:"rejected"}:x); setUsers(next); saveUsers(next); loadPeople(); }}>거절</button>
                    <button className="mini" onClick={()=>toggleAdminLocal(u)}>{u.role==="admin"?"관리자 해제":"관리자 지정"}</button>
                  </div>
                </div>
              ))}
              {!filtered.length && <div className="empty">데이터가 없습니다.</div>}
            </div>
          </section>
        </>
      )}

      {tab==="notice" && (
        <section className="cardbox">
          <div className="cardtitle">공지 관리</div>
          <div className="empty">다음 단계에서 /api/notices 연동해줄게.</div>
        </section>
      )}

      {tab==="theme" && <Stub text="테마/밀도 설정은 다음 단계에서 전역 상태에 연결할게요." />}
      {tab==="keyboard" && <Stub text="키보드/입력 동작(탭/엔터) 옵션은 전역 모듈과 연결 예정." />}
      {tab==="notify" && <Stub text="알림(웹/이메일/슬랙) 라우팅은 후속 단계에서." />}

      <style jsx>{`
        .wrap{min-height:100svh;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111;padding:12px}
        .topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:14px}
        .left{justify-self:start}.center{justify-self:center}.right{justify-self:end}
        .title{font-weight:900}
        .back{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px}

        /* 대시보드 느낌의 상단 타일 */
        .tiles{
          max-width:1080px;margin:0 auto 14px auto;padding:0 12px;
          display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))
        }
        .tile{
          display:grid;grid-template-rows:auto auto 1fr;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;
          padding:16px 16px 14px;text-align:left;cursor:pointer;box-shadow:0 8px 16px rgba(0,0,0,.04);
          transition:transform .06s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .tile:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(0,0,0,.06);border-color:#d1d5db}
        .tile.on{border-color:#111;box-shadow:0 10px 22px rgba(0,0,0,.08)}
        .tl{font-weight:800;font-size:15.5px}
        .ds{font-size:13px;color:#555}

        /* 섹션 카드/표 */
        .info{max-width:1080px;margin:0 auto 8px auto;padding:0 12px}
        .chip{display:inline-block;font-size:12px;border:1px solid #e5e7eb;border-radius:999px;padding:4px 8px;background:#fff}
        .cardbox{max-width:1080px;margin:0 auto 12px auto;border:1px solid #e5e7eb;border-radius:12px;background:#fff;overflow:hidden}
        .cardtitle{font-weight:800;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#fafafa}
        .gridlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;padding:10px}
        .chiprow{border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between}
        .chiprow .name{font-weight:700}.chiprow .meta{font-size:11px;color:#666}

        .table{max-width:1080px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;background:#fff;overflow:hidden}
        .filters{margin:8px 0;padding:0 14px}
        .search{border:1px solid #d1d5db;border-radius:10px;padding:8px 10px;width:100%;max-width:320px;background:#fff}
        .thead,.row{display:grid;grid-template-columns:1fr .8fr .8fr .6fr .6fr 1fr;gap:8px}
        .thead{padding:10px;background:#fafafa;border-bottom:1px solid #e5e7eb;font-weight:800}
        .tbody{display:flex;flex-direction:column}
        .row{padding:12px;border-bottom:1px solid #f1f5f9;text-align:left}
        .b{font-weight:800}.ops{display:flex;gap:6px;flex-wrap:wrap}
        .mini{border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:6px 8px;cursor:pointer}
        .mini:hover{background:#f3f4f6}
        .empty{padding:30px;text-align:center;color:#888}
      `}</style>
    </main>
  );
}

/* 대기중 사용자 행 */
function PendingRow({ u, onApprove, onReject }) {
  const [name, setName] = useState(u.displayName || "");
  return (
    <div className="row" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:8, padding:12, borderBottom:"1px solid #f1f5f9" }}>
      <div>
        <div className="b">{u.email || u.id}</div>
        <div style={{fontSize:11,color:"#666"}}>{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</div>
      </div>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="담당자 이름" className="search" />
      <div style={{alignSelf:"center"}}>{u.status || "pending"}</div>
      <div className="ops" style={{justifyContent:"flex-end"}}>
        <button className="mini" onClick={()=>onApprove(u.id, name)} disabled={!name.trim()}>승인</button>
        <button className="mini" onClick={()=>onReject(u.id)}>거절</button>
      </div>
    </div>
  );
}
function Stub({ text }) {
  return (
    <section className="cardbox">
      <div className="cardtitle">안내</div>
      <div className="empty">{text}</div>
    </section>
  );
}

