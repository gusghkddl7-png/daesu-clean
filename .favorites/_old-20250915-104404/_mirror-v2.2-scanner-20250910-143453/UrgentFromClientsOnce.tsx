"use client";
import { useEffect } from "react";
import { saveRows, setThead, setColgroup, setTableClass, setInfo } from "./urgentBridge";

function ensureBadge(msg:string){
  let b=document.getElementById("urgent-bridge-badge") as HTMLElement|null;
  if(!b){ b=document.createElement("div"); b.id="urgent-bridge-badge"; document.body.appendChild(b); }
  b.textContent=msg;
}
function removeBadge(){ const b=document.getElementById("urgent-bridge-badge"); if(b) b.remove(); }

function parseDate(t:string):string|null{
  t=(t||"").trim(); if(!t) return null;
  let m=t.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if(m){ const y=m[1]??String(new Date().getFullYear()); const iso=`${y}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso; }
  m=t.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if(m){ const iso=`${m[1]}-${m[2]}-${m[3]}`; if(!isNaN(new Date(iso).getTime())) return iso; }
  const norm=t.replace(/[^\d./-]/g," ").replace(/[.\/]/g,"-");
  m=norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if(m){ const iso=`${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso; }
  m=norm.match(/(\d{2})-(\d{1,2})-(\d{1,2})/);
  if(m){ const iso=`20${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso; }
  m=norm.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if(m){ const y=String(new Date().getFullYear()); const iso=`${y}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso; }
  return null;
}
const days=(iso:string)=>{ const d=new Date(iso),n=new Date(); d.setHours(0,0,0,0); n.setHours(0,0,0,0); return Math.ceil((+d-+n)/86400000); }
const rowId=(tr:HTMLTableRowElement)=>{ const t=tr.textContent||""; const p=t.match(/\d{2,3}-?\d{3,4}-?\d{4}/); if(p) return p[0]; const td=tr.querySelectorAll("td"); return (td[0]?.textContent||"row")+":"+(td[1]?.textContent||"") }
const anchorOf=(id:string)=>"row-"+(id||"").replace(/[^a-zA-Z0-9_-]/g,"_");

function pickClientsTable(): HTMLTableElement | null {
  const tables = Array.from(document.querySelectorAll("table")) as HTMLTableElement[];
  if (tables.length === 0) return null;
  const hasHeader = (el:HTMLElement)=>/입주|입주일|이사/i.test(el.innerText||"");
  // 1) 헤더에 '입주/이사' 포함 테이블 우선
  let t = tables.find(tb => hasHeader(tb));
  if (t) return t;
  // 2) 날짜가 많이 나오는 테이블 선택
  let best: {tb: HTMLTableElement, score: number} | null = null;
  tables.forEach(tb=>{
    let score = 0;
    tb.querySelectorAll("td,th").forEach((c:any)=>{
      const s=(c.innerText||"").trim();
      if (parseDate(s)) score++;
    });
    if (!best || score > best.score) best = { tb, score };
  });
  return best?.tb || tables[0];
}

export default function UrgentFromClientsOnce(){
  useEffect(()=>{
    // 경로 판정 느슨하게 (/clients, /clients/ 모두 허용)
    const path=(location.pathname||"/").replace(/\/+$/,"");
    if (!path.toLowerCase().startsWith("/clients")) return;

    let tries=0, stopped=false;
    ensureBadge("표 대기중…");
    const watchdog = setTimeout(removeBadge, 12000); // 12초 후 강제 제거

    const run=()=>{
      if(stopped) return;
      tries++;

      const table = pickClientsTable();
      if(!table){ if(tries<24){ ensureBadge(`표 대기중(${tries})…`); setTimeout(run,400);} return; }

      const thead=table.querySelector("thead"), colg=table.querySelector("colgroup"), tbody=table.querySelector("tbody");
      try{ setTableClass((table as HTMLElement).className||""); }catch{}
      if(thead){ try{ setThead((thead as HTMLElement).outerHTML);}catch{} }
      if(colg){ try{ setColgroup((colg as HTMLElement).outerHTML);}catch{} }

      if(!tbody){ if(tries<24){ ensureBadge(`행 대기중(${tries})…`); setTimeout(run,400);} return; }

      // '입주일' 열 인덱스 추정
      let idx=-1; if(thead){ const ths=Array.from(thead.querySelectorAll("th")); idx=ths.findIndex(th=>/입주|입주일|이사/i.test(th.textContent||"")); }
      if (idx<0) {
        // 날짜가 가장 많이 나오는 열을 입주일 열로 추정
        const trs=Array.from(tbody.querySelectorAll("tr")) as HTMLTableRowElement[];
        if (trs.length) {
          const cols=trs[0].querySelectorAll("td").length;
          let bestCol=-1, bestHits=-1;
          for(let c=0;c<cols;c++){
            let hits=0;
            trs.slice(0,Math.min(20,trs.length)).forEach(tr=>{
              const td=tr.querySelectorAll("td")[c]; const txt=(td?.textContent||"").trim();
              if (parseDate(txt)) hits++;
            });
            if (hits>bestHits){ bestHits=hits; bestCol=c; }
          }
          if (bestHits>0) idx=bestCol;
        }
      }

      const rows:any[]=[];
      Array.from(tbody.querySelectorAll("tr")).forEach(tr=>{
        let txt="";
        if(idx>=0){ const td=(tr as HTMLTableRowElement).querySelectorAll("td")[idx]; txt=(td?.textContent||"").trim(); }
        if(!txt){
          const cells=Array.from((tr as HTMLTableRowElement).querySelectorAll("td")).map(td=>td.textContent||"");
          const cand=cells.find(c=>parseDate(c)); if(cand) txt=cand;
        }
        const iso=parseDate(txt||""); if(!iso) return; const d=days(iso); if(d<0||d>30) return;
        const id=rowId(tr as HTMLTableRowElement); const anchor=anchorOf(id); (tr as HTMLElement).id=(tr as HTMLElement).id||anchor;
        rows.push({ id, anchorId:anchor, moveIn:iso, days:d, rowHTML:(tr as HTMLTableRowElement).innerHTML });
      });
      rows.sort((a,b)=>a.days-b.days);
      saveRows(rows);
      setInfo(`rows=${rows.length}`);
      ensureBadge(`스캔 완료 · ${rows.length}건`);
      setTimeout(removeBadge, 1500); // 정상 완료 시 1.5초 뒤 배지 제거
    };

    run();
    const mo=new MutationObserver(()=>run()); mo.observe(document.body,{childList:true,subtree:true});
    const stopTimer=setTimeout(()=>{ stopped=true; mo.disconnect(); },8000);
    return ()=>{ stopped=true; mo.disconnect(); clearTimeout(stopTimer); clearTimeout(watchdog); removeBadge(); };
  },[]);
  return null;
}