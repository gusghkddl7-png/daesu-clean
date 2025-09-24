"use client";
import { useEffect } from "react";
import { saveRows, setThead, setColgroup, setTableClass, setInfo } from "./urgentBridge";

function badge(msg:string){
  let b=document.getElementById("urgent-bridge-badge") as HTMLElement|null;
  if(!b){ b=document.createElement("div"); b.id="urgent-bridge-badge"; document.body.appendChild(b); }
  b.textContent=msg;
  setTimeout(()=>{ try{b && (b.style.opacity="0")}catch{} }, 6000);
}

function parseDate(t:string):string|null{
  t=(t||"").trim(); if(!t) return null;
  let m=t.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if(m){ const y=m[1]??String(new Date().getFullYear()); const iso=`${y}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(Date.parse(iso))) return iso; }
  m=t.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if(m){ const iso=`${m[1]}-${m[2]}-${m[3]}`; if(!isNaN(Date.parse(iso))) return iso; }
  const norm=t.replace(/[^\d./-]/g," ").replace(/[.\/]/g,"-");
  m=norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if(m){ const iso=`${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(Date.parse(iso))) return iso; }
  m=norm.match(/(\d{2})-(\d{1,2})-(\d{1,2})/);
  if(m){ const iso=`20${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(Date.parse(iso))) return iso; }
  m=norm.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if(m){ const y=String(new Date().getFullYear()); const iso=`${y}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`; if(!isNaN(Date.parse(iso))) return iso; }
  return null;
}
const days=(iso:string)=>{ const d=new Date(iso),n=new Date(); d.setHours(0,0,0,0); n.setHours(0,0,0,0); return Math.ceil((+d-+n)/86400000); }
const rowId=(tr:HTMLTableRowElement)=>{ const t=tr.textContent||""; const p=t.match(/\d{2,3}-?\d{3,4}-?\d{4}/); if(p) return p[0]; const td=tr.querySelectorAll("td"); return (td[0]?.textContent||"row")+":"+(td[1]?.textContent||"") }
const anchorOf=(id:string)=>"row-"+(id||"").replace(/[^a-zA-Z0-9_-]/g,"_");

export default function UrgentFromClientsOnce(){
  useEffect(()=>{
    let tries=0, stopped=false;
    badge("표 대기중…");
    const run=()=>{
      if(stopped) return;
      tries++;
      const table=(document.querySelector("main table")||document.querySelector("table")) as HTMLTableElement|null;
      if(!table){ if(tries<20){ badge(`표 대기중(${tries})…`); setTimeout(run,400);} return; }
      const thead=table.querySelector("thead"), colg=table.querySelector("colgroup"), tbody=table.querySelector("tbody");
      try{ setTableClass(table.className||""); }catch{}
      if(thead){ try{ setThead((thead as HTMLElement).outerHTML);}catch{} }
      if(colg){ try{ setColgroup((colg as HTMLElement).outerHTML);}catch{} }
      if(!tbody){ if(tries<20){ badge(`행 대기중(${tries})…`); setTimeout(run,400);} return; }

      // '입주일' 열 인덱스 탐색
      let idx=-1; if(thead){ const ths=Array.from(thead.querySelectorAll("th")); idx=ths.findIndex(th=>/입주|입주일|이사/i.test(th.textContent||"")); }

      const rows:any[]=[];
      Array.from(tbody.querySelectorAll("tr")).forEach(tr=>{
        let txt=""; if(idx>=0){ const td=(tr as HTMLTableRowElement).querySelectorAll("td")[idx]; txt=(td?.textContent||"").trim(); }
        if(!txt){ const cells=Array.from((tr as HTMLTableRowElement).querySelectorAll("td")).map(td=>td.textContent||""); const cand=cells.find(c=>parseDate(c)); if(cand) txt=cand; }
        const iso=parseDate(txt||""); if(!iso) return; const d=days(iso); if(d<0||d>30) return;
        const id=rowId(tr as HTMLTableRowElement); const anchor=anchorOf(id); (tr as HTMLElement).id=(tr as HTMLElement).id||anchor;
        rows.push({ id, anchorId:anchor, moveIn:iso, days:d, rowHTML:(tr as HTMLTableRowElement).innerHTML });
      });
      rows.sort((a,b)=>a.days-b.days);
      saveRows(rows);
      setInfo(`rows=${rows.length}`);
      badge(`스캔 ${rows.length}건`);
    };
    run();
    const mo=new MutationObserver(()=>run()); mo.observe(document.body,{childList:true,subtree:true});
    const stopTimer=setTimeout(()=>{ stopped=true; mo.disconnect(); },8000);
    return ()=>{ stopped=true; mo.disconnect(); clearTimeout(stopTimer); };
  },[]);
  return null;
}
