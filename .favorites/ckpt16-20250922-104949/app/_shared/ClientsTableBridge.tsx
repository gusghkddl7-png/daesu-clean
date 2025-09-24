"use client";
import { useEffect } from "react";

const PFX = "urgent:v3:";
const K_THEAD=PFX+"thead", K_COLG=PFX+"colg", K_TCLASS=PFX+"tclass", K_ROWS=PFX+"rows", K_INFO=PFX+"info";

const badge = (msg:string) => {
  let b=document.getElementById("urgent-bridge-badge") as HTMLElement|null;
  if(!b){
    b=document.createElement("div");
    b.id="urgent-bridge-badge";
    b.style.pointerEvents="none";
    document.body.appendChild(b);
  }
  b.textContent = msg;
  // 1.5초 뒤 자동 숨김
  window.clearTimeout((b as any).__t);
  (b as any).__t = window.setTimeout(()=>{ b && b.remove(); }, 1500);
};

function parseDate(t: string): string | null {
  t=(t||"").trim(); if(!t) return null;
  let m=t.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if(m){ const y=m[1]??String(new Date().getFullYear()); const iso=`${y}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso; }
  const norm=t.replace(/[^\d./-]/g," ").replace(/[.\/]/g,"-");
  m=norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if(m){ const iso=`${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(new Date(iso).getTime())) return iso; }
  m=t.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if(m){ const iso=`${m[1]}-${m[2]}-${m[3]}`; if(!isNaN(new Date(iso).getTime())) return iso; }
  return null;
}
const daysLeft = (iso:string)=>{ const d=new Date(iso),n=new Date(); d.setHours(0,0,0,0); n.setHours(0,0,0,0); return Math.ceil((+d-+n)/86400000); }
const rowId    = (tr:HTMLTableRowElement)=>{ const t=tr.textContent||""; const p=t.match(/\d{2,3}-?\d{3,4}-?\d{4}/); if(p) return p[0]; const td=tr.querySelectorAll("td"); return (td[0]?.textContent||"row")+":"+(td[1]?.textContent||"") }
const anchorOf = (id:string)=>"row-"+(id||"").replace(/[^a-zA-Z0-9_-]/g,"_");

export default function ClientsTableBridge(){
  useEffect(()=>{
    let done=false;

    const exportOnce = () => {
      const table=(document.querySelector("main table")||document.querySelector("table")) as HTMLTableElement|null;
      if(!table){ badge("표 대기중…"); return false; }
      const thead=table.querySelector("thead"); const colg=table.querySelector("colgroup"); const tbody=table.querySelector("tbody");
      if(!tbody){ badge("행 대기중…"); return false; }

      // 입주일 컬럼
      let idx=-1;
      if (thead){
        const ths=Array.from(thead.querySelectorAll("th"));
        idx=ths.findIndex(th=>/입주|입주일|이사/i.test(th.textContent||""));
      }

      const rows:any[]=[];
      Array.from(tbody.querySelectorAll("tr")).forEach(tr=>{
        let txt=""; if(idx>=0){ const td=(tr as HTMLTableRowElement).querySelectorAll("td")[idx]; txt=(td?.textContent||"").trim(); }
        if(!txt){ const cells=Array.from((tr as HTMLTableRowElement).querySelectorAll("td")).map(td=>td.textContent||""); const cand=cells.find(c=>parseDate(c||"")); if(cand) txt=cand; }
        const iso=parseDate(txt||""); if(!iso) return; const d=daysLeft(iso); if(d<0||d>30) return;
        const id=rowId(tr as HTMLTableRowElement); const anchor=anchorOf(id); (tr as HTMLElement).id=(tr as HTMLElement).id||anchor;
        rows.push({ anchor, days:d, html:(tr as HTMLTableRowElement).innerHTML });
      });
      rows.sort((a,b)=>a.days-b.days);

      try{ localStorage.setItem(K_TCLASS, table.className||""); }catch{}
      try{ thead && localStorage.setItem(K_THEAD, (thead as HTMLElement).outerHTML); }catch{}
      try{ colg  && localStorage.setItem(K_COLG , (colg  as HTMLElement).outerHTML); }catch{}
      try{ localStorage.setItem(K_ROWS , JSON.stringify(rows)); }catch{}
      try{ localStorage.setItem(K_INFO , `rows=${rows.length}`); }catch{}

      badge(`스캔 ${rows.length}건`);
      return true;
    };

    // 최초 시도 성공하면 종료
    let tries=0;
    const iv=setInterval(()=>{
      if(done) return;
      tries++;
      const ok=exportOnce();
      if(ok || tries>15){ done=true; clearInterval(iv); }
    }, 200);

    return ()=>{ done=true; clearInterval(iv); };
  },[]);
  return null;
}
