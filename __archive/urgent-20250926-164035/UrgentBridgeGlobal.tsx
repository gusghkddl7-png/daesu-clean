"use client";
import { useEffect } from "react";
import { saveRows, listRows, setThead, setColgroup, setTableClass, getThead, getColgroup, getTableClass } from "./urgentBridge";

function badge(msg:string){
  let b=document.getElementById("urgent-bridge-badge") as HTMLElement|null;
  if(!b){ b=document.createElement("div"); b.id="urgent-bridge-badge"; document.body.appendChild(b); }
  b.textContent=msg;
  setTimeout(()=>{ try{b&&(b.style.opacity="0")}catch{} }, 4000);
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

function runClientsScanner(){
  let tries=0, stopped=false; badge("표 대기중…");
  const run=()=>{ if(stopped) return; tries++;
    const table=(document.querySelector("main table")||document.querySelector("table")) as HTMLTableElement|null;
    if(!table){ if(tries<20){ badge(`표 대기중(${tries})…`); setTimeout(run,400);} return; }
    const thead=table.querySelector("thead"), colg=table.querySelector("colgroup"), tbody=table.querySelector("tbody");
    try{ setTableClass(table.className||""); }catch{}
    if(thead){ try{ setThead((thead as HTMLElement).outerHTML);}catch{} }
    if(colg){ try{ setColgroup((colg as HTMLElement).outerHTML);}catch{} }
    if(!tbody){ if(tries<20){ badge(`행 대기중(${tries})…`); setTimeout(run,400);} return; }
    let idx=-1; if(thead){ const ths=Array.from(thead.querySelectorAll("th")); idx=ths.findIndex(th=>/입주|입주일| 이사/i.test(th.textContent||"")); }
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
    badge(`스캔 ${rows.length}건`);
  };
  run();
  const mo=new MutationObserver(()=>run()); mo.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{ stopped=true; mo.disconnect(); }, 8000);
}

function runUrgentMirror(){
  const main=(document.querySelector("main")||document.body) as HTMLElement;
  const orig=main.querySelector("table") as HTMLElement|null;
  let mount=document.getElementById("urgent-mount") as HTMLElement|null;
  if(!mount){ mount=document.createElement("div"); mount.id="urgent-mount"; main.insertBefore(mount, main.firstChild); }

  const render=()=>{
    const rows=listRows(); const thead=getThead()||""; const colg=getColgroup()||""; const tclass=(getTableClass()||"").trim();
    if(!rows||rows.length===0){ if(orig) orig.style.display=""; mount.innerHTML=`<div style="padding:8px;color:#ef4444">고객문의의 표를 찾지 못했어요.</div>`; return; }
    if(orig) orig.style.display="none";
    document.querySelectorAll("h1,[data-urgent-ui],.urgent-top,.urgent-filters,.text-sm.text-gray-600").forEach(el=>{ (el as HTMLElement).style.display="none"; });
    const body=rows.map(r=>{ const color=r.days<=10?"bg-red-50":r.days<=20?"bg-orange-50":r.days<=30?"bg-sky-50":""; return `<tr data-anchor="${r.anchorId}" class="row-clickable ${color}">${r.rowHTML}</tr>`; }).join("");
    mount!.innerHTML = `<div class="overflow-x-auto bg-white rounded-lg shadow"><table class="${tclass}">${colg||""}${thead||""}<tbody>${body}</tbody></table></div>`;
    Array.from(mount!.querySelectorAll("tbody tr")).forEach(tr=>{
      const a=(tr as HTMLElement).querySelector("a[href]") as HTMLAnchorElement|null; if(a) return;
      const anchor=(tr as HTMLElement).getAttribute("data-anchor"); if(!anchor) return;
      (tr as HTMLElement).addEventListener("click",()=>{ location.href="/clients#"+anchor; });
    });
  };
  render();
  const on=(e:StorageEvent)=>{ if(e.key && e.key.startsWith("urgent:v2:")) render(); };
  window.addEventListener("storage", on);
}

export default function UrgentBridgeGlobal(){
  useEffect(()=>{
    const path = (typeof location!=="undefined" ? location.pathname : "") || "";
    if(path.startsWith("/clients")) runClientsScanner();
    else if(path.startsWith("/urgent")) runUrgentMirror();
  },[]);
  return null;
}