"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STATES = ["미수","입금"];
const load=()=>{ try{return JSON.parse(localStorage.getItem("daesu:billing")||"[]");}catch{return[]} };
const save=a=>{ try{localStorage.setItem("daesu:billing",JSON.stringify(a));}catch{} };

export default function Page(){
  const router=useRouter();
  const [items,setItems]=useState([]);
  const [open,setOpen]=useState(false);
  const [isEdit,setEdit]=useState(false);
  const empty={ id:"", title:"", client:"", amount:0, state:"미수", billDate:"", paidDate:"", memo:"" };
  const [draft,setDraft]=useState(empty);

  useEffect(()=>{ setItems(load()); },[]);
  const totals = useMemo(()=>{
    const sum = (s)=> items.filter(x=>x.state===s).reduce((a,b)=>a+(Number(b.amount)||0),0);
    return { due: sum("미수"), paid: sum("입금") };
  },[items]);

  const openNew=()=>{ setDraft({...empty,id:"b"+Date.now()}); setEdit(false); setOpen(true); };
  const openEdit=x=>{ setDraft({...x}); setEdit(true); setOpen(true); };
  const close=()=>{ setOpen(false); setDraft(empty); };
  const onSave=()=>{ const next=isEdit?items.map(i=>i.id===draft.id?draft:i):[...items,draft]; setItems(next); save(next); close(); };
  const onDelete=()=>{ if(!isEdit) return; if(!confirm("삭제하시겠습니까?")) return; const next=items.filter(i=>i.id!==draft.id); setItems(next); save(next); close(); };

  return (
    <main className="wrap">
      <div className="bar">
        <div className="left"><button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 뒤로가기</button></div>
        <div className="center"><div className="title">결제/청구</div></div>
        <div className="right"><button className="primary" onClick={openNew}>+ 추가</button></div>
      </div>

      <div className="summary">
        <div className="sum card">
          <div className="label">미수 합계</div>
          <div className="money">{totals.due.toLocaleString()} 원</div>
        </div>
        <div className="sum card">
          <div className="label">입금 합계</div>
          <div className="money">{totals.paid.toLocaleString()} 원</div>
        </div>
      </div>

      <div className="table">
        <div className="thead"><div>건명</div><div>고객</div><div>금액</div><div>상태</div><div>청구일</div><div>입금일</div><div>메모</div></div>
        <div className="tbody">
          {items.map(x=>(
            <button key={x.id} className="row" onClick={()=>openEdit(x)}>
              <div className="b">{x.title}</div><div>{x.client}</div><div>{Number(x.amount||0).toLocaleString()}</div>
              <div><span className={"tag "+(x.state==="입금"?"green":"red")}>{x.state}</span></div>
              <div>{x.billDate}</div><div>{x.paidDate}</div><div className="ellipsis">{x.memo}</div>
            </button>
          ))}
          {!items.length && <div className="empty">데이터가 없습니다.</div>}
        </div>
      </div>

      {open && (
        <div className="modal"><div className="sheet">
          <div className="mtitle">{isEdit?"청구 수정":"청구 등록"}</div>
          <div className="row"><label>건명</label><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
          <div className="row"><label>고객</label><input value={draft.client} onChange={e=>setDraft({...draft,client:e.target.value})}/></div>
          <div className="row"><label>금액</label><input type="number" value={draft.amount} onChange={e=>setDraft({...draft,amount:Number(e.target.value||0)})}/></div>
          <div className="row"><label>상태</label><select value={draft.state} onChange={e=>setDraft({...draft,state:e.target.value})}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="row"><label>청구일</label><input type="date" value={draft.billDate||""} onChange={e=>setDraft({...draft,billDate:e.target.value})}/></div>
          <div className="row"><label>입금일</label><input type="date" value={draft.paidDate||""} onChange={e=>setDraft({...draft,paidDate:e.target.value})}/></div>
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

        .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:10px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
        .label{color:#555;margin-bottom:6px}.money{font-size:20px;font-weight:900}

        .table{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
        .thead,.row{display:grid;grid-template-columns:1.2fr .9fr .8fr .6fr .8fr .8fr 1.4fr;gap:8px}
        .thead{padding:10px;background:#fafafa;border-bottom:1px solid #e5e7eb;font-weight:800}
        .tbody{display:flex;flex-direction:column}.row{padding:12px;border-bottom:1px solid #f1f5f9;text-align:left;cursor:pointer}
        .row:hover{background:#fafafa}.b{font-weight:800}.ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .empty{padding:30px;text-align:center;color:#888}
        .tag{padding:2px 8px;border-radius:999px;border:1px solid #e5e7eb}.green{border-color:#16a34a;color:#16a34a}.red{border-color:#ef4444;color:#ef4444}
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