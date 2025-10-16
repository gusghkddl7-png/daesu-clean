"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { withBase, getClientBaseUrl } from "../../../lib/base";

/** 디버그 라벨 */
const SHOW_DEBUG = true;
/** 1평 → ㎡ */
const P = 3.3058;

/* ===== 타입 ===== */
type Deal = "월세" | "전세" | "매매";
type Listing = {
  _id?: string;
  id?: string;
  createdAt: string;
  agent: string;
  code: string;
  dealType: Deal;
  buildingType: string;
  deposit?: number; // 만원
  rent?: number;    // 만원
  mgmt?: number;    // 만원
  tenantInfo: string;
  address: string;
  addressSub?: string;
  areaM2?: number;
  rooms?: number;
  baths?: number;
  elevator?: "Y" | "N";
  parking?: "가능" | "불가";
  pets?: "가능" | "불가";
  landlord?: string;
  tenant?: string;
  contact1?: string;
  contact2?: string;
  isBiz?: "Y" | "N";
  memo?: string;
  vacant: boolean;
  completed: boolean;
  photos?: { name: string; dataUrl: string }[];
  lat?: number;
  lng?: number;
  floor?: number | string;
  guaranteeInsurance?: "Y" | "N";
};

type BldgBrief = {
  use?: string;
  approvalYmd?: string;
  floors?: string;
  elevators?: string;
  parking?: string;
};

/* ===== 유틸 ===== */
const fmtWon = (v?: number) =>
  v === 0 || typeof v === "number" ? v.toLocaleString("ko-KR") : "-";
const fmtNum = (v?: number) =>
  v === 0 || typeof v === "number" ? v.toLocaleString("ko-KR") : "-";

/** 지오코딩 키(지번까지만) */
const keyOfAddr = (addr: string) =>
  (addr || "")
    .trim()
    .match(/(.+?\d+-?\d*)(?:\s|$)/)?.[1] ?? (addr || "").trim();

/** 지오코딩용 주소 정제(지번까지만) */
function sanitizeAddr(input: string) {
  return keyOfAddr(input || "");
}

const toM2 = (p?: number) => (typeof p === "number" ? p * P : undefined);
function getKakaoKey() {
  const v = process.env.NEXT_PUBLIC_KAKAO_MAPS_APP_KEY;
  return typeof v === "string" && v ? v : undefined;
}

/* ===== Leaflet 로더 (OSM) ===== */
let lfReady: Promise<void> | null = null;
function loadLeaflet() {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).L) return Promise.resolve();
  if (lfReady) return lfReady;
  lfReady = new Promise<void>((res, rej) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("Leaflet load fail"));
    document.head.appendChild(s);
  });
  return lfReady;
}

/* ===== Kakao 로더 (services 포함) ===== */
let kakaoReady: Promise<void> | null = null;
function loadKakao() {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).kakao?.maps) return Promise.resolve();
  if (kakaoReady) return kakaoReady;
  const appkey = getKakaoKey();
  if (!appkey) return Promise.resolve();
  kakaoReady = new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=services`;
    s.async = true;
    s.onload = () => {
      try {
        (window as any).kakao.maps.load(() => res());
      } catch (e) {
        rej(e);
      }
    };
    s.onerror = () => rej(new Error("Kakao SDK load fail"));
    document.head.appendChild(s);
  });
  return kakaoReady;
}

/* ===== 필터 & 버튼 ===== */
type Filters = {
  deals: Set<Deal>;
  priceMin?: number; priceMax?: number;  // 만원
  rentMin?: number;  rentMax?: number;   // 만원
  areaMinM2?: number; areaMaxM2?: number;
  floorType?: "B" | "1" | "UP";
  inMapOnly: boolean;
  wantParking: boolean;
  wantPets: boolean;
  wantGI: boolean;
  rooms: Set<"1" | "2" | "3" | "4+">;
};
const DEFAULT_FILTERS: Filters = {
  deals: new Set<Deal>(["월세", "전세", "매매"]),
  inMapOnly: false,
  wantParking: false,
  wantPets: false,
  wantGI: false,
  rooms: new Set<"1" | "2" | "3" | "4+">(["1", "2", "3", "4+"]),
};

const priceSteps = [500, 1000, 3000, 5000, 10000, 20000, 30000, 40000, 50000, 70000, 100000, 150000, 200000];
const rentSteps  = [10,20,30,40,50,60,70,80,90,100,150,200,250];
const areaStepsP = [10,20,30,40,50];

/** 버튼 텍스트 → 만원 숫자 */
function toMan(s: string) {
  if (s.endsWith("억"))  return parseFloat(s.replace("억",""))*10000;
  if (s.endsWith("천")) return parseFloat(s.replace("천",""))*1000;
  if (s.endsWith("백")) return parseFloat(s.replace("백",""))*100;
  return Number(s);
}
function bucketRange(val: number): [number, number] { return [val, val]; }
function isInRange(v:number, min?:number, max?:number) {
  if (min==null && max==null) return false;
  if (min==null) return v<= (max as number);
  if (max==null) return v>= (min as number);
  return v>=min && v<=max;
}

/* =================================================================== */
/*                               페이지                                */
/* =================================================================== */

export default function ListingsMapPage() {
  const router = useRouter();

  // 데이터
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 지도 제공자
  const [provider, setProvider] = useState<"kakao" | "osm">(
    getKakaoKey() ? "kakao" : "osm"
  );

  // 지도/마커 refs
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const osmMap = useRef<any>(null);
  const kakaoMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const coordsCacheRef = useRef<Record<string, { lat: number; lng: number }>>({});

  // 자동 맞춤 가드
  const fittingRef = useRef(false);

  // 좌측/상태
  const [pins, setPins] = useState(0);
  const [geofail, setGeofail] = useState(0);
  const [selectedKey, setSelectedKey] = useState("");
  const [active, setActive] = useState<Listing | null>(null);

  // 지도 이동 tick
  const [mapTick, setMapTick] = useState(0);

  // 건축물 캐시
  const bldgCache = useRef<Record<string, BldgBrief>>({});

  // 필터
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [filterOpen, setFilterOpen] = useState(false);

  // 범위 지정용 앵커
  const [priceAnchor, setPriceAnchor] = useState<number|null>(null);
  const [rentAnchor,  setRentAnchor]  = useState<number|null>(null);
  const [areaAnchorP, setAreaAnchorP] = useState<number|null>(null);

  /* 목록 로드 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const url = withBase("/api/listings", getClientBaseUrl());
        const r = await fetch(url, { cache: "no-store", credentials: "include" });
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          router.push(`/sign-in?next=${encodeURIComponent("/listings/map")}`);
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const arr = (await r.json()) as Listing[];
        if (alive) setAll(arr);
      } catch (e: any) {
        if (alive) {
          console.error(e);
          setErr("매물 목록 불러오기 실패");
          setAll([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  /* ===== forward geocode: ① Kakao(클라) → ②(옵션) 서버 지오코드 ===== */
  const DISABLE_SERVER =
    String(process.env.NEXT_PUBLIC_DISABLE_SERVER_GEOCODE || "").toLowerCase() === "true";

  async function tryForwardGeocode(addrRaw: string) {
    const key = sanitizeAddr(addrRaw);
    const cached = coordsCacheRef.current[key];
    if (cached) return cached;

    // Kakao services 지오코더를 항상 사용할 수 있도록 로드
    await loadKakao().catch(() => {});
    const KM = (window as any).kakao?.maps;

    // ① 카카오 지오코더
    if (KM?.services) {
      try {
        const geocoder = new KM.services.Geocoder();
        const list: any[] = await new Promise((resolve) => {
          geocoder.addressSearch(key, (result: any[], status: any) => {
            if (status === KM.services.Status.OK) resolve(result);
            else resolve([]);
          });
        });
        const best = list?.[0];
        if (best?.y && best?.x) {
          const res = { lat: Number(best.y), lng: Number(best.x) };
          coordsCacheRef.current[key] = res;
          return res;
        }
      } catch {}
    }

    // ② 서버 지오코드(옵션)
    if (!DISABLE_SERVER) {
      const candidates = [
        `/api/geocode/fwd?query=${encodeURIComponent(key)}`,
        `/api/geocode?query=${encodeURIComponent(key)}`,
        `/api/geocode?q=${encodeURIComponent(key)}`,
      ];
      for (const u of candidates) {
        try {
          const r = await fetch(withBase(u, getClientBaseUrl()), { cache: "no-store" });
          if (!r.ok) continue;
          const j = await r.json().catch(() => null);
          if (!j) continue;
          const lat = j?.lat ?? j?.y ?? j?.result?.lat;
          const lng = j?.lng ?? j?.x ?? j?.result?.lng;
          if (typeof lat === "number" && typeof lng === "number") {
            const res = { lat, lng };
            coordsCacheRef.current[key] = res;
            return res;
          }
        } catch {}
      }
    }

    return null;
  }

  /* 현재 지도 bounds(지도 내만 보기) */
  function getCurrentBounds() {
    const L = (window as any).L;
    const KM = (window as any).kakao?.maps;
    if (provider === "osm" && osmMap.current && L) {
      const b = osmMap.current.getBounds();
      return { contains(lat:number,lng:number){ return b.contains([lat,lng]); } };
    }
    if (provider === "kakao" && kakaoMap.current && KM) {
      const b = kakaoMap.current.getBounds();
      return { contains(lat:number,lng:number){ return b.contains(new KM.LatLng(lat,lng)); } };
    }
    return null;
  }

  /* 필터 적용 */
  const filtered = useMemo(() => {
    const b = filters.inMapOnly ? getCurrentBounds() : null;
    return all.filter((r) => {
      if (!filters.deals.has(r.dealType)) return false;

      if (r.dealType === "월세") {
        if (typeof filters.rentMin === "number" && (r.rent ?? 0) < filters.rentMin) return false;
        if (typeof filters.rentMax === "number" && (r.rent ?? 0) > filters.rentMax) return false;
        if (typeof filters.priceMin === "number" && (r.deposit ?? 0) < filters.priceMin) return false;
        if (typeof filters.priceMax === "number" && (r.deposit ?? 0) > filters.priceMax) return false;
      } else {
        const price = r.deposit ?? 0;
        if (typeof filters.priceMin === "number" && price < filters.priceMin) return false;
        if (typeof filters.priceMax === "number" && price > filters.priceMax) return false;
      }

      if (typeof filters.areaMinM2 === "number" && (r.areaM2 ?? 0) < filters.areaMinM2) return false;
      if (typeof filters.areaMaxM2 === "number" && (r.areaM2 ?? 0) > filters.areaMaxM2) return false;

      // 방 개수
      if (filters.rooms.size) {
        const rm = r.rooms ?? 0;
        const tag = rm >= 4 ? "4+" : (rm <= 0 ? "1" : (String(Math.min(rm, 3)) as "1"|"2"|"3"));
        if (!filters.rooms.has(tag)) return false;
      }

      // 층수
      if (filters.floorType) {
        const f = r.floor;
        if (f !== undefined) {
          const str = String(f);
          const num =
            typeof f === "number" ? f :
            /B|지하/i.test(str) ? -1 :
            parseInt(str.replace(/[^\d-]/g, "") || "0", 10);
          if (filters.floorType === "B" && !(num <= 0)) return false;
          if (filters.floorType === "1" && num !== 1) return false;
          if (filters.floorType === "UP" && !(num >= 2)) return false;
        }
      }

      if (filters.wantParking && r.parking !== "가능") return false;
      if (filters.wantPets && r.pets !== "가능") return false;
      if (filters.wantGI && r.guaranteeInsurance !== "Y") return false;

      if (b) {
        const k = keyOfAddr(r.address || "");
        const c = coordsCacheRef.current[k] || (r.lat!=null && r.lng!=null ? {lat:r.lat,lng:r.lng} : null);
        if (!c) return false;
        if (!b.contains(c.lat, c.lng)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filters, provider, mapTick]);

  /* 건물 단위 그룹 */
  const grouped = useMemo(() => {
    const m = new Map<string,{count:number;items:Listing[]}>();
    for (const r of filtered) {
      const k = keyOfAddr(r.address || "");
      const v = m.get(k) || { count:0, items:[] };
      v.count++; v.items.push(r); m.set(k, v);
    }
    return m;
  }, [filtered]);

  /* 그룹 대표 좌표(중앙값 우선, 없으면 상세주소 지오코드) */
  async function pickGroupCoord(v: { items: Listing[] }): Promise<{lat:number; lng:number}|null> {
    const withCoords = v.items.filter(it => typeof it.lat === "number" && typeof it.lng === "number");
    if (withCoords.length > 0) {
      const lats = withCoords.map(c => c.lat as number).sort((a,b)=>a-b);
      const lngs = withCoords.map(c => c.lng as number).sort((a,b)=>a-b);
      const mid = Math.floor(lats.length/2);
      return { lat: lats[mid], lng: lngs[mid] };
    }
    const prefer = v.items.find(i => i.addressSub && i.addressSub.trim().length>0) ?? v.items[0];
    const q = sanitizeAddr([prefer.address, prefer.addressSub].filter(Boolean).join(" "));
    const g = await tryForwardGeocode(q);
    return g ? { lat: g.lat, lng: g.lng } : null;
  }

  /* 마커 그리기 */
  async function drawMarkers(fit: boolean) {
    setPins(0);
    setGeofail(0);

    // clear
    markersRef.current.forEach((m) => { try { m.setMap ? m.setMap(null) : m.remove(); } catch {} });
    markersRef.current = [];

    const isOSM = provider === "osm";
    const L = (window as any).L;
    const KM = (window as any).kakao?.maps;

    const boundsOSM = isOSM && L ? L.latLngBounds([]) : null;
    const boundsKakao = !isOSM && KM ? new KM.LatLngBounds() : null;

    let made = 0;

    for (const [k,v] of Array.from(grouped.entries())) {
      const picked = await pickGroupCoord(v);
      if (!picked) { setGeofail(x=>x+1); continue; }
      const { lat, lng } = picked;

      const html =
        `<div style="display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 8px;border-radius:99px;`+
        `background:#6F3CF6;color:#fff;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.25);border:1px solid rgba(0,0,0,.18);cursor:pointer">${v.count}</div>`;

      if (isOSM && L && osmMap.current) {
        const icon = L.divIcon({ html, className:"daesu-pin", iconSize:[28,28] });
        const mk = L.marker([lat,lng], { icon, title:k }).addTo(osmMap.current);
        mk.on("click", ()=>{ setSelectedKey(k); setActive(v.items[0] ?? null); });
        markersRef.current.push(mk);
        boundsOSM?.extend([lat,lng]);
      } else if (!isOSM && KM && kakaoMap.current) {
        const pos = new KM.LatLng(lat,lng);

        // DOM 엘리먼트로 전달(문자열 아님)
        const wrap = document.createElement("div");
        wrap.innerHTML = html;
        const el = wrap.firstElementChild as HTMLElement;
        el.style.position = "relative";
        el.style.zIndex = "100000";
        el.addEventListener("click", ()=>{ setSelectedKey(k); setActive(v.items[0] ?? null); });

        const ov = new KM.CustomOverlay({
          position: pos,
          content: el,
          yAnchor: 1,
          clickable: true,
          zIndex: 100000
        });
        ov.setMap(kakaoMap.current);
        markersRef.current.push(ov);

        boundsKakao?.extend(pos);
      }

      setPins(x=>x+1);
      made++;
    }

    if (fit && made>0) {
      if (isOSM && osmMap.current && boundsOSM) {
        try { fittingRef.current = true; osmMap.current.fitBounds(boundsOSM.pad(0.2)); }
        finally { setTimeout(()=>{fittingRef.current=false;},0); }
      }
      if (!isOSM && kakaoMap.current && boundsKakao) {
        fittingRef.current = true;
        kakaoMap.current.setBounds(boundsKakao, 30, 30, 30, 30);
        setTimeout(()=>{fittingRef.current=false;},0);
      }
    }
  }

  /* OSM init */
  useEffect(()=>{
    if(provider!=="osm") return;
    let alive=true;
    (async()=>{
      await loadLeaflet().catch(()=>{});
      if(!alive||!mapRef.current||(window as any).L==null) return;
      const L=(window as any).L;
      if(wrapRef.current){ wrapRef.current.style.height="100vh"; wrapRef.current.style.minHeight="520px"; }
      const map=L.map(mapRef.current,{center:[37.5386,127.1247], zoom:15, zoomControl:true});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20, attribution:"&copy; OpenStreetMap"}).addTo(map);
      osmMap.current=map;

      map.on("moveend",()=>{ if(!fittingRef.current) setMapTick(v=>v+1); });

      await drawMarkers(true);
    })();
    return()=>{ alive=false;
      markersRef.current.forEach(m=>{try{m.remove();}catch{}});
      markersRef.current=[];
      if(osmMap.current){ try{osmMap.current.remove();}catch{}; osmMap.current=null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[provider]);

  /* Kakao init */
  useEffect(()=>{
    if(provider!=="kakao") return;
    let alive=true;
    (async()=>{
      await loadKakao().catch(()=>{});
      const KM=(window as any).kakao?.maps;
      if(!alive||!mapRef.current||!KM) return;
      if(wrapRef.current){ wrapRef.current.style.height="100vh"; wrapRef.current.style.minHeight="520px"; }
      const map=new KM.Map(mapRef.current,{ center:new KM.LatLng(37.5386,127.1247), level:4 });
      kakaoMap.current=map;

      KM.event.addListener(map,"idle",()=>{ if(!fittingRef.current) setMapTick(v=>v+1); });

      await drawMarkers(true);
    })();
    return()=>{ alive=false;
      markersRef.current.forEach(m=>{try{ (window as any).kakao?.maps && m.setMap?.(null);}catch{}});
      markersRef.current=[];
      kakaoMap.current=null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[provider]);

  /* 그룹/필터 변경 시 자동맞춤 1회 */
  useEffect(()=>{ drawMarkers(true); },[grouped]); // eslint-disable-line

  /* 지도 움직임 시 마커만 업데이트 */
  useEffect(()=>{ if(mapTick>0) drawMarkers(false); },[mapTick]); // eslint-disable-line

  /* 선택된 건물의 매물 */
  const selectedItems = useMemo(
    () => (selectedKey ? grouped.get(selectedKey)?.items ?? [] : []),
    [grouped, selectedKey]
  );

  /* 건축물대장 요약 */
  async function getBldgBrief(addr:string):Promise<BldgBrief|null>{
    const key=keyOfAddr(addr); if(!key) return null;
    if(bldgCache.current[key]) return bldgCache.current[key];
    try{
      const url=withBase(`/api/building/brief?addr=${encodeURIComponent(key)}`,getClientBaseUrl());
      const r=await fetch(url,{cache:"no-store"}); if(!r.ok) return null;
      const j=await r.json();
      const brief:BldgBrief={ use:j?.use??j?.mainUse, approvalYmd:j?.approvalYmd??j?.approval, floors:j?.floors??j?.floorInfo, elevators:j?.elevators, parking:j?.parking };
      bldgCache.current[key]=brief; return brief;
    }catch{ return null; }
  }
  const [bldg,setBldg]=useState<BldgBrief|null>(null);
  useEffect(()=>{ setBldg(null); if(!active) return; getBldgBrief(active.address).then(v=>setBldg(v)); },[active]);

  /* 프리셋 텍스트 */
  const priceBtns = ["5백","1천","3천","5천","1억","2억","3억","4억","5억","7억","10억","15억","20억"] as const;
  const rentBtns  = ["10","20","30","40","50","60","70","80","90","100","150","200","250"] as const;
  const areaBtnsP = ["10평","20평","30평","40평","50평","50평~"] as const;

  /* 버튼 공통 로직 */
  function clickPriceButton(label: string) {
    const v = toMan(label); const [bmin,bmax]=bucketRange(v);
    if (!priceAnchor && filters.priceMin===bmin && filters.priceMax===bmax) {
      setFilters(f=>({...f,priceMin:undefined,priceMax:undefined})); setPriceAnchor(null); return;
    }
    if (priceAnchor==null) { setFilters(f=>({...f,priceMin:bmin,priceMax:bmax})); setPriceAnchor(v); }
    else {
      const [smin,smax]=bucketRange(priceAnchor);
      const rangeMin=Math.min(smin,bmin), rangeMax=Math.max(smax,bmax);
      setFilters(f=>({...f,priceMin:rangeMin,priceMax:rangeMax})); setPriceAnchor(null);
    }
  }
  function clickRentButton(label: string) {
    const v = toMan(label); const [bmin,bmax]=bucketRange(v);
    if (!rentAnchor && filters.rentMin===bmin && filters.rentMax===bmax) {
      setFilters(f=>({...f,rentMin:undefined,rentMax:undefined})); setRentAnchor(null); return;
    }
    if (rentAnchor==null) { setFilters(f=>({...f,rentMin:bmin,rentMax:bmax})); setRentAnchor(v); }
    else {
      const [smin,smax]=bucketRange(rentAnchor);
      const rangeMin=Math.min(smin,bmin), rangeMax=Math.max(smax,bmax);
      setFilters(f=>({...f,rentMin:rangeMin,rentMax:rangeMax})); setRentAnchor(null);
    }
  }
  function clickAreaButton(label: string) {
    const open=label.endsWith("~"); const p=parseFloat(label);
    if(open){
      if(!areaAnchorP && filters.areaMinM2===toM2(p) && filters.areaMaxM2==null){
        setFilters(f=>({...f,areaMinM2:undefined,areaMaxM2:undefined})); setAreaAnchorP(null); return;
      }
      setFilters(f=>({...f,areaMinM2:toM2(p),areaMaxM2:undefined})); setAreaAnchorP(null); return;
    }
    const bmin=toM2(p)!, bmax=toM2(p)!;
    if(!areaAnchorP && filters.areaMinM2===bmin && filters.areaMaxM2===bmax){
      setFilters(f=>({...f,areaMinM2:undefined,areaMaxM2:undefined})); setAreaAnchorP(null); return;
    }
    if(areaAnchorP==null){ setFilters(f=>({...f,areaMinM2:bmin,areaMaxM2:bmax})); setAreaAnchorP(p); }
    else{
      const rmin=Math.min(areaAnchorP,p), rmax=Math.max(areaAnchorP,p);
      setFilters(f=>({...f,areaMinM2:toM2(rmin)!,areaMaxM2:toM2(rmax)!})); setAreaAnchorP(null);
    }
  }

  /* 버튼 하이라이트 */
  function priceBtnClass(lbl:string){
    const v=toMan(lbl); const [bmin,bmax]=bucketRange(v);
    const selected=isInRange(bmin,filters.priceMin,filters.priceMax)||isInRange(bmax,filters.priceMin,filters.priceMax);
    const anchor=priceAnchor===v;
    return "px-2 py-1 border rounded "+(selected?"bg-blue-600 text-white":anchor?"ring-2 ring-blue-400":"");
  }
  function rentBtnClass(lbl:string){
    const v=toMan(lbl); const [bmin,bmax]=bucketRange(v);
    const selected=isInRange(bmin,filters.rentMin,filters.rentMax)||isInRange(bmax,filters.rentMin,filters.rentMax);
    const anchor=rentAnchor===v;
    return "px-2 py-1 border rounded "+(selected?"bg-blue-600 text-white":anchor?"ring-2 ring-blue-400":"");
  }
  function areaBtnClass(lbl:string){
    if(lbl.endsWith("~")){
      const p=parseFloat(lbl);
      const selected=(filters.areaMinM2!=null && filters.areaMaxM2==null && Math.abs((filters.areaMinM2 ?? 0)-(toM2(p) ?? 0))<0.001);
      return "px-2 py-1 border rounded "+(selected?"bg-blue-600 text-white":"");
    }
    const p=parseFloat(lbl); const bmin=toM2(p)!, bmax=toM2(p)!;
    const selected=(filters.areaMinM2!=null && filters.areaMaxM2!=null &&
      !(bmax < (filters.areaMinM2||-Infinity) || bmin > (filters.areaMaxM2||Infinity)));
    const anchor=areaAnchorP===p;
    return "px-2 py-1 border rounded "+(selected?"bg-blue-600 text-white":anchor?"ring-2 ring-blue-400":"");
  }

  /* =================================================================== */
  /*                                렌더                                 */
  /* =================================================================== */
  return (
    <div className="w-full flex" ref={wrapRef} style={{ height: "100vh" }}>
      {/* 왼쪽 패널 */}
      <aside className="w-[360px] max-w-[45%] h-full bg-white border-r flex flex-col">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 border rounded" onClick={() => history.back()}>←</button>
            <div className="font-semibold">매물지도</div>
          </div>
          <button className="px-2 py-1 border rounded" onClick={() => (location.href = "/listings")}>목록</button>
        </div>

        <div className="p-3 border-b text-xs text-gray-600 space-y-2">
          <div className="flex items-center gap-2">
            <span>베이스:</span>
            <button
              className={"px-2 py-1 border rounded "+(provider==="osm"?"bg-indigo-600 text-white":"bg-white")}
              onClick={()=>{ setProvider("osm"); setSelectedKey(""); setActive(null); }}>
              OSM(기본)
            </button>
            <button
              className={"px-2 py-1 border rounded "+(provider==="kakao"?"bg-amber-600 text-white":"bg-white")}
              onClick={()=>{ if(getKakaoKey()){ setProvider("kakao"); setSelectedKey(""); setActive(null);} }}
              disabled={!getKakaoKey()} title={getKakaoKey()? "카카오(최신 건물/POI)" : "키 없음"}>
              카카오(최신)
            </button>
          </div>

          <div>{loading ? "불러오는 중…" : `전체 ${filtered.length}건`}{err && <span className="text-red-600 ml-2">{err}</span>}</div>
          {SHOW_DEBUG && <div>선택: {selectedKey || "-"}</div>}
          {SHOW_DEBUG && <div>표시 pins: {pins} · 지오코딩 실패: {geofail}</div>}
          <div className="text-gray-500">※ 핀(보라 숫자)을 누르면 해당 건물의 매물 리스트가 나타납니다.</div>
        </div>

        {!selectedKey && <div className="p-4 text-sm text-gray-500">지도의 보라색 숫자(건물 단위)를 클릭하면 매물을 볼 수 있어요.</div>}

        {selectedKey && (
          <div className="flex-1 overflow-auto">
            <div className="p-2 border-b bg-indigo-50 text-sm font-medium">
              {selectedKey} <span className="text-gray-500">· {(grouped.get(selectedKey)?.count) ?? 0}건</span>
            </div>
            <div className="divide-y">
              {selectedItems.map((r)=>(
                <button key={(r as any)._id ?? r.id}
                  className={"w-full text-left p-3 hover:bg-gray-50 "+(active && ((active as any)._id??active.id)===((r as any)._id??r.id) ? "bg-indigo-50" : "")}
                  onClick={()=> setActive(r)}>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 shrink-0">
                      {r.photos?.[0]?.dataUrl ? <img src={r.photos[0].dataUrl} alt="" className="w-full h-full object-cover"/> :
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">사진없음</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {r.dealType} · {fmtWon(r.deposit)}
                        {r.dealType==="월세"&&r.rent!=null? <> / {fmtWon(r.rent)}</> : null}
                        <span className="text-xs text-gray-500 ml-2">{r.code}</span>
                      </div>
                      <div className="text-xs text-gray-700 truncate">
                        {r.buildingType || "-"} · {fmtNum(r.areaM2)}㎡ · {r.rooms ?? "-"}룸 / {r.baths ?? "-"}욕실 · {r.tenantInfo || "-"}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">{r.address}{r.addressSub? ` · ${r.addressSub}`:""}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* 지도 + 상세검색 */}
      <section className="flex-1 relative" style={{background:"#f8fafc"}}>
        <div ref={mapRef} style={{position:"absolute", inset:0}} />

        {/* 상세검색 박스 */}
        <div className="absolute left-3 top-3 z-[600]">
          <button className="px-3 py-1 rounded border bg-white shadow text-sm font-medium"
            onClick={()=> setFilterOpen(v=>!v)}>{filterOpen? "상세검색 닫기":"상세검색"}</button>

          {filterOpen && (
            <div className="mt-2 w-[360px] max-w-[90vw] bg-white border rounded shadow-lg p-3 text-sm space-y-3">
              {/* 거래방식 */}
              <div>
                <div className="font-semibold mb-1">거래방식</div>
                {(["매매","전세","월세"] as Deal[]).map((d)=>(
                  <label key={d} className="mr-3 inline-flex items-center gap-1">
                    <input type="checkbox" checked={filters.deals.has(d)}
                      onChange={(e)=> setFilters(f=>{ const s=new Set(f.deals); e.target.checked? s.add(d):s.delete(d); return {...f,deals:s}; })}/>
                    {d}
                  </label>
                ))}
                <label className="ml-4 inline-flex items-center gap-1">
                  <input type="checkbox" checked={filters.inMapOnly}
                    onChange={(e)=> setFilters(f=>({...f,inMapOnly:e.target.checked}))}/>
                  지도 내만
                </label>
              </div>

              {/* 가격대 */}
              <div>
                <div className="font-semibold mb-1">가격대 (매매/전세/보증금 · 만원)</div>
                <div className="flex flex-wrap gap-1">
                  {priceBtns.map((t)=>(
                    <button key={t} className={priceBtnClass(t)} onClick={()=>clickPriceButton(t)}>{t}</button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input className="w-36 px-2 py-1 border rounded" placeholder="최소(만원)"
                    value={filters.priceMin??""} onChange={e=>setFilters(f=>({...f,priceMin:e.target.value?Number(e.target.value):undefined}))}/>
                  <span>~</span>
                  <input className="w-36 px-2 py-1 border rounded" placeholder="최대(만원)"
                    value={filters.priceMax??""} onChange={e=>setFilters(f=>({...f,priceMax:e.target.value?Number(e.target.value):undefined}))}/>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">버튼을 두 번 클릭 시 구간 지정(처음~끝). 동일 버튼 2회 클릭 시 해제.</div>
              </div>

              {/* 월세 */}
              <div>
                <div className="font-semibold mb-1">월세 (만원)</div>
                <div className="flex flex-wrap gap-1">
                  {rentBtns.map((t)=>(
                    <button key={t} className={rentBtnClass(t)} onClick={()=>clickRentButton(t)}>{t}</button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input className="w-28 px-2 py-1 border rounded" placeholder="최소(만원)"
                    value={filters.rentMin??""} onChange={e=>setFilters(f=>({...f,rentMin:e.target.value?Number(e.target.value):undefined}))}/>
                  <span>~</span>
                  <input className="w-28 px-2 py-1 border rounded" placeholder="최대(만원)"
                    value={filters.rentMax??""} onChange={e=>setFilters(f=>({...f,rentMax:e.target.value?Number(e.target.value):undefined}))}/>
                </div>
              </div>

              {/* 면적 */}
              <div>
                <div className="font-semibold mb-1">면적 (평)</div>
                <div className="flex flex-wrap gap-1">
                  {areaBtnsP.map((t)=>(
                    <button key={t} className={areaBtnClass(t)} onClick={()=>clickAreaButton(t)}>{t}</button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input className="w-24 px-2 py-1 border rounded" placeholder="최소(평)"
                    onChange={e=>setFilters(f=>({...f,areaMinM2:e.target.value?toM2(Number(e.target.value)):undefined}))}/>
                  <span>~</span>
                  <input className="w-24 px-2 py-1 border rounded" placeholder="최대(평)"
                    onChange={e=>setFilters(f=>({...f,areaMaxM2:e.target.value?toM2(Number(e.target.value)):undefined}))}/>
                </div>
              </div>

              {/* 층수 */}
              <div>
                <div className="font-semibold mb-1">층수</div>
                <div className="flex flex-wrap gap-2">
                  {[{k:"B",t:"지층"},{k:"1",t:"1층"},{k:"UP",t:"지상층(1층 제외)"}].map(({k,t})=>(
                    <label key={k} className="inline-flex items-center gap-1">
                      <input type="radio" name="floorType" checked={filters.floorType===(k as any)}
                        onChange={()=>setFilters(f=>({...f,floorType:k as Filters["floorType"]}))}/>
                      {t}
                    </label>
                  ))}
                  <label className="inline-flex items-center gap-1 ml-2">
                    <input type="radio" name="floorType" checked={!filters.floorType}
                      onChange={()=>setFilters(f=>({...f,floorType:undefined}))}/> 전체
                  </label>
                </div>
              </div>

              {/* 방 개수 */}
              <div>
                <div className="font-semibold mb-1">방 개수</div>
                {(["1","2","3","4+"] as const).map((k)=>(
                  <label key={k} className="mr-3 inline-flex items-center gap-1">
                    <input type="checkbox" checked={filters.rooms.has(k)}
                      onChange={(e)=> setFilters(f=>{ const s=new Set(f.rooms); e.target.checked? s.add(k):s.delete(k); return {...f, rooms:s}; })}/>
                    {k==="4+"? "4개 이상": `${k}개`}
                  </label>
                ))}
              </div>

              {/* 기타옵션 */}
              <div>
                <div className="font-semibold mb-1">기타옵션</div>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={filters.wantParking} onChange={e=>setFilters(f=>({...f,wantParking:e.target.checked}))}/>주차가능</label>
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={filters.wantPets} onChange={e=>setFilters(f=>({...f,wantPets:e.target.checked}))}/>반려동물가능</label>
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={filters.wantGI} onChange={e=>setFilters(f=>({...f,wantGI:e.target.checked}))}/>보증보험가능</label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button className="px-3 py-1 border rounded"
                  onClick={()=>{ setFilters({...DEFAULT_FILTERS, deals:new Set(filters.deals)}); setPriceAnchor(null); setRentAnchor(null); setAreaAnchorP(null); }}>
                  가격/면적 초기화
                </button>
                <button className="px-3 py-1 border rounded"
                  onClick={()=>{ setFilters({...DEFAULT_FILTERS}); setPriceAnchor(null); setRentAnchor(null); setAreaAnchorP(null); }}>
                  전체 초기화
                </button>
                <div className="text-[11px] text-gray-500 ml-auto">버튼 두 번으로 구간 지정 · 같은 버튼 두 번은 해제</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 상세 패널(오른쪽) */}
      <div className={"absolute right-0 top-0 h-full w-[520px] max-w-[90%] bg-white border-l shadow-xl transition-transform duration-300 "+(active? "translate-x-0":"translate-x-full")} style={{ zIndex: 500 }}>
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold">매물 상세</div>
          <button className="px-2 py-1 border rounded" onClick={()=> setActive(null)}>닫기</button>
        </div>

        {!active ? (
          <div className="p-4 text-sm text-gray-500">왼쪽 목록에서 매물을 선택하세요.</div>
        ) : (
          <div className="h-[calc(100%-49px)] overflow-auto">
            <div className="w-full aspect-video bg-black/5">
              {active.photos?.length ? (
                <img src={active.photos[0].dataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">등록된 사진이 없습니다</div>
              )}
            </div>

            <div className="p-4 border-b">
              <div className="text-lg font-bold">
                {active.dealType} · {fmtWon(active.deposit)}
                {active.dealType==="월세" && active.rent!=null ? <> / {fmtWon(active.rent)}</> : null}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {active.address}{active.addressSub? ` · ${active.addressSub}`:""}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                코드 {active.code} · {active.buildingType || "-"} · {fmtNum(active.areaM2)}㎡ · {active.rooms ?? "-"}룸 / {active.baths ?? "-"}욕실
              </div>
            </div>

            <div className="p-4">
              <table className="w-full text-sm">
                <tbody className="[&_tr]:border-b [&_td]:py-2">
                  <tr><td className="w-36 text-gray-500">건축물 용도</td><td>{active.buildingType || "-"}</td></tr>
                  <tr><td className="text-gray-500">면적(㎡)</td><td>{fmtNum(active.areaM2)}</td></tr>
                  <tr><td className="text-gray-500">엘리베이터</td><td>{active.elevator ?? "-"}</td></tr>
                  <tr><td className="text-gray-500">주차</td><td>{active.parking ?? "-"}</td></tr>
                  <tr><td className="text-gray-500">반려동물</td><td>{active.pets ?? "-"}</td></tr>
                  <tr><td className="text-gray-500">관리비(만원)</td><td>{fmtWon(active.mgmt)}</td></tr>
                  <tr><td className="text-gray-500">임차인 정보</td><td>{active.tenantInfo || "-"}</td></tr>
                  <tr><td className="text-gray-500">연락처</td><td>{active.contact1 || active.contact2 || "-"}</td></tr>
                  <tr><td className="text-gray-500">사업자 여부</td><td>{active.isBiz ?? "-"}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t">
              <div className="text-sm font-semibold mb-2">설명</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{active.memo || "-"}</div>
            </div>

            <div className="p-4 border-t">
              <div className="text-sm font-semibold mb-2">건축물대장(요약)</div>
              {!bldg ? (
                <div className="text-sm text-gray-500">조회 중… (키가 없거나 응답이 없으면 자동 생략)</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="[&_tr]:border-b [&_td]:py-2">
                    <tr><td className="w-36 text-gray-500">주용도</td><td>{bldg.use || "-"}</td></tr>
                    <tr><td className="text-gray-500">사용승인일</td><td>{bldg.approvalYmd || "-"}</td></tr>
                    <tr><td className="text-gray-500">층수</td><td>{bldg.floors || "-"}</td></tr>
                    <tr><td className="text-gray-500">승강기</td><td>{bldg.elevators || "-"}</td></tr>
                    <tr><td className="text-gray-500">주차</td><td>{bldg.parking || "-"}</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
