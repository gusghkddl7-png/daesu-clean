"use client";
import { useEffect } from "react";
import { listRows, getThead, getColgroup, getTableClass, setThead, setColgroup, setTableClass, saveRows } from "./urgentBridge";

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

function pickClientsTableFrom(doc: Document): HTMLTableElement | null {
  const tables = Array.from(doc.querySelectorAll("table")) as HTMLTableElement[];
  if (!tables.length) return null;
  const hasHeader = (el:HTMLElement)=>/입주|입주일|이사/i.test(el.innerText||"");
  let t = tables.find(tb => hasHeader(tb));
  if (t) return t;
  // 날짜가 많이 담긴 테이블 점수로 선택
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

async function ensureRowsViaIframe(): Promise<void> {
  if (listRows().length) return;
  return new Promise<void>((resolve)=>{
    const ifr = document.createElement("iframe");
    ifr.style.position="fixed"; ifr.style.opacity="0"; ifr.style.pointerEvents="none";
    ifr.width="1"; ifr.height="1"; ifr.src="/clients";
    document.body.appendChild(ifr);
    const done = ()=>{ try{ document.body.removeChild(ifr); }catch{} resolve(); };
    const timeout = setTimeout(done, 12000);
    ifr.onload = () => {
      try{
        const d = (ifr.contentDocument || ifr.contentWindow?.document)!;
        const table = pickClientsTableFrom(d);
        if (table){
          const thead = table.querySelector("thead") as HTMLElement | null;
          const colg  = table.querySelector("colgroup") as HTMLElement | null;
          const tbody = table.querySelector("tbody") as HTMLElement | null;
          try{ setTableClass((table as HTMLElement).className||""); }catch{}
          if (thead) try{ setThead(thead.outerHTML); }catch{}
          if (colg)  try{ setColgroup(colg.outerHTML); }catch{}
          if (tbody){
            // 입주일 열 추정
            let idx=-1;
            if (thead){
              const ths = Array.from(thead.querySelectorAll("th"));
              idx = ths.findIndex(th=>/입주|입주일|이사/i.test(th.textContent||""));
            }
            if (idx<0){
              const trs = Array.from(tbody.querySelectorAll("tr")) as HTMLTableRowElement[];
              if (trs.length){
                const cols=trs[0].querySelectorAll("td").length;
                let bestCol=-1, bestHits=-1;
                for(let c=0;c<cols;c++){
                  let hits=0;
                  trs.slice(0,Math.min(20,trs.length)).forEach(tr=>{
                    const td=tr.querySelectorAll("td")[c];
                    const txt=(td?.textContent||"").trim();
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
              const iso=parseDate(txt||""); if(!iso) return; const dleft=days(iso); if(dleft<0||dleft>30) return;
              const id=rowId(tr as HTMLTableRowElement); const anchor=anchorOf(id);
              rows.push({ id, anchorId:anchor, moveIn:iso, days:dleft, rowHTML:(tr as HTMLTableRowElement).innerHTML });
            });
            rows.sort((a,b)=>a.days-b.days);
            saveRows(rows);
          }
        }
      }catch{}
      clearTimeout(timeout); done();
    };
  });
}

function render(mount:HTMLElement, orig:HTMLElement|null){
  const rows=listRows(); const thead=getThead()||""; const colg=getColgroup()||""; const tclass=(getTableClass()||"").trim();
  if(!rows||rows.length===0){ if(orig) orig.style.display=""; mount.innerHTML=`<div style="padding:8px;color:#6b7280">입주일 30일 이내 후보가 없습니다.</div>`; return; }
  if(orig) orig.style.display="none";
  const body=rows.map(r=>{ const color=r.days<=10?"bg-red-50":r.days<=20?"bg-orange-50":r.days<=30?"bg-sky-50":""; return `<tr data-anchor="${r.anchorId}" class="row-clickable ${color}">${r.rowHTML}</tr>`; }).join("");

  document.querySelectorAll("h1, [data-urgent-ui], .urgent-top, .urgent-filters").forEach(el=>{ (el as HTMLElement).style.display="none"; });

  mount.innerHTML = `
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="${tclass}">
        ${colg||""}
        ${thead||""}
        <tbody>${body}</tbody>
      </table>
    </div>`;
  Array.from(mount.querySelectorAll("tbody tr")).forEach(tr=>{
    const a=(tr as HTMLElement).querySelector("a[href]") as HTMLAnchorElement|null;
    if(a) return;
    const anchor=(tr as HTMLElement).getAttribute("data-anchor"); if(!anchor) return;
    (tr as HTMLElement).addEventListener("click",()=>{ location.href="/clients#"+anchor; });
  });
}

export default function UrgentMirrorExact(){
  useEffect(()=>{
    const main=(document.querySelector("main")||document.body) as HTMLElement;
    const orig=main.querySelector("table") as HTMLElement|null;
    let mount=document.getElementById("urgent-mount") as HTMLElement|null;
    if(!mount){ mount=document.createElement("div"); mount.id="urgent-mount"; main.insertBefore(mount, main.firstChild); }

    const boot = async () => {
      if (!listRows().length) { await ensureRowsViaIframe(); }
      render(mount!,orig);
    };
    boot();

    const on=(e:StorageEvent)=>{ if(e.key && e.key.startsWith("urgent:v2:")) render(mount!,orig); };
    window.addEventListener("storage", on);
    return ()=>window.removeEventListener("storage", on);
  },[]);
  return null;
}