"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ===== 로컬 스토리지 키 ===== */
const EMP_KEY  = "daesu:payroll:employees"; // [{id,name,base,bank,acct,position}]
const DATA_KEY = "daesu:payroll:data";      // { "YYYY-MM": { deals:[], incomes:[], expenses:[], adjustments:{} } }

/* ===== 유틸 ===== */
const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const ymOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const addMonths = (ym, delta) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); return ymOf(d); };
const nextPayDate = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 5); }; // 다음달 5일
const daysLeft = (date) => Math.ceil((date.getTime() - Date.now()) / 86400000);

function loadJSON(key, fb) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fb; } catch { return fb; } }
function saveJSON(key, v)   { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

/* 기본 구조 보정기 */
const BASE_MONTH = { deals:[], incomes:[], expenses:[], adjustments:{} };
function normalizeMonth(raw){
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    ...BASE_MONTH,
    ...r,
    deals: Array.isArray(r.deals) ? r.deals : [],
    incomes: Array.isArray(r.incomes) ? r.incomes : [],
    expenses: Array.isArray(r.expenses) ? r.expenses : [],
    adjustments: r.adjustments && typeof r.adjustments === "object" ? r.adjustments : {},
  };
}
function normalizeAll(data){
  const d = data && typeof data === "object" ? data : {};
  const out = {};
  for(const k of Object.keys(d)){ out[k] = normalizeMonth(d[k]); }
  return out;
}

/* ===== 기본 샘플 직원 3명(최초 1회) ===== */
const DEFAULT_EMPLOYEES = [
  { id:"emp001", name:"김대수", base:3000000, bank:"국민", acct:"123-45-67890", position:"부장" },
  { id:"emp002", name:"홍길동", base:2800000, bank:"우리",  acct:"1002-123-456789", position:"과장" },
  { id:"emp003", name:"이몽룡", base:2600000, bank:"신한",  acct:"110-123-456789", position:"실장" },
];

/* ===== 토스트 ===== */
function useToast(){
  const [list,setList] = useState([]);
  function push(msg, ms=1600){ const id=Math.random().toString(36).slice(2,7); setList(t=>[...t,{id,msg}]); setTimeout(()=>setList(t=>t.filter(x=>x.id!==id)), ms); }
  const view = (
    <div style={{position:"fixed",right:12,bottom:12,display:"grid",gap:8,zIndex:50}}>
      {list.map(t=> <div key={t.id} style={{background:"var(--card)",color:"var(--fg)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 10px"}}>{t.msg}</div>)}
    </div>
  );
  return { push, view };
}

/* ===== 수수료 비율 규칙 ===== */
const BASE_RATES = { yang:0.55, inhouse:0.55, external:0.50 };
const RATE_FOR_MONTH = (totalDeals, type) => totalDeals >= 8 ? 0.60 : (BASE_RATES[type] ?? 0.50);

/* ===== 운영비 분류(요청 목록) ===== */
const EXPENSE_TYPES = [
  "전기","인터넷","협회비","세무사기장","휴대폰","일반전화","노란우산","식대","포스광고",
  "사무실월세","온하우스","주유비","차보험","디엠,지피티","등기부","기타"
];

/* 비슷한 것들끼리 묶음(섹션 순서/구성) */
const EXP_GROUPS = [
  { name:"공과금", types:["전기","일반전화","인터넷","세무사기장","협회비"] },
  { name:"통신·플랫폼", types:["휴대폰","포스광고","온하우스","디엠,지피티"] },
  { name:"사무실·임대", types:["사무실월세","등기부"] },
  { name:"차량·이동", types:["주유비","차보험"] },
  { name:"복지·기타", types:["식대","노란우산","기타"] },
];

/* ===== 메인 컴포넌트 ===== */
export default function Page(){
  const router = useRouter();
  const toast = useToast();

  /* 로그인 세션 */
  const [session,setSession] = useState({ id:"", role:"guest" });
  useEffect(()=>{ try{
    const s = JSON.parse(localStorage.getItem("daesu:session")||"null");
    setSession({ id: s?.id || "", role: s?.role || "guest" });
  }catch{} }, []);
  const isAdmin = session.role === "admin";

  /* 월 선택 */
  const [ym,setYm] = useState(()=>ymOf(new Date()));
  const payDate = nextPayDate(ym);
  const dleft   = daysLeft(payDate);

  /* 직원 마스터 */
  const [emps,setEmps] = useState([]);
  useEffect(()=>{
    const cur = loadJSON(EMP_KEY, null);
    if (!cur || !Array.isArray(cur) || cur.length===0){
      saveJSON(EMP_KEY, DEFAULT_EMPLOYEES);
      setEmps(DEFAULT_EMPLOYEES);
    } else setEmps(cur);
  }, []);

  /* 월별 데이터 (로드 및 보정) */
  const [data,setData] = useState(()=> normalizeAll(loadJSON(DATA_KEY, {})));
  useEffect(()=>{
    const raw = loadJSON(DATA_KEY, {});
    const fixed = normalizeAll(raw);
    saveJSON(DATA_KEY, fixed);
    setData(fixed);
  }, []);

  const month = useMemo(()=> normalizeMonth(data?.[ym]), [data,ym]);
  function saveMonth(upd){
    const next = { ...data, [ym]: normalizeMonth({ ...month, ...upd }) };
    setData(next); saveJSON(DATA_KEY,next);
  }

  /* ------- 계약/입금/지출 행 조작 ------- */
  function addDeal(){
    saveMonth({ deals:[...month.deals, {
      id:Math.random().toString(36).slice(2,7),
      date:new Date().toISOString().slice(0,10),
      empId: emps[0]?.id || "",
      empName: emps[0]?.name || "",
      type:"yang",                 // yang | inhouse | external
      principal:0,                 // 원금(부가세 제외)
      subject:"",                  // 내역(표시용)
      housing:"주택",              // 주택/상가 등
      memo:""
    }]});
  }
  function delRow(kind,id){ saveMonth({ [kind]: (month[kind]||[]).filter(x=>x.id!==id) }); }
  function addIncome(){  saveMonth({ incomes: [...(month.incomes||[]),  { id:Math.random().toString(36).slice(2,7), source:"매출", amount:0, date:new Date().toISOString().slice(0,10), memo:"" }] }); }

  /* ===== 운영비: 그리드형 입력을 위해 기본칸 자동 생성(해당월 처음 열 때) ===== */
  useEffect(()=>{
    if (!month) return;
    const cur = month.expenses || [];
    // '기타'를 제외한 분류는 1칸씩 반드시 존재하도록 보장
    const needed = EXPENSE_TYPES.filter(t=>t!=="기타").filter(t => !cur.some(e=>e.type===t));
    if (needed.length){
      const adds = needed.map(t=>({ id:Math.random().toString(36).slice(2,7), type:t, amount:0, memo:"" }));
      saveMonth({ expenses:[...cur, ...adds] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]); // 월 바뀔 때만 체크

  function addExpenseEtc(){ // 기타 칸 하나 더
    saveMonth({ expenses:[...(month.expenses||[]), { id:Math.random().toString(36).slice(2,7), type:"기타", amount:0, memo:"" }] });
  }
  function resetExpenses(){
    // 기본칸만 재생성
    const base = EXPENSE_TYPES.filter(t=>t!=="기타").map(t=>({ id:Math.random().toString(36).slice(2,7), type:t, amount:0, memo:"" }));
    saveMonth({ expenses: base });
    toast.push("운영비를 초기화했어요");
  }

  /* ------- 계산(월 기준) ------- */
  const dealCount = (month.deals || []).length;
  const totalPrincipal = useMemo(()=> (month.deals||[]).reduce((s,d)=>s+(Number(d.principal)||0),0), [month.deals]);
  const totalVAT       = useMemo(()=> Math.round(totalPrincipal * 0.10), [totalPrincipal]);

  // 직원별 집계 (원금, 커미션, 원천징수, 실지급)
  const perEmp = useMemo(()=>{
    const m = new Map();
    for(const d of (month.deals||[])){
      const rate = RATE_FOR_MONTH(dealCount, d.type);
      const principal = Number(d.principal)||0;
      const comm = principal * rate;          // 부가세 제외 원금 기준
      const o = m.get(d.empId) || { empId:d.empId, name:d.empName||"", principalSum:0, commission:0 };
      o.principalSum += principal;
      o.commission   += comm;
      m.set(d.empId, o);
    }
    // 조정금(±) & 3.3%
    for(const [empId, rec] of m){
      const adj = Number(month.adjustments?.[empId] || 0);
      rec.adjustment = adj;
      const gross = rec.commission + adj;
      rec.wh = Math.round(gross * 0.033);
      rec.payout = Math.round(gross - rec.wh);
    }
    return [...m.values()];
  }, [month.deals, month.adjustments, dealCount]);

  const totalPayout     = useMemo(()=> perEmp.reduce((s,x)=> s+x.payout, 0), [perEmp]);
  const totalExpenses   = useMemo(()=> (month.expenses||[]).reduce((s,x)=>s+(Number(x.amount)||0),0), [month.expenses]);
  const netProfit       = useMemo(()=> Math.round(totalPrincipal - totalPayout - totalExpenses), [totalPrincipal,totalPayout,totalExpenses]);

  /* 탭: 관리자와 직원 분리 */
  const [tab,setTab] = useState("dash");
  const TABS = isAdmin
    ? [
        {key:"dash",    label:"대시보드",   desc:"요약/입금·운영비"},
        {key:"deals",   label:"계약/수수료", desc:"원금·유형·직원"},
        {key:"salary",  label:"직원급여장",  desc:"실지급/원천징수"},
        {key:"expense", label:"운영비",     desc:"그리드 입력"},
        {key:"my",      label:"내 급여",    desc:"개인 페이슬립"}
      ]
    : [
        {key:"my",      label:"내 급여",    desc:"개인 페이슬립"},
        {key:"deals",   label:"적용비율",   desc:"나의 계약 목록"} // 직원에게는 조회만
      ];

  /* 내 급여(페이슬립)용 계산 */
  const me = useMemo(()=> emps.find(e=>e.id===session.id) || {name:"", bank:"", acct:""}, [emps, session.id]);
  const myDeals = useMemo(()=> (month.deals||[]).filter(d=>d.empId===session.id), [month.deals, session.id]);
  const myAgg = useMemo(()=>{
    let incentive=0;
    for(const d of myDeals){
      const rate = RATE_FOR_MONTH(dealCount, d.type);
      incentive += Math.round((Number(d.principal)||0) * rate);
    }
    const wh = Math.round(incentive * 0.033);
    const payout = incentive - wh;
    return { incentive, wh, payout };
  }, [myDeals, dealCount]);

  /* 렌더 */
  return (
    <main className="wrap">
      {/* 상단바 */}
      <div className="topbar">
        <div className="left">
          <button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 대시보드</button>
        </div>
        <div className="center"><div className="title">급여/정산</div></div>
        <div className="right"></div>
      </div>

      {/* 월 선택 & 요약(4지표) */}
      <section className="cardbox">
        <div className="cardtitle">월 선택</div>
        <div className="toolbar">
          <button className="mini" onClick={()=>setYm(addMonths(ym,-1))}>◀ 이전</button>
          <input className="search" type="month" value={ym} onChange={e=>setYm(e.target.value)} />
          <button className="mini" onClick={()=>setYm(addMonths(ym,+1))}>다음 ▶</button>
          <div className="chip">지급 예정일: <b>{nextPayDate(ym).toLocaleDateString()}</b> ({dleft>=0?`D-${dleft}`:`지급일 지남`})</div>
        </div>
        <div className="summary">
          <div className="sumbox"><div className="lab">계약건수</div><div className="val">{dealCount}건</div></div>
          <div className="sumbox"><div className="lab">총매출(원금)</div><div className="val">₩ {fmt(totalPrincipal)}</div></div>
          <div className="sumbox"><div className="lab">부가세(10%)</div><div className="val">₩ {fmt(totalVAT)}</div></div>
          <div className="sumbox"><div className="lab">회사 순수익</div><div className="val">₩ {fmt(netProfit)}</div></div>
        </div>
      </section>

      {/* 상단 타일(탭) */}
      <section className="tiles">
        {TABS.map(t=>(
          <button key={t.key} className={`tile ${tab===t.key?"on":""}`} onClick={()=>setTab(t.key)}>
            <div className="tl">{t.label}</div><div className="ds">{t.desc}</div>
          </button>
        ))}
      </section>

      {/* 대시보드/입금(참고) */}
      {isAdmin && tab==="dash" && (
        <section className="cardbox">
          <div className="cardtitle">입금 관리</div>
          <div className="table">
            <div className="thead" style={{gridTemplateColumns:"1fr 1fr 1fr 1fr auto"}}>
              <div>날짜</div><div>항목</div><div>금액</div><div>메모</div><div>작업</div>
            </div>
            <div className="tbody">
              {(month.incomes||[]).map(row=>(
                <div key={row.id} className="row" style={{gridTemplateColumns:"1fr 1fr 1fr 1fr auto"}}>
                  <input className="search" type="date" value={row.date||""} onChange={e=>{ row.date=e.target.value; saveMonth({ incomes:[...month.incomes] }); }}/>
                  <input className="search" placeholder="입금 출처" value={row.source||""} onChange={e=>{ row.source=e.target.value; saveMonth({ incomes:[...month.incomes] }); }}/>
                  <input className="search" type="number" value={row.amount||0} onChange={e=>{ row.amount=Number(e.target.value||0); saveMonth({ incomes:[...month.incomes] }); }}/>
                  <input className="search" placeholder="메모" value={row.memo||""} onChange={e=>{ row.memo=e.target.value; saveMonth({ incomes:[...month.incomes] }); }}/>
                  <div className="ops"><button className="mini" onClick={()=>delRow("incomes", row.id)}>삭제</button></div>
                </div>
              ))}
              <div className="row" style={{gridTemplateColumns:"1fr 1fr 1fr 1fr auto"}}>
                <button className="mini" onClick={()=>{ addIncome(); toast.push("입금 행 추가"); }}>+ 행 추가</button>
                <div style={{gridColumn:"span 3"}}></div>
                <div className="b" style={{textAlign:"right"}}>합계: ₩ {fmt((month.incomes||[]).reduce((s,x)=>s+(Number(x.amount)||0),0))}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 계약/수수료 — 관리자 편집, 직원은 조회만 */}
      {tab==="deals" && (
        <section className="cardbox">
          <div className="cardtitle">계약/수수료 (원금 기준 · VAT 별도)</div>
          <div className="table">
            <div className="thead" style={{gridTemplateColumns:"repeat(9,1fr)"}}>
              <div>일자</div><div>담당자</div><div>유형</div><div>원금</div><div>수수료율</div><div>예상수수료</div><div>내역</div><div>주택유형</div><div>작업</div>
            </div>
            <div className="tbody">
              {(month.deals||[]).map(row=>{
                const rate = RATE_FOR_MONTH(dealCount, row.type);
                const fee  = Math.round((Number(row.principal)||0) * rate);
                const readOnly = !isAdmin; // 직원은 수정 금지
                return (
                  <div key={row.id} className="row" style={{gridTemplateColumns:"repeat(9,1fr)"}}>
                    <input disabled={readOnly} className="search" type="date" value={row.date||""} onChange={e=>{ row.date=e.target.value; saveMonth({ deals:[...month.deals] }); }}/>
                    <select disabled={readOnly} className="search" value={row.empId||""} onChange={e=>{
                      row.empId = e.target.value;
                      row.empName = (emps.find(x=>x.id===row.empId)||{}).name || "";
                      saveMonth({ deals:[...month.deals] });
                    }}>
                      <option value="">선택</option>
                      {emps.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <select disabled={readOnly} className="search" value={row.type||"yang"} onChange={e=>{ row.type=e.target.value; saveMonth({ deals:[...month.deals] }); }}>
                      <option value="yang">양타</option>
                      <option value="inhouse">사내 단타</option>
                      <option value="external">외부 단타</option>
                    </select>
                    <input disabled={readOnly} className="search" type="number" value={row.principal||0} onChange={e=>{ row.principal=Number(e.target.value||0); saveMonth({ deals:[...month.deals] }); }}/>
                    <div style={{alignSelf:"center"}}>{(rate*100).toFixed(0)}%</div>
                    <div style={{alignSelf:"center"}}>₩ {fmt(fee)}</div>
                    <input disabled={readOnly} className="search" placeholder="내 역" value={row.subject||""} onChange={e=>{ row.subject=e.target.value; saveMonth({ deals:[...month.deals] }); }}/>
                    <input disabled={readOnly} className="search" placeholder="주택/상가" value={row.housing||""} onChange={e=>{ row.housing=e.target.value; saveMonth({ deals:[...month.deals] }); }}/>
                    <div className="ops">{isAdmin && <button className="mini" onClick={()=>delRow("deals", row.id)}>삭제</button>}</div>
                  </div>
                );
              })}
              {isAdmin && (
                <div className="row" style={{gridTemplateColumns:"repeat(9,1fr)"}}>
                  <button className="mini" onClick={()=>{ addDeal(); toast.push("계약 행 추가"); }}>+ 계약 추가</button>
                  <div className="b" style={{gridColumn:"span 8", textAlign:"right"}}>부가세 합계(10%): ₩ {fmt(totalVAT)}</div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 직원급여장(전체) — 관리자 전용 */}
      {isAdmin && tab==="salary" && (
        <section className="cardbox">
          <div className="cardtitle">직원급여장 (계약 자동 집계)</div>
          <div className="table">
            <div className="thead" style={{gridTemplateColumns:"repeat(6,1fr)"}}>
              <div>직원</div><div>원금합계</div><div>수수료(집계)</div><div>조정(±)</div><div>원천징수 3.3%</div><div>실지급</div>
            </div>
            <div className="tbody">
              {perEmp.length===0 ? (
                <div className="row"><div className="b" style={{gridColumn:"span 6"}}>집계할 계약이 없습니다.</div></div>
              ) : perEmp.map(r=>(
                <div key={r.empId} className="row" style={{gridTemplateColumns:"repeat(6,1fr)"}}>
                  <div className="b">{r.name}</div>
                  <div>₩ {fmt(r.principalSum)}</div>
                  <div>₩ {fmt(r.commission)}</div>
                  <input className="search" type="number" value={month.adjustments?.[r.empId] ?? 0}
                         onChange={e=>{ const v=Number(e.target.value||0); saveMonth({ adjustments:{...month.adjustments, [r.empId]:v} }); }}/>
                  <div>₩ {fmt(r.wh)}</div>
                  <div className="b">₩ {fmt(r.payout)}</div>
                </div>
              ))}
              {perEmp.length>0 && (
                <div className="row" style={{gridTemplateColumns:"repeat(6,1fr)"}}>
                  <div className="b">합계</div>
                  <div></div>
                  <div>₩ {fmt(perEmp.reduce((s,x)=>s+x.commission,0))}</div>
                  <div>₩ {fmt(perEmp.reduce((s,x)=>s+(x.adjustment||0),0))}</div>
                  <div>₩ {fmt(perEmp.reduce((s,x)=>s+x.wh,0))}</div>
                  <div className="b">₩ {fmt(totalPayout)}</div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 내 급여 — 직원 기본 뷰 */}
      {tab==="my" && (
        <section className="cardbox">
          <div className="cardtitle">내 급여 (페이슬립) — {me.name}</div>
          <div className="table">
            <div className="thead" style={{gridTemplateColumns:"repeat(7,1fr)"}}>
              <div>잔금일</div><div>내  역</div><div>수수료(원금)</div>
              <div>담당자</div><div>주택유형</div><div>수수료율</div><div>인센티브</div>
            </div>
            <div className="tbody">
              {myDeals.length===0 ? (
                <div className="row"><div className="b" style={{gridColumn:"span 7"}}>해당월 내 계약이 없습니다.</div></div>
              ) : myDeals.map(d=>{
                const rate = RATE_FOR_MONTH(dealCount, d.type);
                const inc = Math.round((Number(d.principal)||0) * rate);
                return (
                  <div key={d.id} className="row" style={{gridTemplateColumns:"repeat(7,1fr)"}}>
                    <div>{d.date||"-"}</div>
                    <div>{d.subject||d.memo||"-"}</div>
                    <div>₩ {fmt(d.principal||0)}</div>
                    <div>{d.empName||me.name}</div>
                    <div>{d.housing||"-"}</div>
                    <div>{(rate*100).toFixed(0)}%</div>
                    <div>₩ {fmt(inc)}</div>
                  </div>
                );
              })}
              {myDeals.length>0 && (
                <>
                  <div className="row" style={{gridTemplateColumns:"repeat(7,1fr)"}}>
                    <div className="b" style={{gridColumn:"span 6", textAlign:"right"}}>합계</div>
                    <div className="b">₩ {fmt(myAgg.incentive)}</div>
                  </div>
                  <div className="row" style={{gridTemplateColumns:"repeat(7,1fr)"}}>
                    <div className="b" style={{gridColumn:"span 3"}}>공제(원천 3.3%)</div>
                    <div style={{gridColumn:"span 4"}}>₩ {fmt(myAgg.wh)}</div>
                  </div>
                  <div className="row" style={{gridTemplateColumns:"repeat(7,1fr)"}}>
                    <div className="b" style={{gridColumn:"span 3"}}>최종 실수령</div>
                    <div className="b" style={{gridColumn:"span 4"}}>₩ {fmt(myAgg.payout)}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{padding:"10px 12px", color:"var(--muted)"}}>
            ※ 모든 수수료는 <b>원금(부가세 제외)</b> 기준입니다. 회사 납부 부가세 10%는 급여에 포함되지 않습니다.
            {dealCount>=8 && <> 이번 달은 계약 <b>{dealCount}건</b>으로 <b>모든 계약 60%</b> 적용입니다.</>}
          </div>
        </section>
      )}

      {/* 운영비 — 그리드형(3~4칸) 분류/금액 즉시 입력 */}
      {isAdmin && tab==="expense" && (
        <section className="cardbox">
          <div className="cardtitle">운영비 (그리드 입력 · 분류/금액)</div>

          {EXP_GROUPS.map(group=>{
            // 이 그룹에 속한 분류들의 현재 금액을 month.expenses에서 찾아 렌더
            const rows = (month.expenses||[]);
            const getByType = (t) => rows.find(r=>r.type===t);
            const etcRows = rows.filter(r=>r.type==="기타");
            const subtotal = group.types
              .filter(t=>t!=="기타")
              .reduce((s,t)=> s + (Number(getByType(t)?.amount)||0), 0) +
              (group.types.includes("기타") ? etcRows.reduce((s,r)=>s+(Number(r.amount)||0),0) : 0);

            return (
              <div key={group.name} style={{padding:"10px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:800}}>{group.name}</div>
                  <div style={{color:"var(--muted)"}}>소계: ₩ {fmt(subtotal)}</div>
                </div>

                <div className="exp-grid">
                  {group.types.filter(t=>t!=="기타").map(type=>{
                    const cur = getByType(type);
                    const val = Number(cur?.amount)||0;
                    return (
                      <div key={type} className="exp-cell">
                        <label className="exp-label">{type}</label>
                        <input
                          className="exp-input"
                          type="number"
                          value={val}
                          onChange={e=>{
                            if (!cur) return; // 기본칸은 초기화 시 자동 생성됨
                            cur.amount = Number(e.target.value||0);
                            saveMonth({ expenses:[...rows] });
                          }}
                        />
                      </div>
                    );
                  })}

                  {/* 기타는 여러칸 지원 */}
                  {group.types.includes("기타") && (
                    <>
                      {etcRows.map(r=>(
                        <div key={r.id} className="exp-cell">
                          <label className="exp-label">기타</label>
                          <input
                            className="exp-input"
                            type="number"
                            value={Number(r.amount)||0}
                            onChange={e=>{ r.amount=Number(e.target.value||0); saveMonth({ expenses:[...rows] }); }}
                          />
                          <button className="mini" onClick={()=>delRow("expenses", r.id)} style={{marginTop:6}}>삭제</button>
                        </div>
                      ))}
                      <div className="exp-cell">
                        <label className="exp-label" style={{opacity:.6}}>기타 추가</label>
                        <button className="mini" onClick={addExpenseEtc}>+ 기타</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* 하단: 초기화/저장/총금액 */}
          <div style={{display:"flex", gap:8, justifyContent:"space-between", padding:"10px 12px", borderTop:"1px dashed var(--border)"}}>
            <div style={{display:"flex", gap:8}}>
              <button className="mini" onClick={resetExpenses}>초기화</button>
              <button className="mini" onClick={()=>toast.push("저장 완료")}>저장</button>
            </div>
            <div className="b">총금액: ₩ {fmt(totalExpenses)}</div>
          </div>
        </section>
      )}

      {/* 스타일 */}
      <style jsx>{`
        .wrap{min-height:100svh;background:var(--bg);color:var(--fg);padding:12px}
        .topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:14px}
        .left{justify-self:start}.center{justify-self:center}.right{justify-self:end}
        .title{font-weight:900}
        .back{display:inline-flex;gap:8px;align-items:center;border:1px solid var(--border);background:var(--card);border-radius:10px;padding:8px 12px}
        .cardbox{max-width:1220px;margin:0 auto 12px auto;border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
        .cardtitle{font-weight:800;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--card-contrast)}
        .toolbar{display:flex;gap:8px;alignItems:center;padding:10px 12px;flex-wrap:wrap}
        .chip{font-size:12px;border:1px solid var(--border);border-radius:999px;padding:4px 8px;background:var(--card)}
        .summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:12px;border-top:1px dashed var(--border)}
        .sumbox{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--card-contrast)}
        .lab{font-size:12px;color:var(--muted)} .val{font-weight:900;font-size:18px}
        .tiles{max-width:1220px;margin:0 auto 14px auto;padding:0 12px; display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
        .tile{display:grid;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px 16px 14px;cursor:pointer}
        .tile.on{border-color:var(--fg)}
        .tl{font-weight:800}.ds{font-size:13px;color:var(--muted)}
        .table{border-top:1px solid var(--border)}
        .thead,.row{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
        .tbody{display:flex;flex-direction:column}
        .thead{padding:10px;background:var(--card-contrast);font-weight:800;border-bottom:1px solid var(--border)}
        .row{padding:10px;border-bottom:1px solid var(--border)}
        .search{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card);color:var(--fg)}
        .ops{display:flex;gap:6px;justify-content:flex-end}
        .mini{border:1px solid var(--border);background:var(--card);border-radius:8px;padding:6px 8px;cursor:pointer}

        /* 운영비 그리드 */
        .exp-grid{
          display:grid;
          gap:10px;
          grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); /* 화면 넓으면 4칸, 작으면 3칸 이하 */
        }
        .exp-cell{
          border:1px solid var(--border);
          border-radius:10px;
          padding:10px;
          background:var(--card-contrast);
          display:grid;
          gap:6px;
        }
        .exp-label{font-size:13px; font-weight:800}
        .exp-input{border:1px solid var(--border);border-radius:8px;padding:8px 10px;background:var(--card);color:var(--fg)}
      `}</style>

      <style jsx global>{`
        :root{ --bg:#fff; --fg:#111; --muted:#666; --card:#fff; --card-contrast:#fafafa; --border:#e5e7eb; }
        [data-theme="dark"]{ --bg:#0b0b0c; --fg:#f2f3f4; --muted:#a3a3a3; --card:#111214; --card-contrast:#191a1c; --border:#2a2c2f; }
      `}</style>

      {toast.view}
    </main>
  );
}
