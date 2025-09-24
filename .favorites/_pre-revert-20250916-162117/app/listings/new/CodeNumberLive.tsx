"use client";
import React from "react";

type Deal = "월세"|"전세"|"매매";
type Prefix = "C"|"J"|"R"|"BO"|"BL"|"BM";

function textOf(el: HTMLElement|null){ return (el?.textContent||"").trim(); }
function labelFor(input: HTMLInputElement){
  if(!input) return "";
  if(input.id){
    const l = document.querySelector(`label[for="${CSS.escape(input.id)}"]`) as HTMLElement|null;
    if(l) return textOf(l);
  }
  const near = input.closest("label") as HTMLElement|null;
  if(near) return textOf(near);
  return (input.value||"").trim();
}

function detectDealType(form: HTMLElement): Deal|null {
  const words: Deal[] = ["월세","전세","매매"];
  // select
  for(const s of Array.from(form.querySelectorAll("select"))){
    const opt = (s as HTMLSelectElement).selectedOptions?.[0];
    const t   = (opt?.text||opt?.value||"").trim();
    if(words.includes(t as Deal)) return t as Deal;
  }
  // radio
  for(const r of Array.from(form.querySelectorAll('input[type="radio"]:checked')) as HTMLInputElement[]){
    const t = labelFor(r);
    const hit = words.find(w=> t.includes(w) || r.value === w);
    if(hit) return hit as Deal;
  }
  // data-deal
  for(const b of Array.from(form.querySelectorAll('[data-deal].active,[data-deal][aria-pressed="true"]')) as HTMLElement[]){
    const v=(b.getAttribute("data-deal")||"").trim();
    if(words.includes(v as Deal)) return v as Deal;
    const t=textOf(b); const hit=words.find(w=>t.includes(w));
    if(hit) return hit as Deal;
  }
  return null;
}

function detectBuildingGroup(form: HTMLElement): "APT"|"REDEV"|"RETAIL"|"B"|null {
  const pickText = (): string => {
    for(const s of Array.from(form.querySelectorAll("select"))){
      const opt=(s as HTMLSelectElement).selectedOptions?.[0];
      const t=(opt?.text||opt?.value||"").trim();
      if(t) return t;
    }
    for(const r of Array.from(form.querySelectorAll('input[type="radio"]:checked')) as HTMLInputElement[]){
      const t=labelFor(r);
      if(t) return t;
    }
    return (form.innerText||"").trim();
  };
  const t = pickText();

  // 순서 중요: '상가주택'은 '상가'보다 먼저 매칭
  if (/(상가주택|단독|다가구)/i.test(t)) return "B";
  if (/(빌라|다세대)/i.test(t)) return "B";
  if (/오피스텔/i.test(t)) return "B";
  if (/(상가\/?\s*사무실|사무실|상가\b(?!주택))/i.test(t)) return "RETAIL";
  if (/(재개발|재건축)/i.test(t)) return "REDEV";
  if (/아파트/i.test(t)) return "APT";
  return null;
}

function prefixFor(deal: Deal|null, group: "APT"|"REDEV"|"RETAIL"|"B"|null): Prefix|null {
  if(!group) return null;
  if(group==="APT") return "C";
  if(group==="REDEV") return "J";
  if(group==="RETAIL") return "R";
  if(group==="B"){
    if(deal==="월세") return "BO";
    if(deal==="전세") return "BL";
    if(deal==="매매") return "BM";
    return null;
  }
  return null;
}

async function scanMaxFromListings(prefix: string): Promise<number>{
  try{
    const k=`codes:last:${prefix}`;
    const cached = localStorage.getItem(k);
    if(cached){ const n=parseInt(cached,10); if(Number.isFinite(n)&&n>=0) return n; }
    const res = await fetch("/listings", { credentials:"same-origin" });
    const html = await res.text();
    const re = new RegExp(String.raw`\\b${prefix}-(\\d{4})\\b`, "g");
    let m: RegExpExecArray|null, mx=0;
    while((m = re.exec(html))){
      const n = parseInt(m[1],10);
      if(Number.isFinite(n) && n>mx) mx=n;
    }
    try{ localStorage.setItem(k, String(mx)); }catch{}
    return mx;
  }catch{ return 0; }
}
const pad4 = (n:number)=> n.toString().padStart(4,"0");

export default function CodeNumberLive(){
  const [code, setCode] = React.useState<string>("");
  const [prefix, setPrefix] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");

  React.useEffect(()=>{
    const form = (document.getElementById("listing-new-form") as HTMLElement|null) || (document.querySelector("form") as HTMLElement|null);
    if(!form) return;

    const recompute = async () => {
      const deal = detectDealType(form);
      const grp  = detectBuildingGroup(form);
      const pre  = prefixFor(deal, grp);
      if(!pre){
        setPrefix(""); setCode(""); setNote("거래유형/건물유형을 선택하세요");
        return;
      }
      setPrefix(pre);
      const max = await scanMaxFromListings(pre);
      const next = `${pre}-${pad4(max+1)}`;
      setCode(next); setNote("");

      // hidden input name="code"
      let hid = form.querySelector('input[name="code"]') as HTMLInputElement|null;
      if(!hid){ hid=document.createElement("input"); hid.type="hidden"; hid.name="code"; form.appendChild(hid); }
      hid.value = next;
    };

    // 최초 + 변경 감지
    const on = ()=>recompute();
    recompute();
    form.addEventListener("change", on, true);
    form.addEventListener("input", on, true);
    form.addEventListener("click", on, true);

    // 제출 시 캐시 갱신(다른 탭에서도 재사용)
    const onSubmit = ()=> {
      const m = code.match(/^(.*)-(\\d{4})$/);
      if(m){
        const pre = m[1]; const n=parseInt(m[2],10);
        const k = `codes:last:${pre}`;
        try{
          const old = parseInt(localStorage.getItem(k)||"0",10) || 0;
          if(n>old) localStorage.setItem(k, String(n));
        }catch{}
      }
    };
    form.addEventListener("submit", onSubmit, true);

    return ()=>{
      form.removeEventListener("change", on, true);
      form.removeEventListener("input", on, true);
      form.removeEventListener("click", on, true);
      form.removeEventListener("submit", onSubmit, true);
    };
  },[]);

  return (
    <div className="mb-3">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">코드번호</label>
        <div className="text-lg font-bold">{code ? code : <span className="text-gray-400">—</span>}</div>
        {prefix ? <span className="px-2 py-0.5 text-xs rounded-full border">{prefix}</span> : null}
        {note ? <span className="text-xs text-gray-400">{note}</span> : null}
      </div>
    </div>
  );
}