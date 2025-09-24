"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ===== 상수/키 ===== */
const EMP_KEY  = "daesu:payroll:employees";
const DATA_KEY = "daesu:payroll:data";

/* ===== 유틸 ===== */
const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const ymOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const addMonths = (ym, delta) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); return ymOf(d); };
const nextPayDate = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 5); };

function loadJSON(key, fb) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fb; } catch { return fb; } }
function saveJSON(key, v)   { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

/* ✅ payouts(직원별 가져가는 금액) 필드 추가 */
const BASE_MONTH = { deals:[], incomes:[], expenses:[], adjustments:{}, billingRaw:[], payouts:{} };
function normalizeMonth(raw){
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    ...BASE_MONTH,
    ...r,
    deals: Array.isArray(r.deals) ? r.deals : [],
    incomes: Array.isArray(r.incomes) ? r.incomes : [],
    expenses: Array.isArray(r.expenses) ? r.expenses : [],
    adjustments: r.adjustments && typeof r.adjustments === "object" ? r.adjustments : {},
    billingRaw: Array.isArray(r.billingRaw) ? r.billingRaw : [],
    payouts: r.payouts && typeof r.payouts === "object" ? r.payouts : {},
  };
}
function normalizeAll(data){
  const d = data && typeof data === "object" ? data : {};
  const out = {};
  for(const k of Object.keys(d)){ out[k] = normalizeMonth(d[k]); }
  return out;
}

/* ===== 직원 기본 ===== */
const DEFAULT_EMPLOYEES = [
  { id:"emp001", name:"김대수", base:3000000, bank:"국민", acct:"123-45-67890", position:"부장" },
  { id:"emp002", name:"홍길동", base:2800000, bank:"우리",  acct:"1002-123-456789", position:"과장" },
  { id:"emp003", name:"이몽룡", base:2600000, bank:"신한",  acct:"110-123-456789", position:"실장" },
];
/* ===== 운영비 분류 ===== */
const EXPENSE_TYPES = [
  "전기","인터넷","협회비","세무사기장","휴대폰","일반전화","노란우산","식대","포스광고",
  "사무실월세","온하우스","주유비","차보험","디엠,지피티","등기부","기타"
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

/* ===== 금액/날짜 포맷 (결제/청구와 동일 로직) ===== */
const fmtMan2 = (n) => Number(n||0).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const asPlain  = (n) => { const s = Number(n||0).toFixed(2); return s.endsWith(".00") ? String(Math.round(n||0)) : s.replace(/\.?0$/, ""); };
const fmtDate10 = (iso) => { if (!iso) return "-"; const d = new Date(iso); return isNaN(d.getTime()) ? "-" : d.toISOString().slice(0,10); };

// VAT 계산: amountMan = “만원” 단위
function deriveVat(amountMan, included) {
  amountMan = Number(amountMan||0);
  if (amountMan <= 0) return { supply: 0, vat: 0, total: 0 };
  if (included) {
    const supply = +(amountMan / 1.1).toFixed(2);
    const vat = +(amountMan - supply).toFixed(2);
    return { supply, vat, total: amountMan };
  } else {
    const vat = +(amountMan * 0.1).toFixed(2);
    const total = +(amountMan + vat).toFixed(2);
    return { supply: amountMan, vat, total };
  }
}

/* ===== 결제/청구 → 읽기용 행 매핑 (원본 스키마 직접 사용) ===== */
function mapBillingToRows(list){
  return (Array.isArray(list)?list:[]).map((it, idx)=>{
    const preDate = it.datePrelim || it.gaDate || it.preDate || it.preContractDate || "";

    // ✅ 담당: 새 구조(여러명) + 구버전 호환
    const agentLArr = Array.isArray(it.agentL) ? it.agentL : (it.agent ? [it.agent] : []);
    const agentTArr = Array.isArray(it.agentT) ? it.agentT : [];
    const agentLText = agentLArr.length ? agentLArr.join(", ") : "-";
    const agentTText = agentTArr.length ? agentTArr.join(", ") : "-";

    const address = it.address || it.addr || "";

    // 결제/청구 테이블의 “계약단계 날짜” 표기와 동일하게(본 / 중 / 잔)
    const phase = [
      it.dateSign    ? `본 ${it.dateSign}`       : "",
      it.dateInterim ? `중 ${it.dateInterim}`    : "",
      it.dateClosing ? `잔/입 ${it.dateClosing}` : "",
    ].filter(Boolean).join(" / ");

    // 임대/임차 금액(‘받을금액’은 부가세 포함 값)
    const lExp = Number(it?.landlord?.expect || 0);
    const tExp = Number(it?.tenant?.expect   || 0);
    const lVat = deriveVat(lExp, true);
    const tVat = deriveVat(tExp, true);

    const feeIncluded = lExp + tExp; // billing의 “중개보수”와 동일(부포 합)
    const memo = it.memo || "";

    return {
      id: it._id || it.id || `bill_${idx}_${Math.random().toString(36).slice(2,7)}`,
      preDate, address, phase,
      agentLText, agentTText,
      lessor: { name: (it.landlordName||"임대인"), supply: lVat.supply, vat: lVat.vat },
      lessee: { name: (it.tenantName||"임차인"),   supply: tVat.supply, vat: tVat.vat },
      fee: feeIncluded,
      memo
    };
  });
}

/* ===== 메인 ===== */
export default function Page(){
  const router = useRouter();
  const toast = useToast();

  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ setMounted(true); }, []);

  /* 로그인 */
  const [session,setSession] = useState({ id:"", role:"user" });
  useEffect(()=>{ try{
    const s = JSON.parse(localStorage.getItem("daesu:session")||"null");
    setSession({ id: s?.id || "", role: s?.role || "user" });
  }catch{} }, []);
  const isAdmin = session.role === "admin";

  /* 월 */
  const [ym,setYm] = useState(()=>ymOf(new Date()));
  const payDate = nextPayDate(ym);

  /* 직원 */
  const [emps,setEmps] = useState([]);
  useEffect(()=>{
    const cur = loadJSON(EMP_KEY, null);
    if (!cur || !Array.isArray(cur) || cur.length===0){
      saveJSON(EMP_KEY, DEFAULT_EMPLOYEES);
      setEmps(DEFAULT_EMPLOYEES);
    } else setEmps(cur);
  }, []);

  /* 데이터 */
  const [data,setData] = useState(()=> normalizeAll(loadJSON(DATA_KEY, {})));
  const month = useMemo(()=> normalizeMonth(data?.[ym]), [data,ym]);
  function saveMonth(upd){
    const next = { ...data, [ym]: normalizeMonth({ ...month, ...upd }) };
    setData(next); saveJSON(DATA_KEY,next);
  }
  useEffect(()=>{
    const raw = loadJSON(DATA_KEY, {});
    const fixed = normalizeAll(raw);
    if (JSON.stringify(raw)!==JSON.stringify(fixed)) saveJSON(DATA_KEY,fixed);
    setData(fixed);
  }, []);

  /* 결제/청구 원본 자동 로드(월 바뀔 때) */
  useEffect(()=>{
    let stop=false;
    (async()=>{
      try{
        let list = null;
        try{
          const res = await fetch(`/api/billing?month=${encodeURIComponent(ym)}`, { cache:"no-store" });
          if(res.ok) list = await res.json();
        }catch{}
        if(!Array.isArray(list)){
          const store = loadJSON("daesu:billing:store", {});
          const flat  = loadJSON("daesu:billing", []);
          if (store && store[ym] && Array.isArray(store[ym].list)) list = store[ym].list;
          else if (Array.isArray(flat)) list = flat.filter(x => {
            const d = x.date || x.gaDate || x.preDate || x.preContractDate || "";
            return typeof d === "string" && d.startsWith(ym+"-");
          });
          else list = [];
        }
        if (stop) return;
        saveMonth({ billingRaw: list });
      }catch(e){ console.error(e); }
    })();
    return ()=>{ stop=true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  /* ===== 요약 계산 ===== */
  const billingRows = useMemo(()=> mapBillingToRows(month.billingRaw), [month.billingRaw]);
  const dealCount   = billingRows.length;

  // 총중개보수(부가세 포함) 합계(단위: 만원)
  const totalFeesMan = useMemo(()=> billingRows.reduce((s,r)=> s + Number(r.fee||0), 0), [billingRows]);
  // 부가세 합계(만원)
  const totalVATMan  = useMemo(()=> billingRows.reduce((s,r)=> s + (Number(r.lessor?.vat||0)+Number(r.lessee?.vat||0)), 0), [billingRows]);

  /* ✅ 대시보드용 재무 합계(원 단위) */
  const revenueKRW       = Math.round(totalFeesMan * 10000); // 총 매출(원)
  const totalExpensesKRW = useMemo(()=> (month.expenses||[]).reduce((s,x)=>s+(Number(x.amount)||0),0), [month.expenses]);
  const totalPayrollKRW  = useMemo(()=> Object.values(month.payouts||{}).reduce((s,n)=> s + (Number(n)||0), 0), [month.payouts]);
  const netProfit        = revenueKRW - totalPayrollKRW - totalExpensesKRW;

  /* 탭 */
  const [tab,setTab] = useState("deals");
  const TABS = [
    {key:"deals",   label:"계약/수수료", desc:"결제/청구 원본(읽기)"},
    {key:"my",      label:"내 급여",    desc:"개인 페이슬립"},
  ];
  if (isAdmin){
    TABS.unshift({key:"dash", label:"대시보드", desc:"요약"});
    TABS.push({key:"expense", label:"운영비", desc:"빠른 입력"});
  }

  /* ===== 렌더 ===== */
  return (
    <main className="wrap">
      {!mounted ? (
        <div style={{padding:12, color:"var(--muted)"}}>로딩중…</div>
      ) : (
        <>
          {/* 상단바 */}
          <div className="topbar">
            <div className="left">
              <button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 대시보드</button>
            </div>
            <div className="center"><div className="title">급여/정산</div></div>
            <div className="right"></div>
          </div>

          {/* 월 선택 / 간단 요약(기존 유지) */}
          <section className="cardbox">
            <div className="cardtitle">월 선택</div>
            <div className="toolbar">
              <button className="mini" onClick={()=>setYm(addMonths(ym,-1))}>◀ 이전</button>
              <input className="search" type="month" value={ym} onChange={e=>setYm(e.target.value)} />
              <button className="mini" onClick={()=>setYm(addMonths(ym,+1))}>다음 ▶</button>
              <div className="chip">지급 예정일: <b>{nextPayDate(ym).toLocaleDateString()}</b></div>
            </div>
            <div className="summary">
              <div className="sumbox"><div className="lab">계약건수</div><div className="val">{dealCount}건</div></div>
              <div className="sumbox"><div className="lab">총중개보수(만원)</div><div className="val">{fmtMan2(totalFeesMan)}</div></div>
              <div className="sumbox"><div className="lab">부가세(만원)</div><div className="val">{fmtMan2(totalVATMan)}</div></div>
              <div className="sumbox"><div className="lab">회사 순수익(원)</div><div className="val">₩ {fmt(netProfit)}</div></div>
            </div>
          </section>

          {/* 탭 */}
          <section className="tiles">
            {TABS.map(t=>(
              <button key={t.key} className={`tile ${tab===t.key?"on":""}`} onClick={()=>setTab(t.key)}>
                <div className="tl">{t.label}</div><div className="ds">{t.desc}</div>
              </button>
            ))}
          </section>

          {/* ✅ 대시보드: 5개 요약 + 직원별 가져가는 금액(3명 기준) */}
          {isAdmin && tab==="dash" && (
            <>
              <section className="cardbox">
                <div className="cardtitle">대시보드 요약</div>
                <div className="summary">
                  <div className="sumbox"><div className="lab">1) 총 건수</div><div className="val">{dealCount}건</div></div>
                  <div className="sumbox"><div className="lab">2) 총 매출</div><div className="val">₩ {fmt(revenueKRW)}</div></div>
                  <div className="sumbox"><div className="lab">3) 총 직원급여</div><div className="val">₩ {fmt(totalPayrollKRW)}</div></div>
                  <div className="sumbox"><div className="lab">4) 총 운영비</div><div className="val">₩ {fmt(totalExpensesKRW)}</div></div>
                  <div className="sumbox"><div className="lab">5) 순수익(매출-급여-운영비)</div><div className="val">₩ {fmt(netProfit)}</div></div>
                </div>
                <div style={{padding:"8px 12px", color:"var(--muted)"}}>
                  참고) 총중개보수(만원): <b>{fmtMan2(totalFeesMan)}</b> · 부가세(만원): <b>{fmtMan2(totalVATMan)}</b>
                </div>
              </section>

              <section className="cardbox">
                <div className="cardtitle">직원별 가져가는 금액 (3명 기준)</div>
                <div className="table">
                  <div className="thead" style={{gridTemplateColumns:"1fr 1fr 1fr"}}>
                    <div>이름</div><div>직책</div><div>가져가는 금액(원)</div>
                  </div>
                  <div className="tbody">
                    {emps.slice(0,3).map(emp=>(
                      <div key={emp.id} className="row" style={{gridTemplateColumns:"1fr 1fr 1fr"}}>
                        <div>{emp.name}</div>
                        <div>{emp.position||"-"}</div>
                        <input
                          className="search"
                          type="number"
                          value={(month.payouts?.[emp.id]??0)}
                          onChange={e=>{
                            const v = Math.max(0, Math.round(Number(e.target.value||0)));
                            saveMonth({ payouts: { ...(month.payouts||{}), [emp.id]: v }});
                          }}
                        />
                      </div>
                    ))}
                    <div className="row" style={{gridTemplateColumns:"1fr"}}>
                      <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
                        <div>합계: <b>₩ {fmt(totalPayrollKRW)}</b></div>
                        <div style={{display:"flex",gap:6}}>
                          <button className="mini" onClick={()=> saveMonth({ payouts: {} })}>초기화</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* 결제/청구 원본 (읽기 전용) — billing 표와 동일 레이아웃 */}
          {tab==="deals" && (
            <section className="cardbox wide">
              <div className="cardtitle">결제/청구 원본 (읽기 전용)</div>

              <div className="tbl-wrap">
                <table className="tbl">
                  <colgroup>
                    <col style={{width:"80px"}} />   {/* 가계약일 */}
                    <col style={{width:"90px"}} />   {/* 담당 */}
                    <col style={{width:"90px"}} />   {/* 주소 */}
                    <col style={{width:"180px"}} />  {/* 계약단계 날짜 */}
                    <col style={{width:"150px"}} />  {/* 임대인(중개보수) */}
                    <col style={{width:"150px"}} />  {/* 임차인(중개보수) */}
                    <col style={{width:"90px"}} />   {/* 중개보수 */}
                    <col style={{width:"460px"}} />  {/* 메모 */}
                  </colgroup>
                  <thead>
                    <tr>
                      <th>가계약일</th>
                      <th>담당</th>
                      <th>주소</th>
                      <th>계약단계 날짜</th>
                      <th>임대인(중개보수)</th>
                      <th>임차인(중개보수)</th>
                      <th>중개보수</th>
                      <th>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="empty">해당 월 결제/청구 데이터가 없습니다.</td>
                      </tr>
                    )}

                    {billingRows.map((r)=>(
                      <tr key={r.id}>
                        <td className="cell">{fmtDate10(r.preDate) || "-"}</td>
                        <td className="cell">
                          <div className="ellipsis" title={`임대인측: ${r.agentLText || "-"}`}>
                            <span style={{color:"#6b7280"}}>임대인측: </span>{r.agentLText || "-"}
                          </div>
                          <div className="ellipsis" title={`임차인측: ${r.agentTText || "-"}`}>
                            <span style={{color:"#6b7280"}}>임차인측: </span>{r.agentTText || "-"}
                          </div>
                        </td>
                        <td className="cell ellipsis" title={r.address||"-"}>{r.address || "-"}</td>
                        <td className="cell ellipsis" title={r.phase||"-"}>{r.phase || "-"}</td>

                        <td className="cell">
                          <div className="ellipsis" title={`${r.lessor.name}(${fmtMan2((r.lessor.supply + r.lessor.vat))})`}>
                            {r.lessor.name||"-"}({fmtMan2(r.lessor.supply+r.lessor.vat)})
                          </div>
                          <div className="sub">→ 공급:{fmtMan2(r.lessor.supply)} / 부가세:{fmtMan2(r.lessor.vat)}</div>
                        </td>

                        <td className="cell">
                          <div className="ellipsis" title={`${r.lessee.name}(${fmtMan2((r.lessee.supply + r.lessee.vat))})`}>
                            {r.lessee.name||"-"}({fmtMan2(r.lessee.supply+r.lessee.vat)})
                          </div>
                          <div className="sub">→ 공급:{fmtMan2(r.lessee.supply)} / 부가세:{fmtMan2(r.lessee.vat)}</div>
                        </td>

                        <td className="cell">{fmtMan2(r.fee)}</td>
                        <td className="cell pre ellipsis" title={r.memo||"-"}>{(r.memo||"").replace(/\n/g," ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="note">※ 이 표는 <b>결제/청구</b> 화면의 원본 리스트를 그대로 보여줍니다. 수정을 원하면 결제/청구에서 수정하세요.</div>
            </section>
          )}

          {/* 내 급여 — 자리표시 */}
          {tab==="my" && (
            <section className="cardbox">
              <div className="cardtitle">내 급여 (페이슬립)</div>
              <div style={{padding:"12px", color:"var(--muted)"}}>
                개인별 계약/실지급 연동은 다음 단계에서 붙일게요.
              </div>
            </section>
          )}

          {/* 운영비 — 간단형 (기존 유지) */}
          {isAdmin && tab==="expense" && (
            <section className="cardbox">
              <div className="cardtitle">운영비</div>
              <div className="table">
                <div className="thead" style={{gridTemplateColumns:"1fr 1fr 1fr auto"}}>
                  <div>분류</div><div>금액</div><div>메모</div><div>작업</div>
                </div>
                <div className="tbody">
                  {(month.expenses||[]).map(row=>(
                    <div key={row.id||row.type} className="row" style={{gridTemplateColumns:"1fr 1fr 1fr auto"}}>
                      <select className="search" value={row.type} onChange={e=>{
                        row.type = e.target.value; saveMonth({ expenses:[...month.expenses] });
                      }}>{EXPENSE_TYPES.map(x=><option key={x} value={x}>{x}</option>)}</select>
                      <input className="search" type="number" value={row.amount||0} onChange={e=>{
                        row.amount=Number(e.target.value||0); saveMonth({ expenses:[...month.expenses] });
                      }}/>
                      <input className="search" placeholder="메모" value={row.memo||""} onChange={e=>{
                        row.memo=e.target.value; saveMonth({ expenses:[...month.expenses] });
                      }}/>
                      <div className="ops"><button className="mini" onClick={()=>{
                        saveMonth({ expenses: (month.expenses||[]).filter(x=>x!==row) });
                      }}>삭제</button></div>
                    </div>
                  ))}
                  <div className="row" style={{gridTemplateColumns:"1fr 1fr 1fr auto"}}>
                    <button className="mini" onClick={()=>{
                      const e = { id:Math.random().toString(36).slice(2,7), type:EXPENSE_TYPES[0], amount:0, memo:"" };
                      saveMonth({ expenses:[...(month.expenses||[]), e] });
                    }}>+ 행 추가</button>
                  </div>
                </div>
              </div>
              <div style={{padding:"10px 12px", textAlign:"right"}}>합계: ₩ {fmt((month.expenses||[]).reduce((s,x)=>s+(Number(x.amount)||0),0))}</div>
            </section>
          )}
        </>
      )}

      {/* 스타일 */}
      <style jsx>{`
        .wrap{min-height:100svh;background:var(--bg);color:var(--fg);padding:12px}
        .topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:14px}
        .left{justify-self:start}.center{justify-self:center}.right{justify-self:end}
        .title{font-weight:900}
        .back{display:inline-flex;gap:8px;align-items:center;border:1px solid var(--border);background:var(--card);border-radius:10px;padding:8px 12px}

        .cardbox{max-width:1220px;margin:0 auto 12px auto;border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
        .cardbox.wide{max-width:none; margin:0 12px 12px; }
        .cardtitle{font-weight:800;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--card-contrast)}
        .toolbar{display:flex;gap:8px;align-items:center;padding:10px 12px;flex-wrap:wrap}
        .chip{font-size:12px;border:1px solid var(--border);border-radius:999px;padding:4px 8px;background:var(--card)}
        .summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:12px;border-top:1px dashed var(--border)}
        .sumbox{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--card-contrast)}
        .lab{font-size:12px;color:var(--muted)} .val{font-weight:900;font-size:18px}

        .tiles{max-width:1220px;margin:0 auto 14px auto;padding:0 12px; display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
        .tile{display:grid;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px 16px 14px;cursor:pointer}
        .tile.on{border-color:var(--fg)}
        .tl{font-weight:800}.ds{font-size:13px;color:var(--muted)}

        /* 운영비 카드용 간단 그리드 */
        .table{border-top:1px solid var(--border)}
        .thead,.row{display:grid;gap:8px}
        .tbody{display:flex;flex-direction:column}
        .thead{padding:10px;background:var(--card-contrast);font-weight:800;border-bottom:1px solid var(--border)}
        .row{padding:10px;border-bottom:1px solid var(--border)}
        .search{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card);color:var(--fg)}
        .ops{display:flex;gap:6px;justify-content:flex-end}
        .mini{border:1px solid var(--border);background:var(--card);border-radius:8px;padding:6px 8px;cursor:pointer}

        /* ✅ billing과 동일한 테이블 톤/간격/행높이 */
        .tbl-wrap{overflow:auto;border-top:1px solid var(--border)}
        .tbl{
          width:100%;
          min-width:1300px;            /* billing: min-w-[1300px] */
          table-layout:fixed;          /* billing: table-fixed */
          font-size:14px;              /* billing: text-sm */
          border-collapse:separate;
          border-spacing:0;
        }
        .tbl thead tr{ background:#f3f4f6; } /* billing: bg-gray-100 */
        .tbl th, .tbl td{
          padding:0 12px;              /* billing: px-3 */
          height:60px;                 /* billing: ROW_H = 60 */
          border-bottom:1px solid var(--border);
          text-align:left;
          vertical-align:middle;
        }
        .tbl td.pre{ white-space:pre-line; }
        .tbl td.empty{ text-align:center; color:#6b7280; padding:24px 0; height:auto; }
        .tbl tbody tr:hover{ background:#f9fafb; } /* hover 효과(선택) */

        .ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sub{ font-size:11px; color:#6b7280; }
        .note{padding:8px 12px;font-size:12px;color:var(--muted)}
      `}</style>

      <style jsx global>{`
        :root{ --bg:#fff; --fg:#111; --muted:#666; --card:#fff; --card-contrast:#fafafa; --border:#e5e7eb; }
        [data-theme="dark"]{ --bg:#0b0b0c; --fg:#f2f3f4; --muted:#a3a3a3; --card:#111214; --card-contrast:#191a1c; --border:#2a2c2f; }
      `}</style>

      {toast.view}
    </main>
  );
}
