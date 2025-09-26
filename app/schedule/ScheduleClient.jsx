"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const WEEKS = ["일","월","화","수","목","금","토"];
const HOLIDAYS_2025 = {
  "2025-01-01":"신정",
  "2025-03-01":"삼일절","2025-03-03":"대체공휴일",
  "2025-05-05":"어린이날 · 부처님오신날","2025-05-06":"대체공휴일",
  "2025-06-06":"현충일",
  "2025-08-15":"광복절",
  "2025-10-03":"개천절",
  "2025-10-05":"추석 연휴","2025-10-06":"추석","2025-10-07":"추석 연휴","2025-10-08":"대체공휴일",
  "2025-10-09":"한글날",
  "2025-12-25":"성탄절"
};
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const typeClass = t => t==="가계약" ? "blue" : (t==="본계약"||t==="잔금및입주" ? "red" : "black");
const staffList = ["김부장","김과장","강실장","소장"];
const typeList  = ["투어","가계약","본계약","잔금및입주"];
const timeOptions = (()=>{ const out=[]; for(let m=540;m<=1200;m+=15){ const h=String(Math.floor(m/60)).padStart(2,"0"); const mm=String(m%60).padStart(2,"0"); out.push(`${h}:${mm}`);} return out; })();
const SEP = "\u200A/\u200A"; // 슬래시 양옆 아주 촘촘

// 시간 문자열(HH:MM) → 분 숫자 (없으면 매우 큰 수로)
function minutesOrInf(s){
  if(!s) return 1e9;
  const [h,m] = s.split(":").map(n=>parseInt(n,10));
  if(Number.isNaN(h) || Number.isNaN(m)) return 1e9;
  return h*60+m;
}

// 하루 정렬: pinned 먼저(같으면 시간 오름차순) → 나머지 시간 오름차순
function sortDay(arr){
  return [...arr].sort((a,b)=>{
    const ap = a.pinned?1:0, bp=b.pinned?1:0;
    if(ap!==bp) return bp-ap; // pinned(true) 먼저
    const at = minutesOrInf(a.time), bt = minutesOrInf(b.time);
    if(at!==bt) return at-bt;
    return String(a.id).localeCompare(String(b.id));
  });
}

export default function ScheduleClient(){
  const router = useRouter();
  const [cursor,setCursor] = useState(()=>{ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),1); });
  const [events,setEvents] = useState([]);
  const [ready,setReady]   = useState(false);

  useEffect(()=>{ // 로컬 일정 로드 + 페이드인
    try{
      const saved = JSON.parse(localStorage.getItem("daesu:events")||"[]");
      setEvents(Array.isArray(saved)? saved.map(e=>({ pinned:false, ...e })) : []);
    }catch{}
    const t = setTimeout(()=>setReady(true), 0);
    return ()=>clearTimeout(t);
  },[]);

  const emptyDraft = { id:"", date:"", type:"투어", staff:"", time:"", phone4:"", nickname:"", memo:"", canceled:false, pinned:false };
  const [open, setOpen]     = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [draft, setDraft]   = useState(emptyDraft);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = useMemo(()=>new Date(y,m,1), [y,m]);
  const last  = useMemo(()=>new Date(y,m+1,0), [y,m]);
  const blanks = first.getDay();
  const total  = blanks + last.getDate();
  const cells  = Math.ceil(total/7)*7;

  const todayKey = ymd(new Date());

  const days = useMemo(()=>Array.from({length:cells},(_,i)=>{
    const d = i - blanks + 1;
    const date = new Date(y,m,d);
    const key  = ymd(date);
    const other = d<=0 || d>last.getDate();
    const list = other ? [] : sortDay(
      (events||[]).filter(ev=>ev.date===key)
    );
    const holiday = other ? null : HOLIDAYS_2025[key];
    const isToday = !other && key===todayKey;
    return { date, key, other, events:list, holiday, dow:i%7, isToday };
  }),[y,m,events,blanks,cells,last,todayKey]);

  const saveAll = (arr)=>{ setEvents(arr); try{ localStorage.setItem("daesu:events", JSON.stringify(arr)); }catch{} };
  const move = (delta)=>setCursor(new Date(y,m+delta,1));
  const openNew  = (date)=>{ setDraft({ ...emptyDraft, id:"e"+Date.now(), date }); setIsEdit(false); setOpen(true); };
  const openEdit = (ev)=>{ setDraft({ ...emptyDraft, ...ev }); setIsEdit(true); setOpen(true); };
  const close    = ()=>{ setOpen(false); setDraft(emptyDraft); };

  // ‘오늘’ 버튼: 오늘 달로 이동 + 바로 등록 모달 오픈
  const openTodayNew = ()=>{
    const n = new Date();
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
    setTimeout(()=>openNew(ymd(n)), 0);
  };

  const onSave = ()=>{
    if(!draft.type || !typeList.includes(draft.type)) return alert("유형을 선택해 주세요.");
    if(!draft.staff) return alert("담당자를 선택해 주세요.");
    if(!draft.time)  return alert("시간을 선택해 주세요.");
    if(draft.phone4 && !/^\d{4}$/.test(draft.phone4)) return alert("전화번호 뒷자리(4자리)를 입력해 주세요.");
    const norm = { ...draft, pinned: !!draft.pinned, canceled: !!draft.canceled };
    const next = isEdit ? events.map(e=>e.id===norm.id? norm : e) : [...events, norm];
    saveAll(next); close();
  };
  const onDelete = ()=>{
    if(!isEdit) return;
    if(!confirm("삭제하시겠습니까?")) return;
    saveAll(events.filter(e=>e.id!==draft.id)); close();
  };

  return (
    <main className={`wrap ${ready ? "ready" : "pre"}`} suppressHydrationWarning>
      <div className="bar">
        <div className="left">
          <button className="back" onClick={()=>router.push("/dashboard")} aria-label="뒤로가기">
            <span className="arrow">←</span> 뒤로가기
          </button>
        </div>
        <div className="center">
          <button className="nav" onClick={()=>move(-1)} aria-label="이전 달">◀</button>
          <div className="title">{y} 년 {String(m+1).padStart(2,"0")} 월</div>
          <button className="nav" onClick={()=>move(1)} aria-label="다음 달">▶</button>
        </div>
        <div className="right">
          <button className="today" onClick={openTodayNew} aria-label="오늘 일정 바로 등록">오늘</button>
        </div>
      </div>

      <div className="head">
        {WEEKS.map((w,i)=>(<div key={w} className={"hcell"+(i===0?" sun":"")}>{w}</div>))}
      </div>

      <div className="grid">
        {days.map((d,i)=>{
          const isSun = d.dow===0;
          const cls = ["cell"]; if(d.other) cls.push("other"); if(isSun||d.holiday) cls.push("holiday");
          return (
            <div key={i} className={cls.join(" ")}>
              <div className="chead">
                <span className={`num${d.isToday ? " today" : ""}`}>{d.date.getDate()}</span>
                <button className="add" onClick={()=>openNew(d.key)}>+ 등록</button>
              </div>
              {d.holiday && <div className="hname">{d.holiday}</div>}
              <div className="items">
                {d.events.slice(0,12).map(ev=>{
                  const c = ["item", typeClass(ev.type)];
                  if(ev.canceled) c.push("cancel");
                  const parts = [ev.type, ev.staff||"", ev.time||"", ev.phone4||"", ev.nickname||""].filter(Boolean);
                  const text = parts.join(SEP);
                  return (
                    <div key={ev.id} className={c.join(" ")} onClick={()=>openEdit(ev)} title={(ev.memo||"")}>
                      {ev.pinned && <span className="pin" aria-label="고정">📌</span>}
                      {text}{ev.canceled && <span className="tag">취소됨</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="sheet">
            <div className="mtitle">{isEdit ? "일정 수정" : "일정 등록"}</div>

            <div className="row"><label>날짜</label>
              <input value={draft.date} onChange={e=>setDraft({...draft, date:e.target.value})}/>
            </div>

            <div className="row"><label>유형</label>
              <select value={draft.type} onChange={e=>setDraft({...draft, type:e.target.value})}>
                {typeList.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="row"><label>담당자</label>
              <select value={draft.staff} onChange={e=>setDraft({...draft, staff:e.target.value})}>
                <option value="">선택</option>
                {staffList.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="row"><label>시간</label>
              <select value={draft.time} onChange={e=>setDraft({...draft, time:e.target.value})}>
                <option value="">선택</option>
                {timeOptions.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="row"><label>전화 뒷4자리</label>
              <input maxLength={4} value={draft.phone4} onChange={e=>setDraft({...draft, phone4:e.target.value.replace(/\D/g,"").slice(0,4)})} placeholder="예: 1234"/>
            </div>

            <div className="row"><label>고객 별칭</label>
              <input value={draft.nickname} onChange={e=>setDraft({...draft, nickname:e.target.value})} placeholder="예: A회사 김팀장"/>
            </div>

            <div className="row"><label>메모</label>
              <textarea rows={3} value={draft.memo} onChange={e=>setDraft({...draft, memo:e.target.value})}/>
            </div>

            {/* 취소됨 옆에 핀 고정 */}
            <div className="toggleRow">
              <label className="toggle">
                <input type="checkbox" checked={!!draft.canceled} onChange={e=>setDraft({...draft, canceled:e.target.checked})}/>
                <span>취소됨</span>
              </label>
              <label className="toggle">
                <input type="checkbox" checked={!!draft.pinned} onChange={e=>setDraft({...draft, pinned:e.target.checked})}/>
                <span>핀 고정</span>
              </label>
            </div>

            <div className="btns">
              <button className="btn ghost" onClick={close}>닫기</button>
              <div className="spacer"></div>
              {isEdit && <button className="btn danger" onClick={onDelete}>삭제</button>}
              <button className="btn primary" onClick={onSave}>저장</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .wrap{min-height:100svh;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111;padding:10px}
        .wrap.pre{opacity:0}
        .wrap.ready{opacity:1;transition:opacity .08s ease}

        .bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;width:100%;max-width:none;margin:0 auto 8px}
        .left{justify-self:start}.center{display:flex;align-items:center;gap:8px;justify-self:center}.right{justify-self:end}
        .title{font-weight:900;font-size:18px;letter-spacing:.3px;min-width:140px;text-align:center}
        .nav{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 10px;cursor:pointer}
        .today{border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800}
        .back{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;background:#fff;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,.04);cursor:pointer;font-weight:700;color:#111}
        .back .arrow{font-weight:900}
        .back:hover{border-color:#d1d5db;transform:translateY(-1px)}

        .head,.grid{width:100%;max-width:none;margin:0 auto}
        .head{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
        .hcell{padding:6px 8px;border-radius:10px;background:#fff;border:1px solid #e5e7eb;text-align:center;font-weight:800;color:#333}
        .hcell.sun{color:#e11d48}

        .grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
        .cell{
          min-height:210px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;
          padding:10px;display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 10px rgba(0,0,0,.03);
        }
        .cell.other{background:#fbfbfb;color:#9aa0a6}
        .cell.holiday .num{color:#e11d48}
        .chead{display:flex;align-items:center;justify-content:space-between}
        .num{font-weight:700;line-height:1}
        .num.today{
          display:inline-flex;align-items:center;justify-content:center;
          height:22px;min-width:22px;padding:0 8px;border-radius:999px;
          background:#111;color:#fff!important;box-shadow:0 1px 0 rgba(0,0,0,.05);
        }
        .add{border:1px solid #d1d5db;background:#fff;border-radius:10px;padding:2px 8px;font-size:12px;cursor:pointer}
        .add:hover{background:#f3f4f6}
        .hname{font-size:12px;color:#e11d48}
        .items{display:flex;flex-direction:column;gap:4px}
        .item{font-size:13px;color:#111;background:#f6f7f8;border:1px solid #e5e7eb;border-radius:8px;padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
        .item.blue{color:#2563eb}.item.red{color:#e11d48}.item.black{color:#111}
        .item.cancel{color:#e11d48;text-decoration:line-through}
        .item .tag{margin-left:6px;font-size:11px;border:1px solid #fda4af;color:#e11d48;border-radius:999px;padding:0 6px;background:#fff}
        .item .pin{margin-right:6px}

        .modal{position:fixed;inset:0;background:rgba(0,0,0,.28);display:grid;place-items:center;padding:16px;z-index:40}
        .sheet{width:min(700px,95vw);background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:18px}
        .mtitle{font-size:18px;font-weight:900;margin-bottom:8px}
        .row{display:grid;grid-template-columns:120px 1fr;align-items:center;gap:10px;margin:8px 0}
        .row label{font-weight:700;color:#333}
        input,select,textarea{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px;background:#fff;outline:none}
        textarea{resize:vertical}

        .toggleRow{display:flex;gap:16px;align-items:center;margin:6px 0 12px 0}
        .toggle{display:inline-flex;gap:8px;align-items:center;font-weight:700;color:#333}
        .toggle input{width:auto}

        .btns{display:flex;align-items:center;gap:10px}
        .spacer{flex:1}
        .btn{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
        .btn.primary{border-color:#111;background:#111;color:#fff}
        .btn.ghost:hover{background:#f3f4f6}
        .btn.danger{border-color:#ef4444;color:#ef4444}
        .btn.danger:hover{background:#fee2e2}
      `}</style>
    </main>
  );
}
