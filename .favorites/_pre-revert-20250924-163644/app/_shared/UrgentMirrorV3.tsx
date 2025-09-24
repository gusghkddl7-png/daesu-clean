"use client";
import { useEffect } from "react";

const PFX = "urgent:v3:";
const K_THEAD = PFX+"thead";
const K_COLG  = PFX+"colg";
const K_TCLASS= PFX+"tclass";
const K_ROWS  = PFX+"rows";

export default function UrgentMirrorV3(){
  useEffect(()=>{
    const main  = (document.querySelector("main")||document.body) as HTMLElement;
    const orig  = main.querySelector("table") as HTMLElement|null;
    let mount   = document.getElementById("urgent-mount") as HTMLElement|null;
    if(!mount){ mount = document.createElement("div"); mount.id="urgent-mount"; main.insertBefore(mount, main.firstChild); }

    const render = () => {
      const rowsStr = localStorage.getItem(K_ROWS);
      if(!rowsStr){ mount!.innerHTML = `<div style="color:#ef4444;padding:8px">고객문의 표를 찾지 못했어요.</div>`; if(orig) (orig as HTMLElement).style.display=""; return; }
      const rows   = JSON.parse(rowsStr||"[]") as Array<{anchor:string;days:number;html:string}>;
      const thead  = localStorage.getItem(K_THEAD) || "";
      const colg   = localStorage.getItem(K_COLG)  || "";
      const tclass = (localStorage.getItem(K_TCLASS) || "").trim();
      if (orig) (orig as HTMLElement).style.display = "none";

      const body = rows.map(r=>{
        const color = r.days<=10?"bg-red-50": r.days<=20?"bg-orange-50": r.days<=30?"bg-sky-50":"";
        return `<tr data-anchor="${r.anchor}" class="row-clickable ${color}">${r.html}</tr>`;
      }).join("");

      mount!.innerHTML = `
        <div class="overflow-x-auto bg-white rounded-lg shadow">
          <table class="${tclass}">
            ${colg}
            ${thead}
            <tbody>${body}</tbody>
          </table>
        </div>
      `;

      Array.from(mount!.querySelectorAll("tbody tr")).forEach(tr=>{
        const a=(tr as HTMLElement).querySelector("a[href]") as HTMLAnchorElement|null;
        if(a) return;
        const anchor=(tr as HTMLElement).getAttribute("data-anchor");
        if(!anchor) return;
        (tr as HTMLElement).addEventListener("click",()=>{ location.href="/clients#"+anchor; });
      });
    };

    render();
    const on = (e:StorageEvent)=>{ if(e.key && e.key.startsWith(PFX)) render(); };
    window.addEventListener("storage", on);
    return ()=>window.removeEventListener("storage", on);
  },[]);
  return null;
}
