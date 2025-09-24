"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STAFFS = ["김부장","김과장","강실장","소장"];
const load=()=>{ try{return JSON.parse(localStorage.getItem("daesu:urgent")||"[]");}catch{return[]} };
const save=a=>{ try{localStorage.setItem("daesu:urgent",JSON.stringify(a));}catch{} };
const dday = (dateStr)=>{ const t=new Date(dateStr); t.setHours(0,0,0,0); const now=new Date(); now.setHours(0,0,0,0); return Math.round((t-now)/86400000); };

export default function Page(){
  const router = useRouter();
  const [items,setItems] = useState([]);
  const [open,setOpen]   = useState(false);
  const [isEdit,setEdit] = useState(false);
  const empty = { id:"", title:"", staff:"", due:"", memo:"" };
  const [draft,setDraft] = useState(empty);

  useEffect(()=>{ setItems(load()); },[]);
  const sorted = useMemo(()=>[...items].sort((a,b)=>String(a.due||"").localeCompare(String(b.due||""))),[items]);

  const openNew = ()=>{ setDraft({...empty,id:"u"+Date.now()}); setEdit(false); setOpen(true); };
  const openEdit= (x)=>{ setDraft({...x}); setEdit(true); setOpen(true); };
  const close   = ()=>{ setOpen(false); setDraft(empty); };
  const onSave  = ()=>{ if(!draft.title||!draft.due) return alert("제목/마감일을 입력하세요."); const next=isEdit?items.map(i=>i.id===draft.id?draft:i):[...items,draft]; setItems(next); save(next); close(); };
  const onDelete= ()=>{ if(!isEdit) return; if(!confirm("삭제하시겠습니까?")) return; const next=items.filter(i=>i.id!==draft.id); setItems(next); save(next); close(); };

  return (
    <main className="wrap">
      <div className="bar">
        <div className="left"><button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 뒤로가기</button></div>
        <div className="center"><div className="title">급한 임차문의</div></div>
        <div className="right"><button className="primary" onClick={openNew}>+ 추가</button></div>
      </div>

      <div className="cards">
        {sorted.map(x=>{
          const d = x.due? dday(x.due) : null;
          const tone = d==null? "" : (d<0? "over" : d<=3? "hot" : d<=7? "warn" : "");
          return (
            <button key={x.id} className={"card "+tone} onClick={()=>openEdit(x)}>
              <div className="tt">{x.title}</div>
              <div className="meta">
                <span className="staff">{x.staff||"무배정"}</span>
                <span className="due">{x.due? `D${d>0? "-" : d===0? "-day" : "+"}${d<0? -d : d===0? "" : d}` : "-"}</span>
              </div>
              {x.memo && <div className="memo">{x.memo}</div>}
            </button>
          );
        })}
        {!sorted.length && <div className="empty">데이터가 없습니다.</div>}
      </div>

      {open && (
        <div className="modal"><div className="sheet">
          <div className="mtitle">{isEdit?"임차문의 수정":"임차문의 등록"}</div>
          <div className="row"><label>제목</label><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
          <div className="row"><label>담당</label><select value={draft.staff} onChange={e=>setDraft({...draft,staff:e.target.value})}><option value="">선택</option>{STAFFS.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="row"><label>마감일</label><input type="date" value={draft.due||""} onChange={e=>setDraft({...draft,due:e.target.value})}/></div>
          <div className="row"><label>메모</label><textarea rows={3} value={draft.memo} onChange={e=>setDraft({...draft,memo:e.target.value})}/></div>
          <div className="btns">
            <button className="btn ghost" onClick={close}>닫기</button><div className="spacer"></div>
            {isEdit && <button className="btn danger" onClick={onDelete}>삭제</button>}
            <button className="btn primary" onClick={onSave}>저장</button>
          </div>
        </div></div>
      )}

      <style jsx>{`
        .wrap{min-height:100svh;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111;padding:12px}
        .bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:10px}
        .left{justify-self:start}.center{justify-self:center}.right{justify-self:end}.title{font-weight:900}
        .back{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px}
        .primary{border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800}

        .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;text-align:left;cursor:pointer}
        .card:hover{background:#fafafa}
        .tt{font-weight:900;margin-bottom:6px}
        .meta{display:flex;justify-content:space-between;gap:8px;color:#555}
        .memo{margin-top:8px;color:#333}
        .hot{border-color:#f59e0b}.warn{border-color:#6b7280}.over{border-color:#ef4444}
        .empty{padding:30px;text-align:center;color:#888}

        .modal{position:fixed;inset:0;background:rgba(0,0,0,.28);display:grid;place-items:center;padding:16px;z-index:40}
        .sheet{width:min(640px,95vw);background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:18px}
        .row{display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:center;margin:8px 0}
        input,select,textarea{border:1px solid #d1d5db;border-radius:10px;padding:10px;width:100%}
        .btns{display:flex;gap:10px;align-items:center}.spacer{flex:1}
        .btn{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:10px 14px;font-weight:800}
        .btn.ghost:hover{background:#f3f4f6}.btn.danger{border-color:#ef4444;color:#ef4444}.btn.danger:hover{background:#fee2e2}
        .btn.primary{border-color:#111;background:#111;color:#fff}
      `}</style>
    </main>
  );
}