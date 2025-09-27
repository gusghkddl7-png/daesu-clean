"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* storage (clients留??ъ슜) */
const loadClients = () => { try { return JSON.parse(localStorage.getItem("daesu:clients")||"[]"); } catch { return []; } };
const saveClients  = (arr)=> { try { localStorage.setItem("daesu:clients", JSON.stringify(arr)); } catch {} };

/* constants */
const STAFFS = [];
const GD_REGIONS = [];
const SP_REGIONS = [];
const ROOM_TYPES = [];
const PROGRAMS  = ["LH/SH","?덇렇","HF"];

/* ?고븳???붾젅??6媛吏 + ?놁쓬 */
const COLOR_CHOICES = [
  { key:"",         name:"없음",       bg:"#ffffff", border:"#e5e7eb" },
  { key:"#E0F2FE",  name:"하늘",       bg:"#E0F2FE", border:"#bae6fd" }, // sky-100
  { key:"#DCFCE7",  name:"연두",       bg:"#DCFCE7", border:"#bbf7d0" }, // green-100
  { key:"#FEF3C7",  name:"앰버",       bg:"#FEF3C7", border:"#fde68a" }, // amber-100
  { key:"#FFE4E6",  name:"로즈",       bg:"#FFE4E6", border:"#fecdd3" }, // rose-100
  { key:"#F3E8FF",  name:"바이올렛",   bg:"#F3E8FF", border:"#e9d5ff" }, // violet-100/200
  { key:"#E5E7EB",  name:"그레이",     bg:"#F3F4F6", border:"#E5E7EB" }  // gray-100
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
    labelColor:"" // ??諛곌꼍???좏깮)
  };

  const [items,setItems] = useState([]);
  const [q,setQ] = useState("");
  const [showClosed, setShowClosed] = useState(true);

  const [open,setOpen] = useState(false);
  const [isEdit,setEdit] = useState(false);
  const [draft,setDraft] = useState(empty);

  const [regionOpen,setRegionOpen] = useState(false);
  const regionRef = useRef(null);

  useEffect(()=>{
    // 湲곗〈 ?곗씠?곗뿉 labelColor媛 ?놁쓣 ???덉쑝誘濡?蹂댁젙
    const raw = loadClients();
    const patched = Array.isArray(raw) ? raw.map(x=>({ labelColor:"", ...x })) : [];
    setItems(patched);
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
  if (x.parking)    arr.push("주차");
  if (x.pets)       arr.push("반려동물");
  if (x.fullOption) arr.push("풀옵션");
  if (x.needLoan)   arr.push("대출");
  return arr.length ? arr.join("/") : "-";
};

  const onSave = ()=>{
    if(!draft.staff) return alert("?대떦?먮? ?좏깮??二쇱꽭??");
    if(!draft.inquiryDate) return alert("臾몄쓽?좎쭨瑜??좏깮??二쇱꽭??");
    if(!draft.depositW && !draft.monthlyW) return alert("蹂댁쬆湲??붿꽭 以?理쒖냼 ?섎굹???낅젰??二쇱꽭??");
    if(!draft.regionAny && !(draft.regions && draft.regions.length)) return alert("?щ쭩吏??쓣 ?좏깮??二쇱꽭??");
    if(!(draft.roomTypes && draft.roomTypes.length)) return alert("?щ쭩 諛?媛쒖닔瑜??좏깮??二쇱꽭??");
    if(!draft.moveIn) return alert("?щ쭩?낆＜?쇱쓣 ?좏깮??二쇱꽭??");
    if(!draft.phone) return alert("?곕씫泥섎? ?낅젰??二쇱꽭??");

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

    const next = isEdit ? items.map(i=>i.id===norm.id? norm : i) : [...items, norm];
    setItems(next); saveClients(next);
    close();
  };

  const onDelete = ()=>{
    if(!isEdit) return;
    if(!confirm("??젣?섏떆寃좎뒿?덇퉴?")) return;
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
    ? "?곴??놁쓬"
    : (draft.regions.length
        ? (draft.regions.length<=3 ? draft.regions.join(", ") : `${draft.regions.slice(0,3).join(", ")} ??${draft.regions.length-3}`)
        : "?대┃?섏뿬 ?좏깮");

  return (
    <main className="wrap">
      <div className="bar">
        <div className="left"><button className="back" onClick={()=><span className="arrow">←</span> 뒤로가기</button></div>
      </div>

      <div className="filters">
        <input className="search" placeholder="?대떦/吏???곕씫泥??좎엯寃쎈줈 蹂꾩묶 寃?? value={q} onChange={e=>setQ(e.target.value)} />
        <label className="showClosed">
          <input type="checkbox" checked={showClosed} onChange={e=>setShowClosed(e.target.checked)} />
          <span>?섎ː醫낅즺 ?쒖떆</span>
        </label>
      </div>

      {/* 紐⑸줉 */}
      <div className="table slim">
        <div className="thead">
          <div>?좎쭨</div><div>?대떦</div><div>媛寃?/div><div>吏??/div><div>?붽뎄?ы빆</div><div>諛⑷갗??/div><div>?낆＜??/div><div>?좎엯寃쎈줈</div><div>?곕씫泥?/div><div>鍮꾧퀬</div>
        </div>
        <div className="tbody">
          {filtered.map((x, idx)=>{
            const bg = x.labelColor || "";
            return (
            <button
              key={x.id}
              className={`row ${x.closed ? "closed":""}`}
              onClick={()=>openEdit(x)}
              title="?대┃?섏뿬 ?섏젙"
              style={bg ? { background:bg, borderColor:"#e5e7eb"} : undefined}
            >
              <div className="cell">
                <span className="badge">{idx+1}</span>
                {x.inquiryDate||"-"}
              </div>
              <div className="cell b">{x.staff||"-"}</div>
              <div className="cell">{priceWithPrograms(x)}</div>
              <div className="cell region" title={x.regionAny ? "?곴??놁쓬" : (x.regions||[]).join(", ")}>
                {x.regionAny ? "?곴??놁쓬" : ((x.regions||[]).join(", ")||"-")}
              </div>
              <div className="cell">{optionText(x)}</div>
              <div className="cell rooms">{(x.roomTypes||[]).join(", ")||"-"}</div>
              <div className="cell">{x.moveIn||"-"}</div>
              <div className="cell">{x.sourceAlias || "-"}</div>
              <div className="cell">{x.phone? fmtPhone(x.phone): "-"}</div>
              <div className="cell ellipsis" title={x.memo||""}>{x.memo||""}</div>
            </button>
          )})}
          {!filtered.length && <div className="empty">?곗씠?곌? ?놁뒿?덈떎.</div>}
        </div>
      </div>

      {/* ?깅줉/?섏젙 紐⑤떖 */}
      {open && (
        <div className="modal">
          <div className="sheet">
            <button className="x" onClick={close} aria-label="?リ린">횞</button>
            <div className="mtitle">{isEdit ? "怨좉컼 ?섏젙" : "怨좉컼 ?깅줉"}</div>

            {/* ?대떦 */}
            <div className="frow">
              <label>?대떦 <i className="req">*</i></label>
              <select value={draft.staff} onChange={e=>setDraft({...draft, staff:e.target.value})}>
                <option value="">?좏깮</option>
                {STAFFS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 臾몄쓽?좎쭨 */}
            <div className="frow">
              <label>臾몄쓽?좎쭨 <i className="req">*</i></label>
              <input type="date" value={draft.inquiryDate||""} onChange={e=>setDraft({...draft, inquiryDate:e.target.value})}/>
            </div>

            {/* 蹂댁쬆湲??붿꽭 */}
            <div className="frow">
              <label>蹂댁쬆湲??붿꽭 <i className="req">*</i></label>
              <div className="twocol">
                <div className="mini">
                  <input inputMode="numeric" placeholder="蹂댁쬆湲?留뚯썝)" value={draft.depositW}
                         onChange={e=>setDraft({...draft, depositW: onlyDigits(e.target.value).slice(0,8)})}/>
                </div>
                <div className="mini">
                  <input inputMode="numeric" placeholder="?붿꽭(留뚯썝)" value={draft.monthlyW}
                         onChange={e=>setDraft({...draft, monthlyW: onlyDigits(e.target.value).slice(0,6)})}/>
                </div>
              </div>
            </div>

            {/* ?щ쭩吏??(?앹뾽) */}
            <div className="frow" ref={regionRef}>
              <label>?щ쭩吏??<i className="req">*</i></label>
              <div className="region-picker">
                <button type="button" className={"pickerBtn"+((draft.regions.length||draft.regionAny)?" has":"")} onClick={()=>setRegionOpen(v=>!v)} disabled={draft.regionAny}>
                  {regionsLabel}
                </button>
                <div className="anyLine">
                  <label className="miniCk">
                    <input type="checkbox" checked={draft.regionAny} onChange={e=>setDraft({...draft, regionAny:e.target.checked, regions: e.target.checked? [] : draft.regions})}/>
                    <span>?곴??놁쓬</span>
                  </label>
                </div>
                {regionOpen && !draft.regionAny && (
                  <div className="pop">
                    <div className="gwrap">
                      <div className="gcol">
                        <div className="gtitle">媛뺣룞援?/div>
                        <div className="gchips horiz">
                          {GD_REGIONS.map(r=>(
                            <label key={r} className="ck"><input type="checkbox" checked={draft.regions.includes(r)} onChange={()=>setDraft({...draft, regions: toggle(draft.regions,r)})}/><span>{r}</span></label>
                          ))}
                        </div>
                      </div>
                      <div className="gcol">
                        <div className="gtitle">?≫뙆援?/div>
                        <div className="gchips horiz">
                          {SP_REGIONS.map(r=>(
                            <label key={r} className="ck"><input type="checkbox" checked={draft.regions.includes(r)} onChange={()=>setDraft({...draft, regions: toggle(draft.regions,r)})}/><span>{r}</span></label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="popBtns">
                      <button className="btn ghost" onClick={()=>setDraft({...draft, regions: []})}>?꾩껜?댁젣</button>
                      <button className="btn primary" onClick={()=>setRegionOpen(false)}>?곸슜</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ?붽뎄?ы빆 (媛숈? 以? ?묎쾶) */}
            <div className="frow">
              <label>?붽뎄?ы빆</label>
              <div className="inlineOpts">
                <label className="miniCk"><input type="checkbox" checked={draft.parking} onChange={e=>setDraft({...draft, parking:e.target.checked})}/><span>二쇱감</span></label>
                <label className="miniCk"><input type="checkbox" checked={draft.pets} onChange={e=>setDraft({...draft, pets:e.target.checked})}/><span>?숇Ъ</span></label>
                <label className="miniCk"><input type="checkbox" checked={draft.fullOption} onChange={e=>setDraft({...draft, fullOption:e.target.checked})}/><span>??듭뀡</span></label>
                <label className="miniCk"><input type="checkbox" checked={draft.needLoan} onChange={e=>setDraft({...draft, needLoan:e.target.checked})}/><span>?異쒗븘??/span></label>
              </div>
            </div>

            {/* 諛?媛濡?移? */}
            <div className="frow">
              <label>諛⑷갗??<i className="req">*</i></label>
              <div className="gchips horiz">
                {ROOM_TYPES.map(t=>(
                  <label key={t} className="ck">
                    <input type="checkbox" checked={draft.roomTypes.includes(t)} onChange={()=>setDraft({...draft, roomTypes: toggle(draft.roomTypes,t)})}/>
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ?낆＜??*/}
            <div className="frow">
              <label>?낆＜??<i className="req">*</i></label>
              <input type="date" value={draft.moveIn||""} onChange={e=>setDraft({...draft, moveIn:e.target.value})}/>
            </div>

            {/* ?좎엯寃쎈줈 蹂꾩묶 */}
            <div className="frow">
              <label>?좎엯寃쎈줈 蹂꾩묶</label>
              <input value={draft.sourceAlias} onChange={e=>setDraft({...draft, sourceAlias:e.target.value})} placeholder="?? ?ㅼ씠踰? ?밴렐, 吏?몄냼媛???/>
            </div>

            {/* ?곕씫泥?*/}
            <div className="frow">
              <label>?곕씫泥?<i className="req">*</i></label>
              <input inputMode="tel" placeholder="010-1234-5678" value={fmtPhone(draft.phone)} onChange={e=>setDraft({...draft, phone: onlyDigits(e.target.value).slice(0,11)})}/>
            </div>

            {/* 鍮꾧퀬 + ?꾨줈洹몃옩 泥댄겕 */}
            <div className="frow">
              <label>鍮꾧퀬</label>
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

            {/* ???쒖떆???좏깮 */}
            <div className="frow">
              <label>?쒖떆???좏깮)</label>
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
                <span>?섎ː醫낅즺</span>
              </label>
              <div className="spacer"></div>
              <button className="btn" onClick={close}>?リ린</button>
              {isEdit && <button className="btn danger" onClick={onDelete}>??젣</button>}
              <button className="btn primary" onClick={onSave}>???/button>
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

        /* ?섎ː醫낅즺 ?? 寃??諛뷀깢 + ?щ???湲??*/
        .row.closed{ background:#0b0b0b !important; }
        .row.closed .cell{ color:#c7c7c7; }

        /* ?좎쭨 ??踰덊샇 諛곗? */
        .badge{
          display:inline-block;min-width:20px;height:18px;line-height:18px;
          background:#111;color:#fff;border-radius:999px;font-size:11px;font-weight:800;
          margin-right:6px;padding:0 6px;vertical-align:middle;
        }

        /* 紐⑤떖 */
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

        /* ?쒖떆???좏깮 ?ㅼ?移?*/
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





