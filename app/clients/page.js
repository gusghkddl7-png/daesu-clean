"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* storage (clients만 사용) */
const loadClients = () => { try { return JSON.parse(localStorage.getItem("daesu:clients")||"[]"); } catch { return []; } };
const saveClients  = (arr)=> { try { localStorage.setItem("daesu:clients", JSON.stringify(arr)); } catch {} };

/* constants */
const STAFFS = ["김부장","김과장","강실장","소장","공동"];
const GD_REGIONS = ["천호동","성내동","둔촌동","길동","암사동","명일동"];
const SP_REGIONS = ["잠실동","삼전동","풍납동"];
const ROOM_TYPES = ["원룸","1.5룸","2룸","3룸","4룸"];
const PROGRAMS  = ["LH/SH","허그","HF"];

/* 연한색 팔레트 6가지 + 없음 */
const COLOR_CHOICES = [
  { key:"",          name:"없음",      bg:"#ffffff", border:"#e5e7eb" },
  { key:"#E0F2FE",   name:"하늘",      bg:"#E0F2FE", border:"#bae6fd" }, // sky-100
  { key:"#DCFCE7",   name:"연두",      bg:"#DCFCE7", border:"#bbf7d0" }, // green-100
  { key:"#FEF3C7",   name:"연노랑",    bg:"#FEF3C7", border:"#fde68a" }, // amber-100
  { key:"#FFE4E6",   name:"연핑크",    bg:"#FFE4E6", border:"#fecdd3" }, // rose-100
  { key:"#F3E8FF",   name:"연보라",    bg:"#F3E8FF", border:"#e9d5ff" }, // violet-100/200
  { key:"#E5E7EB",   name:"연회색",    bg:"#F3F4F6", border:"#E5E7EB" }, // gray-100
];

/* utils */
const fmtDate = (d)=>{ const x=new Date(d); const y=x.getFullYear(); const m=String(x.getMonth()+1).padStart(2,"0"); const dd=String(x.getDate()).padStart(2,"0"); return `${y}-${m}-${dd}`; };
const todayStr = ()=> fmtDate(new Date());
const onlyDigits = (s)=> (s||"").replace(/\D/g,"");
const fmtPhone = (s)=>{ const d=onlyDigits(s); if(d.length<=3) return d; if(d.length<=7) return d.replace(/(\d{3})(\d+)/,"$1-$2"); return d.replace(/(\d{3})(\d{3,4})(\d{0,4}).*/, (m,a,b,c)=> c?`${a}-${b}-${c}`:`${a}-${b}`); };
const moneyPair = (d,m)=> (d||m) ? `${d||0}/${m||0}` : "-";

/* page */
export default function ClientsPage(){
  const router = useRouter();

  const empty = {
    id:"",
    staff:"",
    inquiryDate: todayStr(),
    depositW:"", monthlyW:"",
    regions:[],
    regionAny:false,
    parking:false, pets:false, fullOption:false, needLoan:false,
    roomTypes:[],
    moveIn:"",
    phone:"",
    memo:"",
    sourceAlias:"",
    programs:[],
    closed:false,
    labelColor:"" // 행 배경색(선택)
  };

  const [items,setItems] = useState([]);
  const [q,setQ] = useState("");
  const [showClosed, setShowClosed] = useState(true);

  const [open,setOpen] = useState(false);
  const [isEdit,setEdit] = useState(false);
  const [draft,setDraft] = useState(empty);

  const [regionOpen,setRegionOpen] = useState(false);
  const regionRef = useRef(null);

  // ★ 최초 진입 시: 서버(DB)에서 최신을 불러오고, localStorage에도 동기화
  useEffect(()=>{
    (async ()=>{
      try{
        const res = await fetch("/api/clients", { cache:"no-store" });
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data);
          saveClients(data);
          return;
        }
      }catch(e){}
      // 서버 실패 시 로컬 대체
      setItems(loadClients());
    })();
  },[]);

  useEffect(()=>{
    function onDoc(e){ if(!regionRef.current) return; if(!regionRef.current.contains(e.target)) setRegionOpen(false); }
    if(regionOpen) document.addEventListener("mousedown", onDoc);
    return ()=> document.removeEventListener("mousedown", onDoc);
  },[regionOpen]);

  const filtered = useMemo(()=>{
    const kw = q.trim();
    let arr = items;
    if(kw){
      arr = arr.filter(x =>
        (x.staff||"").includes(kw) ||
        (x.regions||[]).join(",").includes(kw) ||
        (x.phone||"").includes(kw) ||
        (x.sourceAlias||"").includes(kw)
      );
    }
    if(!showClosed){ arr = arr.filter(x=>!x.closed); }
    return [...arr].sort((a,b)=>{
      const ka = a.inquiryDate||"0000-00-00"; const kb = b.inquiryDate||"0000-00-00";
      if(ka!==kb) return kb.localeCompare(ka);
      return (a.staff||"").localeCompare(b.staff||"");
    });
  },[items,q,showClosed]);

  const openNew = ()=>{ setDraft({...empty, id:"c"+Date.now()}); setEdit(false); setOpen(true); };
  const openEdit= (x)=>{ setDraft({ ...empty, ...x, programs: Array.isArray(x.programs)? x.programs : [], closed: !!x.closed, labelColor: x.labelColor||"" }); setEdit(true); setOpen(true); };
  const close   = ()=>{ setOpen(false); setDraft(empty); setRegionOpen(false); };

  const toggle = (arr,v)=> arr.includes(v)? arr.filter(x=>x!==v) : [...arr,v];

  const optionText = (x)=>{
    const arr=[];
    if(x.parking) arr.push("주차");
    if(x.pets) arr.push("동물");
    if(x.fullOption) arr.push("풀옵션");
    if(x.needLoan) arr.push("대출");
    return arr.length? arr.join("/") : "-";
  };

  // ★ 저장 시: 서버에도 업서트(POST /api/clients), 성공하면 목록 재조회
  const onSave = async ()=>{
    if(!draft.staff) return alert("담당자를 선택해 주세요.");
    if(!draft.inquiryDate) return alert("문의날짜를 선택해 주세요.");
    if(!draft.depositW && !draft.monthlyW) return alert("보증금/월세 중 최소 하나는 입력해 주세요.");
    if(!draft.regionAny && !(draft.regions && draft.regions.length)) return alert("희망지역을 선택해 주세요.");
    if(!(draft.roomTypes && draft.roomTypes.length)) return alert("희망 방 개수를 선택해 주세요.");
    if(!draft.moveIn) return alert("희망입주일을 선택해 주세요.");
    if(!draft.phone) return alert("연락처를 입력해 주세요.");

    const norm = {
      ...draft,
      depositW: onlyDigits(String(draft.depositW||"")).slice(0,8),
      monthlyW: onlyDigits(String(draft.monthlyW||"")).slice(0,6),
      phone:    onlyDigits(String(draft.phone||"")).slice(0,11),
      programs: Array.isArray(draft.programs)? draft.programs : [],
      closed: !!draft.closed,
      regions: draft.regionAny ? [] : draft.regions,
      labelColor: draft.labelColor || ""
    };

    // 낙관적 업데이트 (화면 즉시 반영)
    const next = isEdit ? items.map(i=>i.id===norm.id? norm : i) : [...items, norm];
    setItems(next); saveClients(next);

    try{
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(norm)
      });
      // 서버 기준 최신 재조회
      const res = await fetch("/api/clients", { cache:"no-store" });
      const data = await res.json();
      if (Array.isArray(data)) { setItems(data); saveClients(data); }
    }catch(e){
      // 서버 실패해도 화면은 유지
    }
    close();
  };

  // (참고) 현재는 서버 삭제 API가 없으므로 클라이언트/로컬만 삭제
  const onDelete = ()=>{
    if(!isEdit) return;
    if(!confirm("삭제하시겠습니까?")) return;
    const next = items.filter(i=>i.id!==draft.id);
    setItems(next); saveClients(next);
    close();
  };

  const priceWithPrograms = (x)=>{
    const base = moneyPair(x.depositW,x.monthlyW);
    const tags = (x.programs||[]).map(s=>`(${s})`).join(" ");
    return tags? `${base} ${tags}` : base;
  };

  const regionsLabel = draft.regionAny
    ? "상관없음"
    : (draft.regions.length
        ? (draft.regions.length<=3 ? draft.regions.join(", ") : `${draft.regions.slice(0,3).join(", ")} 외 ${draft.regions.length-3}`)
        : "클릭하여 선택");

  return (
    <main className="wrap">
      <div className="bar">
        <div className="left"><button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 뒤로가기</button></div>
        <div className="center"><div className="title">고객/문의</div></div>
        <div className="right"><button className="primary" onClick={()=>openNew()}>+ 등록</button></div>
      </div>

      <div className="filters">
        <input className="search" placeholder="담당/지역/연락처/유입경로 별칭 검색" value={q} onChange={e=>setQ(e.target.value)} />
        <label className="showClosed">
          <input type="checkbox" checked={showClosed} onChange={e=>setShowClosed(e.target.checked)} />
          <span>의뢰종료 표시</span>
        </label>
      </div>

      {/* 목록 */}
      <div className="table slim">
        <div className="thead">
          <div>날짜</div><div>담당</div><div>가격</div><div>지역</div><div>요구사항</div><div>방갯수</div><div>입주일</div><div>유입경로</div><div>연락처</div><div>비고</div>
        </div>
        <div className="tbody">
          {filtered.map((x, idx)=>{
            const bg = x.labelColor || "";
            return (
            <button
              key={x.id}
              className={`row ${x.closed ? "closed":""}`}
              onClick={()=>openEdit(x)}
              title="클릭하여 수정"
              style={bg ? { background:bg, borderColor:"#e5e7eb"} : undefined}
            >
              <div className="cell">
                <span className="badge">{idx+1}</span>
                {x.inquiryDate||"-"}
              </div>
              <div className="cell b">{x.staff||"-"}</div>
              <div className="cell">{priceWithPrograms(x)}</div>
              <div className="cell region" title={x.regionAny ? "상관없음" : (x.regions||[]).join(", ")}>
                {x.regionAny ? "상관없음" : ((x.regions||[]).join(", ")||"-")}
              </div>
              <div className="cell">{optionText(x)}</div>
              <div className="cell rooms">{(x.roomTypes||[]).join(", ")||"-"}</div>
              <div className="cell">{x.moveIn||"-"}</div>
              <div className="cell">{x.sourceAlias || "-"}</div>
              <div className="cell">{x.phone? fmtPhone(x.phone): "-"}</div>
              <div className="cell ellipsis" title={x.memo||""}>{x.memo||""}</div>
            </button>
          )})}
          {!filtered.length && <div className="empty">데이터가 없습니다.</div>}
        </div>
      </div>

      {/* 등록/수정 모달 */}
      {open && (
        <div className="modal">
          <div className="sheet">
            <button className="x" onClick={close} aria-label="닫기">×</button>
            <div className="mtitle">{isEdit ? "고객 수정" : "고객 등록"}</div>

            {/* 담당 */}
            <div className="frow">
              <label>담당 <i className="req">*</i></label>
              <select value={draft.staff} onChange={e=>setDraft({...draft, staff:e.target.value})}>
                <option value="">선택</option>
                {STAFFS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 문의날짜 */}
            <div className="frow">
              <label>문의날짜 <i className="req">*</i></label>
              <input type="date" value={draft.inquiryDate||""} onChange={e=>setDraft({...draft, inquiryDate:e.target.value})}/>
            </div>

            {/* 보증금/월세 */}
            <div className="frow">
              <label>보증금/월세 <i className="req">*</i></label>
              <div className="twocol">
                <div className="mini">
                  <input inputMode="numeric" placeholder="보증금(만원)" value={draft.depositW}
                         onChange={e=>setDraft({...draft, depositW: onlyDigits(e.target.value).slice(0,8)})}/>
                </div>
                <div className="mini">
                  <input inputMode="numeric" placeholder="월세(만원)" value={draft.monthlyW}
                         onChange={e=>setDraft({...draft, monthlyW: onlyDigits(e.target.value).slice(0,6)})}/>
                </div>
              </div>
            </div>

            {/* 희망지역 (팝업) */}
            <div className="frow" ref={regionRef}>
              <label>희망지역 <i className="req">*</i></label>
              <div className="region-picker">
                <button type="button" className={"pickerBtn"+((draft.regions.length||draft.regionAny)?" has":"")} onClick={()=>setRegionOpen(v=>!v)} disabled={draft.regionAny}>
                  {regionsLabel}
                </button>
                <div className="anyLine">
                  <label className="miniCk">
                    <input type="checkbox" checked={draft.regionAny} onChange={e=>setDraft({...draft, regionAny:e.target.checked, regions: e.target.checked? [] : draft.regions})}/>
                    <span>상관없음</span>
                  </label>
                </div>
                {regionOpen && !draft.regionAny && (
                  <div className="pop">
                    <div className="gwrap">
                      <div className="gcol">
                        <div className="gtitle">강동구</div>
                        <div className="gchips horiz">
                          {GD_REGIONS.map(r=>(
                            <label key={r} className="ck"><input type="checkbox" checked={draft.regions.includes(r)} onChange={()=>setDraft({...draft, regions: toggle(draft.regions,r)})}/><span>{r}</span></label>
                          ))}
                        </div>
                      </div>
                      <div className="gcol">
                        <div className="gtitle">송파구</div>
                        <div className="gchips horiz">
                          {SP_REGIONS.map(r=>(
                            <label key={r} className="ck"><input type="checkbox" checked={draft.regions.includes(r)} onChange={()=>setDraft({...draft, regions: toggle(draft.regions,r)})}/><span>{r}</span></label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="popBtns">
                      <button className="btn ghost" onClick={()=>setDraft({...draft, regions: []})}>전체해제</button>
                      <button className="btn primary" onClick={()=>setRegionOpen(false)}>적용</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 요구사항 (같은 줄, 작게) */}
            <div className="frow">
              <label>요구사항</label>
              <div className="inlineOpts">
                <label className="miniCk"><input type="checkbox" checked={draft.parking} onChange={e=>setDraft({...draft, parking:e.target.checked})}/><span>주차</span></label>
                <label className="miniCk"><input type="checkbox" checked={draft.pets} onChange={e=>setDraft({...draft, pets:e.target.checked})}/><span>동물</span></label>
                <label className="miniCk"><input type="checkbox" checked={draft.fullOption} onChange={e=>setDraft({...draft, fullOption:e.target.checked})}/><span>풀옵션</span></label>
                <label className="miniCk"><input type="checkbox" checked={draft.needLoan} onChange={e=>setDraft({...draft, needLoan:e.target.checked})}/><span>대출필요</span></label>
              </div>
            </div>

            {/* 방(가로 칩) */}
            <div className="frow">
              <label>방갯수 <i className="req">*</i></label>
              <div className="gchips horiz">
                {ROOM_TYPES.map(t=>(
                  <label key={t} className="ck">
                    <input type="checkbox" checked={draft.roomTypes.includes(t)} onChange={()=>setDraft({...draft, roomTypes: toggle(draft.roomTypes,t)})}/>
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 입주일 */}
            <div className="frow">
              <label>입주일 <i className="req">*</i></label>
              <input type="date" value={draft.moveIn||""} onChange={e=>setDraft({...draft, moveIn:e.target.value})}/>
            </div>

            {/* 유입경로 별칭 */}
            <div className="frow">
              <label>유입경로 별칭</label>
              <input value={draft.sourceAlias} onChange={e=>setDraft({...draft, sourceAlias:e.target.value})} placeholder="예: 네이버, 당근, 지인소개 등"/>
            </div>

            {/* 연락처 */}
            <div className="frow">
              <label>연락처 <i className="req">*</i></label>
              <input inputMode="tel" placeholder="010-1234-5678" value={fmtPhone(draft.phone)} onChange={e=>setDraft({...draft, phone: onlyDigits(e.target.value).slice(0,11)})}/>
            </div>

            {/* 비고 + 프로그램 체크 */}
            <div className="frow">
              <label>비고</label>
              <div>
                <div className="gchips horiz" style={{marginBottom:"8px"}}>
                  {PROGRAMS.map(p=>(
                    <label key={p} className="ck">
                      <input type="checkbox" checked={(draft.programs||[]).includes(p)} onChange={()=>setDraft({...draft, programs: toggle(draft.programs||[], p)})}/>
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
                <textarea rows={4} value={draft.memo} onChange={e=>setDraft({...draft, memo:e.target.value})}/>
              </div>
            </div>

            {/* ★ 표시색 선택 */}
            <div className="frow">
              <label>표시색(선택)</label>
              <div className="colorRow">
                {COLOR_CHOICES.map(c=>(
                  <label key={c.key||"none"} className={"swatch"+(draft.labelColor===c.key?" on":"")}
                         style={{background:c.bg, borderColor:c.border}}
                  >
                    <input
                      type="radio"
                      name="labelColor"
                      value={c.key}
                      checked={draft.labelColor===c.key}
                      onChange={()=>setDraft({...draft, labelColor:c.key})}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="btns">
              <label className="endCk">
                <input type="checkbox" checked={draft.closed} onChange={e=>setDraft({...draft, closed:e.target.checked})}/>
                <span>의뢰종료</span>
              </label>
              <div className="spacer"></div>
              <button className="btn" onClick={close}>닫기</button>
              {isEdit && <button className="btn danger" onClick={onDelete}>삭제</button>}
              <button className="btn primary" onClick={onSave}>저장</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .wrap{min-height:100svh;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111;padding:12px}
        .bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:8px}
        .left{justify-self:start}.center{justify-self:center}.right{justify-self:end}
        .title{font-weight:900;font-size:18px}
        .back{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px}
        .back .arrow{font-weight:900}
        .primary{border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800}

        .filters{margin:6px 0;display:flex;align-items:center;gap:10px;justify-content:space-between}
        .search{width:50%;border:1px solid #d1d5db;border-radius:10px;padding:7px 10px;font-size:13px}

        .table.slim{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
        .thead,.row{
          display:grid;
          grid-template-columns:120px 80px 120px minmax(120px,.4fr) 120px minmax(120px,.4fr) 110px 140px 130px 1.2fr;
        }
        .thead{background:#fafafa;border-bottom:1px solid #e5e7eb;font-weight:800;color:#333;text-align:center;font-size:12px}
        .thead > div,.row .cell{padding:7px 8px}
        .thead > div{border-right:1px solid #eee}
        .thead > div:last-child{border-right:none}
        .tbody{display:flex;flex-direction:column}
        .row{
          cursor:pointer;border-bottom:1px solid #f1f5f9;background:#fff;text-align:center;transition:background .15s ease;
          font-size:13px;
        }
        .row:hover{filter:brightness(0.99)}
        .row .cell{border-right:1px solid #f0f0f0;position:relative}
        .row .cell:last-child{border-right:none}
        .b{font-weight:700}
        .ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .region,.rooms{white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .empty{padding:20px;text-align:center;color:#888}

        /* 의뢰종료 시: 검정 바탕 + 희미한 글자 */
        .row.closed{ background:#0b0b0b !important; }
        .row.closed .cell{ color:#c7c7c7; }

        /* 날짜 옆 번호 배지 */
        .badge{
          display:inline-block;min-width:20px;height:18px;line-height:18px;
          background:#111;color:#fff;border-radius:999px;font-size:11px;font-weight:800;
          margin-right:6px;padding:0 6px;vertical-align:middle;
        }

        /* 모달 */
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.28);display:grid;place-items:center;padding:16px;z-index:40}
        .sheet{width:min(900px,96vw);background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:18px;position:relative}
        .x{position:absolute;right:10px;top:8px;border:1px solid #e5e7eb;background:#fff;border-radius:999px;width:32px;height:32px;font-size:20px;line-height:30px}
        .mtitle{font-weight:900;margin-bottom:8px}
        .frow{display:grid;grid-template-columns:160px 1fr;gap:10px;align-items:center;margin:8px 0}
        label{font-weight:700;color:#333}
        .req{color:#e11d48;font-style:normal;margin-left:4px}
        input,select,textarea{border:1px solid #d1d5db;border-radius:10px;padding:10px;width:100%}
        .twocol{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .mini input{padding:10px}

        .gchips{display:flex;flex-wrap:wrap;gap:8px}
        .gchips.horiz{flex-direction:row}
        .ck{display:inline-flex;gap:6px;align-items:center;border:1px dashed #d1d5db;border-radius:999px;padding:6px 10px;background:#fff}
        .ck input{width:16px;height:16px}

        .region-picker{position:relative}
        .pickerBtn{width:100%;text-align:left;border:1px dashed #d1d5db;border-radius:10px;background:#fff;padding:10px}
        .pickerBtn.has{border-style:solid}
        .anyLine{margin-top:6px}
        .pop{position:absolute;top:calc(100% + 6px);left:0;z-index:50;width:min(560px,96vw);background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.25);padding:12px}
        .gwrap{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .gtitle{font-weight:800;margin:6px 0}
        .popBtns{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
        .btn{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 12px;font-weight:800}
        .btn.ghost:hover{background:#f3f4f6}
        .btn.primary{border-color:#111;background:#111;color:#fff}

        .inlineOpts{display:flex;gap:12px}
        .miniCk{display:inline-flex;gap:6px;align-items:center;font-size:13px}
        .miniCk input{width:16px;height:16px}

        .btns{display:flex;gap:10px;align-items:center;margin-top:6px}
        .spacer{flex:1}
        .btn.danger{border-color:#ef4444;color:#ef4444}
        .btn.danger:hover{background:#fee2e2}
        .endCk{display:inline-flex;gap:6px;align-items:center}
        .endCk input{width:16px;height:16px}

        /* 표시색 선택 스와치 */
        .colorRow{display:flex;gap:8px;flex-wrap:wrap}
        .swatch{
          display:inline-flex;align-items:center;gap:6px;
          border:1px solid #e5e7eb;border-radius:999px;padding:6px 10px;cursor:pointer;
          user-select:none;
        }
        .swatch input{display:none}
        .swatch.on{outline:2px solid #111; outline-offset:1px}
      `}</style>
    </main>
  );
}
