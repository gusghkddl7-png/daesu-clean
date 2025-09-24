"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["원룸","오피스텔","상가","사무실","아파트","토지"];
const STATUS= ["노출","비공개"];
const STAFFS= ["김부장","김과장","강실장","소장"];
const load=()=>{ try{return JSON.parse(localStorage.getItem("daesu:listings")||"[]");}catch{return[]} };
const save=a=>{ try{localStorage.setItem("daesu:listings",JSON.stringify(a));}catch{} };

export default function Page(){
  const router = useRouter();
  const [items,setItems] = useState([]);
  const [q,setQ] = useState("");
  const [type,setType] = useState("전체");
  const [open,setOpen] = useState(false);
  const [isEdit,setEdit] = useState(false);
  const empty = { id:"", title:"", type:"원룸", price:"", status:"노출", staff:"", memo:"" };
  const [draft,setDraft] = useState(empty);

  useEffect(()=>{ setItems(load()); },[]);
  const filtered = useMemo(()=>{
    const kw=q.trim();
    let arr = items;
    if(type!=="전체") arr = arr.filter(x=>x.type===type);
    if(kw) arr=arr.filter(x=>(x.title||"").includes(kw)||(x.staff||"").includes(kw));
    return arr;
  },[items,q,type]);

  const openNew = ()=>{ setDraft({...empty,id:"l"+Date.now()}); setEdit(false); setOpen(true); };
  const openEdit= (x)=>{ setDraft({...x}); setEdit(true); setOpen(true); };
  const close   = ()=>{ setOpen(false); setDraft(empty); };
  const onSave  = ()=>{ const next=isEdit?items.map(i=>i.id===draft.id?draft:i):[...items,draft]; setItems(next); save(next); close(); };
  const onDelete= ()=>{ if(!isEdit) return; if(!confirm("삭제하시겠습니까?")) return; const next=items.filter(i=>i.id!==draft.id); setItems(next); save(next); close(); };

  return (
    <main className="wrap">
      <div className="bar">
        <div className="left"><button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 뒤로가기</button></div>
        <div className="center"><div className="title">매물관리</div></div>
        <div className="right"><button className="primary" onClick={openNew}>+ 등록</button></div>
      </div>

      <div className="filters">
        <div className="chips">
          <button className={"chip"+(type==="전체"?" on":"")} onClick={()=>setType("전체")}>전체</button>
          {TYPES.map(t=><button key={t} className={"chip"+(type===t?" on":"")} onClick={()=>setType(t)}>{t}</button>)}
        </div>
        <input className="search" placeholder="제목/담당자 검색" value={q} onChange={e=>setQ(e.target.value)}/>
      </div>

      <div className="table">
        <div className="thead"><div>제목</div><div>유형</div><div>가격</div><div>상태</div><div>담당</div><div>비고</div></div>
        <div className="tbody">
          {filtered.map(x=>(
            <button key={x.id} className="row" onClick={()=>openEdit(x)}>
              <div className="b">{x.title}</div><div>{x.type}</div><div>{x.price}</div>
              <div><span className={"tag "+(x.status==="노출"?"green":"gray")}>{x.status}</span></div>
              <div>{x.staff}</div><div className="ellipsis">{x.memo}</div>
            </button>
          ))}
          {!filtered.length && <div className="empty">데이터가 없습니다.</div>}
        </div>
      </div>

      {open && (
        <div className="modal"><div className="sheet">
          <div className="mtitle">{isEdit?"매물 수정":"매물 등록"}</div>
          <div className="row"><label>제목</label><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
          <div className="row"><label>유형</label><select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="row"><label>가격</label><input value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})} placeholder="예: 3억/200"/></div>
          <div className="row"><label>상태</label><select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}>{STATUS.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="row"><label>담당</label><select value={draft.staff} onChange={e=>setDraft({...draft,staff:e.target.value})}><option value="">선택</option>{STAFFS.map(s=><option key={s}>{s}</option>)}</select></div>
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
        .filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0}
        .chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:6px 10px;font-weight:700}
        .chip.on{border-color:#111}
        .search{flex:1;min-width:220px;border:1px solid #d1d5db;border-radius:10px;padding:8px 10px}
        .table{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
        .thead,.row{display:grid;grid-template-columns:1.6fr .7fr .8fr .6fr .6fr 1.6fr;gap:8px}
        .thead{padding:10px;background:#fafafa;border-bottom:1px solid #e5e7eb;font-weight:800}
        .tbody{display:flex;flex-direction:column}.row{padding:12px;border-bottom:1px solid #f1f5f9;text-align:left;cursor:pointer}
        .row:hover{background:#fafafa}.b{font-weight:800}.ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .empty{padding:30px;text-align:center;color:#888}.tag{padding:2px 8px;border-radius:999px;border:1px solid #e5e7eb}
        .green{border-color:#16a34a;color:#16a34a}.gray{color:#6b7280}
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.28);display:grid;place-items:center;padding:16px;z-index:40}
        .sheet{width:min(720px,95vw);background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:18px}
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