"use client";
import { useEffect } from "react";
import { listRows, saveRows, getState, setThead } from "./urgentStore";

function parseDate(t:string){ t=(t||"").trim(); if(!t) return null;
  let m=t.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if(m){const y=m[1]??String(new Date().getFullYear());const iso=`${y}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso;}
  m=t.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/); if(m){const iso=`${m[1]}-${m[2]}-${m[3]}`; if(!isNaN(new Date(iso).getTime())) return iso;}
  const norm=t.replace(/[^\d./-]/g," ").replace(/[.\/]/g,"-");
  m=norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/); if(m){const iso=`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso;}
  m=norm.match(/(\d{2})-(\d{1,2})-(\d{1,2})/); if(m){const iso=`20${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso;}
  m=norm.match(/\b(\d{1,2})-(\d{1,2})\b/); if(m){const y=String(new Date().getFullYear()); const iso=`${y}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso;}
  return null;
}
const days=(iso:string)=>{const d=new Date(iso), n=new Date(); d.setHours(0,0,0,0); n.setHours(0,0,0,0); return Math.ceil((+d-+n)/86400000) };
const rid=(tr:HTMLTableRowElement)=>{ const t=tr.textContent||""; const p=t.match(/\d{2,3}-?\d{3,4}-?\d{4}/); if(p) return p[0]; const td=tr.querySelectorAll("td"); return (td[0]?.textContent||"row")+":"+(td[1]?.textContent||"") };
const anchor=(id:string)=>"row-"+(id||"").replace(/[^a-zA-Z0-9_-]/g,"_");

function badge(count:number){
  let el=document.getElementById("urgent-sync-badge") as HTMLElement|null;
  if(!el){ el=document.createElement("div"); el.id="urgent-sync-badge"; document.body.appendChild(el); }
  el.textContent = count>0 ? `연동 ${count}건` : "연동 0건";
  el.className = count>0 ? "ok" : "zero";
}

function applyClosed(table:HTMLTableElement){
  const st=getState(), tb=table.querySelector("tbody"); if(!tb) return;
  Array.from(tb.querySelectorAll("tr")).forEach(tr=>{
    const id=rid(tr as HTMLTableRowElement);
    (tr as HTMLElement).classList.toggle("urgent-closed", !!st[id]?.closed);
    const aid=anchor(id); if(!(tr as HTMLElement).id) (tr as HTMLElement).id=aid;
  });
}

export default function UrgentSyncClients(){
  useEffect(()=>{
    const scan=()=>{
      const table=(document.querySelector("main table")||document.querySelector("table")) as HTMLTableElement|null;
      if(!table) { badge(0); return; }
      const thead=table.querySelector("thead"), tbody=table.querySelector("tbody");
      if(thead) try{ setThead(thead.outerHTML) }catch{}
      if(!tbody){ badge(0); return; }

      // 입주일 열 인덱스 탐지
      let idx=-1;
      if(thead){
        const ths=Array.from(thead.querySelectorAll("th"));
        idx = ths.findIndex(th=>/입주|입주일/i.test(th.textContent||""));
      }

      const rows:any[]=[];
      Array.from(tbody.querySelectorAll("tr")).forEach(tr=>{
        let txt=""; if(idx>=0){ const td=(tr as HTMLTableRowElement).querySelectorAll("td")[idx]; txt=(td?.textContent||"").trim(); }
        if(!txt){ // 행 전체에서 날짜같은 텍스트 스캔
          const cells=Array.from((tr as HTMLTableRowElement).querySelectorAll("td")).map(td=>td.textContent||"");
          const cand=cells.find(c=>parseDate(c)); if(cand) txt=cand;
        }
        const iso=parseDate(txt||""); if(!iso) return;
        const d=days(iso); if(d<0||d>30) return;
        const id=rid(tr as HTMLTableRowElement), aid=anchor(id);
        (tr as HTMLElement).id = (tr as HTMLElement).id || aid;
        rows.push({ id, anchorId:aid, moveIn:iso, days:d, rowHTML:(tr as HTMLTableRowElement).innerHTML });
      });

      rows.sort((a,b)=>a.days-b.days);
      const before=listRows(); if(JSON.stringify(before)!==JSON.stringify(rows)) saveRows(rows);
      badge(rows.length);
      applyClosed(table);
    };

    const iv=setInterval(scan,700);
    const mo=new MutationObserver(()=>scan()); mo.observe(document.body,{childList:true,subtree:true});
    scan();
    const onStorage=(e:StorageEvent)=>{ if(e.key==="urgent:state") scan(); };
    window.addEventListener("storage", onStorage);
    return ()=>{ clearInterval(iv); mo.disconnect(); window.removeEventListener("storage", onStorage); };
  },[]);
  return null;
}
