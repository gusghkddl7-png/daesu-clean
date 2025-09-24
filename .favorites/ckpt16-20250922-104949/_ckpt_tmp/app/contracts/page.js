"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
const TYPES = ["임대","매매"];
const STATES= ["작성","서명","완료"];
const load=()=>{ try{return JSON.parse(localStorage.getItem("daesu:contracts")||"[]");}catch{return[]} };
const save=a=>{ try{localStorage.setItem("daesu:contracts",JSON.stringify(a));}catch{} };

export default function Page(){
  const router=useRouter();
  const [items,setItems]=useState([]);
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(false);
  const [isEdit,setEdit]=useState(false);
  const empty={ id:"", name:"", client:"", type:"임대", amount:"", date:"", state:"작성", memo:"" };
  const [draft,setDraft]=useState(empty);
  useEffect(()=>{ setItems(load()); },[]);
  const filtered = useMemo(()=>{
    const kw=q.trim(); let arr=items;
    if(kw) arr=arr.filter(x=>(x.name||"").includes(kw)||(x.client||"").includes(kw));
    return arr;
  },[items,q]);

  const openNew = ()=>{ setDraft({...empty,id:"ct"+Date.now()}); setEdit(false); setOpen(true); };
  const openEdit= (x)=>{ setDraft({...x}); setEdit(true); setOpen(true); };
  const close   = ()=>{ setOpen(false); setDraft(empty); };
  const onSave  = ()=>{ const next=isEdit?items.map(i=>i.id===draft.id?draft:i):[...items,draft]; setItems(next); save(next); close(); };
  const onDelete= ()=>{ if(!isEdit) return; if(!confirm("삭제하시겠습니까?")) return; const next=items.filter(i=>i.id!==draft.id); setItems(next); save(next); close(); };

  return (
    <main className="wrap">
      <div className="bar">
        <div className="left"><button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 뒤로가기</button></div>
        <div className="center"><div className="title">계약/문서</div></div>
        <div className="right"><button className="primary" onClick={openNew}>+ 추가</button></div>
      </div>

      <div className="filters"><input className="search" placeholder="계약명/고객 검색" value={q} onChange={e=>setQ(e.target.value)} /></div>

      <div className="table">
        <div className="thead"><div>계약명</div><div>고객</div><div>유형</div><div>금액</div><div>계약일</div><div>상태</div><div>메모</div></div>
        <div className="tbody">
          {filtered.map(x=>(
            <button key={x.id} className="row" onClick={()=>openEdit(x)}>
              <div className="b">{x.name}</div><div>{x.client}</div><div>{x.type}</div><div>{x.amount}</div><div>{x.date}</div>
              <div><span className={"tag "+(x.state==="완료"?"green":x.state==="서명"?"blue":"gray")}>{x.state}</span></div>
              <div className="ellipsis">{x.memo}</div>
            </button>
          ))}
          {!filtered.length && <div className="empty">데이터가 없습니다.</div>}
        </div>
      </div>

      {open && (
        <div className="modal"><div className="sheet">
          <div className="mtitle">{isEdit?"계약 수정":"계약 등록"}</div>
          <div className="row"><label>계약명</label><input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></div>
          <div className="row"><label>고객</label><input value={draft.client} onChange={e=>setDraft({...draft,client:e.target.value})}/></div>
          <div className="row"><label>유형</label><select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="row"><label>금액</label><input value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})}/></div>
          <div className="row"><label>계약일</label><input type="date" value={draft.date||""} onChange={e=>setDraft({...draft,date:e.target.value})}/></div>
          <div className="row"><label>상태</label><select value={draft.state} onChange={e=>setDraft({...draft,state:e.target.value})}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="row"><label>메모</label><textarea rows={3} value={draft.memo} onChange={e=>setDraft({...draft,memo:e.target.value})}/></div>
          <div className="btns"><button className="btn ghost" onClick={close}>닫기</button><div className="spacer"></div>{isEdit && <button className="btn danger" onClick={onDelete}>삭제</button>}<button className="btn primary" onClick={onSave}>저장</button></div>
        </div></div>
      )}

      <style jsx>{`
        .wrap{min-height:100svh;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111;padding:12px}
        .bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:10px}
        .left{justify-self:start}.center{justify-self:center}.right{justify-self:end}.title{font-weight:900}
        .back{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px}
        .primary{border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800}
        .filters{margin:8px 0}.search{border:1px solid #d1d5db;border-radius:10px;padding:8px 10px;width:100%;max-width:320px}
        .table{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
        .thead,.row{display:grid;grid-template-columns:1.2fr .9fr .6fr .8fr .8fr .6fr 1.4fr;gap:8px}
        .thead{padding:10px;background:#fafafa;border-bottom:1px solid #e5e7eb;font-weight:800}
        .tbody{display:flex;flex-direction:column}.row{padding:12px;border-bottom:1px solid #f1f5f9;text-align:left;cursor:pointer}
        .row:hover{background:#fafafa}.b{font-weight:800}.ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .empty{padding:30px;text-align:center;color:#888}
        .tag{padding:2px 8px;border-radius:999px;border:1px solid #e5e7eb}
        .green{border-color:#16a34a;color:#16a34a}.blue{border-color:#2563eb;color:#2563eb}.gray{color:#6b7280}
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.28);display:grid;place-items:center;padding:16px;z-index:40}
        .sheet{width:min(760px,95vw);background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:18px}
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