"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STAFFS=["김부장","김과장","강실장","소장"];
const load=()=>{ try{return JSON.parse(localStorage.getItem("daesu:payroll")||"[]");}catch{return[]} };
const save=a=>{ try{localStorage.setItem("daesu:payroll",JSON.stringify(a));}catch{} };

export default function Page(){
  const router=useRouter();
  const [role,setRole]=useState("guest");
  const [items,setItems]=useState([]);
  const [open,setOpen]=useState(false); const [isEdit,setEdit]=useState(false);
  const empty={ id:"", staff:"", month:"", kind:"커미션", amount:0, done:false, memo:"" };
  const [draft,setDraft]=useState(empty);

  useEffect(()=>{
    try{ const s=JSON.parse(localStorage.getItem("daesu:session")||"null"); setRole(s?.role||"guest"); }catch{}
    setItems(load());
  },[]);

  const totals = useMemo(()=>{
    const unpaid = items.filter(x=>!x.done).reduce((a,b)=>a+(Number(b.amount)||0),0);
    const paid   = items.filter(x=> x.done).reduce((a,b)=>a+(Number(b.amount)||0),0);
    return { unpaid, paid };
  },[items]);

  const openNew=()=>{ setDraft({...empty,id:"p"+Date.now()}); setEdit(false); setOpen(true); };
  const openEdit=x=>{ setDraft({...x}); setEdit(true); setOpen(true); };
  const close=()=>{ setOpen(false); setDraft(empty); };
  const onSave=()=>{ const next=isEdit?items.map(i=>i.id===draft.id?draft:i):[...items,draft]; setItems(next); save(next); close(); };
  const onDelete=()=>{ if(!isEdit) return; if(!confirm("삭제하시겠습니까?")) return; const next=items.filter(i=>i.id!==draft.id); setItems(next); save(next); close(); };

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
        <div className="center"><div className="title">급여/정산 (관리자)</div></div>
        <div className="right"><button className="primary" onClick={openNew}>+ 추가</button></div>
      </div>

      <div className="summary">
        <div className="sum card"><div className="label">미지급 합계</div><div className="money">{totals.unpaid.toLocaleString()} 원</div></div>
        <div className="sum card"><div className="label">지급 합계</div><div className="money">{totals.paid.toLocaleString()} 원</div></div>
      </div>

      <div className="table">
        <div className="thead"><div>직원</div><div>월</div><div>항목</div><div>금액</div><div>지급</div><div>메모</div></div>
        <div className="tbody">
          {items.map(x=>(
            <button key={x.id} className="row" onClick={()=>openEdit(x)}>
              <div>{x.staff}</div><div>{x.month}</div><div>{x.kind}</div>
              <div>{Number(x.amount||0).toLocaleString()}</div>
              <div>{x.done?"지급완료":"미지급"}</div>
              <div className="ellipsis">{x.memo}</div>
            </button>
          ))}
          {!items.length && <div className="empty">데이터가 없습니다.</div>}
        </div>
      </div>

      {open && (
        <div className="modal"><div className="sheet">
          <div className="mtitle">{isEdit?"정산 수정":"정산 등록"}</div>
          <div className="row"><label>직원</label><select value={draft.staff} onChange={e=>setDraft({...draft,staff:e.target.value})}><option value="">선택</option>{STAFFS.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="row"><label>월</label><input type="month" value={draft.month||""} onChange={e=>setDraft({...draft,month:e.target.value})}/></div>
          <div className="row"><label>항목</label><input value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})} placeholder="커미션/기타"/></div>
          <div className="row"><label>금액</label><input type="number" value={draft.amount} onChange={e=>setDraft({...draft,amount:Number(e.target.value||0)})}/></div>
          <div className="row"><label>지급</label><input type="checkbox" checked={!!draft.done} onChange={e=>setDraft({...draft,done:e.target.checked})}/> <span style={{marginLeft:8}}>{draft.done?"지급완료":"미지급"}</span></div>
          <div className="row"><label>메모</label><textarea rows={3} value={draft.memo} onChange={e=>setDraft({...draft,memo:e.target.value})}/></div>
          <div className="btns"><button className="btn ghost" onClick={close}>닫기</button><div className="spacer"></div>{isEdit && <button className="btn danger" onClick={onDelete}>삭제</button>}<button className="btn primary" onClick={onSave}>저장</button></div>
        </div></div>
      )}

      <style jsx>{`
        .wrap{min-height:100svh;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111;padding:12px}
        .bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:10px}
        .left{justify-self:start}.center{justify-self:center}.right{justify-self=end}.title{font-weight:900}
        .back{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px}
        .primary{border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800}
        .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:10px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}.label{color:#555;margin-bottom:6px}.money{font-size:20px;font-weight:900}
        .table{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
        .thead,.row{display:grid;grid-template-columns:.8fr .9fr 1fr .9fr .7fr 1.6fr;gap:8px}
        .thead{padding:10px;background:#fafafa;border-bottom:1px solid #e5e7eb;font-weight:800}
        .tbody{display:flex;flex-direction:column}.row{padding:12px;border-bottom:1px solid #f1f5f9;text-align:left;cursor:pointer}
        .row:hover{background:#fafafa}.ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .empty{padding:30px;text-align:center;color:#888}
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