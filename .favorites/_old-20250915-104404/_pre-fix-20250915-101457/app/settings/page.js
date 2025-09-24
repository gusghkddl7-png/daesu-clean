"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const loadUsers=()=>{ try{return JSON.parse(localStorage.getItem("daesu:users")||"[]");}catch{return[]} };
const saveUsers=a=>{ try{localStorage.setItem("daesu:users",JSON.stringify(a));}catch{} };

export default function Page(){
  const router=useRouter();
  const [role,setRole]=useState("guest");
  const [users,setUsers]=useState([]);
  const [q,setQ]=useState("");

  useEffect(()=>{
    try{ const s=JSON.parse(localStorage.getItem("daesu:session")||"null"); setRole(s?.role||"guest"); }catch{}
    setUsers(loadUsers());
  },[]);

  const filtered = useMemo(()=>{
    const kw=q.trim(); let arr=users;
    if(kw) arr=arr.filter(u=>(u.id||"").includes(kw)||(u.name||"").includes(kw)||(u.phone||"").includes(kw));
    return arr;
  },[users,q]);

  const setStatus=(u,st)=>{ const next=users.map(x=>x.id===u.id?{...x,status:st}:x); setUsers(next); saveUsers(next); };
  const toggleAdmin=(u)=>{ const next=users.map(x=>x.id===u.id?{...x,role:(x.role==="admin"?"user":"admin")}:x); setUsers(next); saveUsers(next); };

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
      <div className="bar">
        <div className="left"><button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 뒤로가기</button></div>
        <div className="center"><div className="title">설정 · 사용자 관리</div></div>
        <div className="right"></div>
      </div>

      <div className="filters"><input className="search" placeholder="아이디/이름/전화 검색" value={q} onChange={e=>setQ(e.target.value)} /></div>

      <div className="table">
        <div className="thead"><div>아이디</div><div>이름</div><div>전화</div><div>상태</div><div>권한</div><div>작업</div></div>
        <div className="tbody">
          {filtered.map(u=>(
            <div key={u.id} className="row">
              <div className="b">{u.id}</div><div>{u.name||"-"}</div><div>{u.phone||"-"}</div>
              <div>{u.status||"pending"}</div>
              <div>{u.role||"user"}</div>
              <div className="ops">
                <button className="mini" onClick={()=>setStatus(u,"approved")}>승인</button>
                <button className="mini" onClick={()=>setStatus(u,"rejected")}>거절</button>
                <button className="mini" onClick={()=>toggleAdmin(u)}>{u.role==="admin"?"관리자 해제":"관리자 지정"}</button>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="empty">데이터가 없습니다.</div>}
        </div>
      </div>

      <style jsx>{`
        .wrap{min-height:100svh;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111;padding:12px}
        .bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:10px}
        .left{justify-self:start}.center{justify-self:center}.right{justify-self:end}.title{font-weight:900}
        .back{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px}

        .filters{margin:8px 0}.search{border:1px solid #d1d5db;border-radius:10px;padding:8px 10px;width:100%;max-width:320px}
        .table{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
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