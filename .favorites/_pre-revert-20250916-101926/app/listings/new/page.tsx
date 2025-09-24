'use client';
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
function NumericInput2(props: { value?: string | number; onValue: (v: string) => void; maxLen?: number; className?: string; placeholder?: string; name?: string }) {
  const { value, onValue, maxLen, className, placeholder, name } = props;
  const [draft, setDraft] = useState<string>(() => (value ?? '') as string);
/* disabled top-level */ useEffect(() => { const v = (value ?? '') as string; if (v !== draft) setDraft(v); }, [value]);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (maxLen) v = v.slice(0, maxLen);
    setDraft(v);
    try { onValue(v); } catch {}
};
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="\\d*"
      name={name}
      value={draft}
      onChange={onChange}
      placeholder={placeholder}
      className={"border rounded px-2 h-9 text-sm w-full " + (className || "")}
    />
  );
}

/** ========= IME(??? ???놁졑?? ???깆쓧 ????????놁졑 ??ルㅏ堉?========= */
function useComposeFlag() {
  const composing = useRef(false);
  const onCompositionStart = () => { composing.current = true; };
  const onCompositionEnd = () => { composing.current = false; };
  return { composing, onCompositionStart, onCompositionEnd };
}

type NumProps = {
  value: string;
  onValue: (v: string) => void;
  maxLen?: number;
  className?: string;
  placeholder?: string;
  name?: string;
};
function NumericInput({ value, onValue, maxLen, className, placeholder, name }: NumProps) {
  const { composing, onCompositionStart, onCompositionEnd } = useComposeFlag();
  const [draft, setDraft] = useState(value);
/* disabled top-level */ useEffect(() => { if (value !== draft) setDraft(value); }, [value]);

  const sanitize = (s: string) => {
    const v = s.replace(/\D/g, "");
    return typeof maxLen === "number" ? v.slice(0, maxLen) : v;
  };

  return (
    <input
      name={name}
      inputMode="numeric"
      className={"border rounded px-3 h-10 text-sm w-full " + (className || "")}
      placeholder={placeholder}
      value={draft}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={(e) => {
        onCompositionEnd();
        const v = sanitize((e.currentTarget as HTMLInputElement).value);
        setDraft(v);
        onValue(v);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (composing.current) setDraft(raw);
        else {
          const v = sanitize(raw);
          setDraft(v);
          onValue(v);
        }
      }}
      onBlur={(e) => {
        const v = sanitize(e.currentTarget.value);
        setDraft(v);
        onValue(v);
      }}
    />
  );
}

type DecProps = Omit<NumProps, "maxLen">;
function DecimalInput({ value, onValue, className, placeholder, name }: DecProps) {
  const { composing, onCompositionStart, onCompositionEnd } = useComposeFlag();
  const [draft, setDraft] = useState(value);
/* disabled top-level */ useEffect(() => { if (value !== draft) setDraft(value); }, [value]);

  const sanitize = (s: string) => {
    let v = s.replace(/[^0-9.]/g, "");
    const i = v.indexOf(".");
    if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
    return v;
  };

  return (
    <input
      name={name}
      inputMode="decimal"
      className={"border rounded px-3 h-10 text-sm w-full " + (className || "")}
      placeholder={placeholder}
      value={draft}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={(e) => {
        onCompositionEnd();
        const v = sanitize((e.currentTarget as HTMLInputElement).value);
        setDraft(v);
        onValue(v);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (composing.current) setDraft(raw);
        else {
          const v = sanitize(raw);
          setDraft(v);
          onValue(v);
        }
      }}
      onBlur={(e) => {
        const v = sanitize(e.currentTarget.value);
        setDraft(v);
        onValue(v);
      }}
    />
  );
}
/** ===================================================== */

type Deal = string;
const BT_CATS = [
  "?熬곥굥???,"???덈룛???댟?,"???살┫/?????????낅슣?쎿틦?","????????⑥돪??","???/??甸??,"???뚯궘爾????대떵鍮?,
] as const;
type BtCat = typeof BT_CATS[number];

type Form = {
  dealType: Deal | "";
  buildingType: BtCat | "";

  // ?낅슣???濾곌쑬?囹?
  addressJibeon: string; // 嶺뚯솘????낅슣???(??ルㅎ臾?
  floor: string;         // 嶺?
  unit: string;          // ?筌뤾쑬堉? ???怨뺣뼺?!
  availableDate: string;
  availableNegotiable: boolean;
  vacant: boolean;
  elevator: boolean;
  parking: boolean;
  pets: boolean;

  // ?ル?녽뇡?
  deposit: string;   // 嶺뚮씭???
  rent: string;      // 嶺뚮씭???
  mgmt: string;      // 嶺뚮씭???
  mgmtItems: string; // ??㉱?洹먮맪?????????

  // 嶺뚮∥?????뚮벣??
  areaM2: string; // ?????
  rooms: string;
  baths: string;
  loft: boolean;  // ?곌랜踰딉쭕?

  // ?リ옇??/??類ㅼ쾼
  lh: boolean; sh: boolean; hug: boolean; hf: boolean; isBiz: boolean; airbnb: boolean;

  // ??⑤벡逾?嶺뚮∥???
  landlordName: string; landlordPhone: string;
  tenantName: string;   tenantPhone: string;
  memo: string;

  code?: string;};

const initForm: Form = {
  dealType: "", buildingType: "",
  addressJibeon: "", floor: "", unit: "", availableDate: "", availableNegotiable: false, vacant: false,
  elevator: false, parking: false, pets: false,
  deposit: "", rent: "", mgmt: "", mgmtItems: "",
  areaM2: "", rooms: "", baths: "", loft: false,
  lh: false, sh: false, hug: false, hf: false, isBiz: false, airbnb: false,
  landlordName: "", landlordPhone: "", tenantName: "", tenantPhone: "", memo: "",
};

const toPyeong = (m2: number) => (m2 > 0 ? (m2 / 3.3058) : 0);

export default function NewListingPage() {  const router = useRouter();
  const [saving, setSaving] = useState(false);
// injected: guards
const [f, setF] = useState<Form>(initForm);
  // keep code value if other inputs re-render
  useEffect(() => {
    try {
      const st = (window as any).__ac_last;
      if (!f?.code && st?.code) setF((p:any)=>({ ...p, code: st.code }));
    } catch {}
  }, [f?.code]);
  
  // === injected: ?袁⑤?獄?쓧由??녾퉰 ???吏???諛댁뎽(??⑤객臾???μ쪠?? + ??戮깅?????ｋ걞??===
  useEffect(() => {
    const deal = f?.dealType as string | undefined;
    const bt   = f?.buildingType as string | undefined;
    if (!deal || !bt) return;

    const pre =
      bt==="?熬곥굥??? ? "C" :
      bt==="???뚯궘爾????대떵鍮? ? "J" :
      bt==="???/??甸?? ? "R" :
      deal==="??븐슙?? ? "BO" :
      deal==="?熬곣뫕?? ? "BL" : "BM";

    try {
      const counters = JSON.parse(localStorage.getItem("codeCounters")||"{}");
      const usedArr  = JSON.parse(localStorage.getItem("usedCodes")||"[]");
      const used = new Set<string>(usedArr);
      let next = (counters[pre] || 0) + 1;
      let code = `${pre}-${String(next).padStart(4,"0")}`;
      let guard=0; while(used.has(code) && guard++<10000){ next++; code = `${pre}-${String(next).padStart(4,"0")}`; }
      if (f.code !== code) set("code", code);
      (window as any).__ac_last = { pre, next, code };
    } catch {}
  }, [f?.dealType, f?.buildingType]);

  useEffect(() => {
    const form = document.querySelector("form");
    const onSubmit = () => {
      const st = (window as any).__ac_last; if (!st?.pre || !st?.next || !st?.code) return;
      try{
        const counters = JSON.parse(localStorage.getItem("codeCounters")||"{}");
        const usedArr  = JSON.parse(localStorage.getItem("usedCodes")||"[]");
        counters[st.pre] = Math.max(counters[st.pre] || 0, st.next);
        if (!usedArr.includes(st.code)) usedArr.push(st.code);
        localStorage.setItem("codeCounters", JSON.stringify(counters));
        localStorage.setItem("usedCodes", JSON.stringify(usedArr));
      }catch{}
    );
    form?.addEventListener("submit", onSubmit);
    return () => form?.removeEventListener("submit", onSubmit);
  }, []);
  const [files, setFiles] = useState<File[]>([]);
  const draftKey = "listing-form-draft";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setF({ ...initForm, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(s => ({ ...s, [k]: v }));

  const pyeong = useMemo(() => {
    const m2 = parseFloat(f.areaM2 || "0");
    const p = toPyeong(m2);
    return isNaN(p) ? 0 : p;
  }, [f.areaM2]);
/* disabled: legacy hook */
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!f.dealType) e.dealType = "濾곌쑨????ル쪇援????ルㅎ臾??琉얠돪??";
    if (!f.buildingType) e.buildingType = "濾곌쑬?囹??ル쪇援????ルㅎ臾??琉얠돪??";

    // ?낅슣???嶺뚯솘??? = ?熬곣뫖???熬곣뫀六? (?띠룆??????깅굵 ???異??筌먦끇六?嶺뚳퐢?얍칰?
    if (f.addressJibeon && !/??s*\d+\-\d+/.test(f.addressJibeon)) {
      e.addressJibeon = "嶺뚯솘????筌먦끇六??怨쀬Ŧ ???놁졑??琉얠돪?? ?? 嶺뚳퐣裕???166-21";
    }

    const dep = Number(f.deposit || "0");
    const rent = Number(f.rent || "0");
    if (f.dealType === "??븐슙??) {
      if (!dep) e.deposit = "?곌랜?삣폑?룸Ь?嶺뚮씭????? ?熬곣뫖????낅퉵??";
      if (!rent) e.rent = "??븐슙??嶺뚮씭????? ?熬곣뫖????낅퉵??";
    } else if (f.dealType === "?熬곣뫕?? || f.dealType === "嶺뚮씞???) {
      if (!dep) e.deposit = (f.dealType === "?熬곣뫕?? ? "?熬곣뫕??뼨?嶺뚮씭???" : "嶺뚮씞??蹂잛쾸?(嶺뚮씭???") + "???熬곣뫖????낅퉵??";
    }
    if (f.areaM2 && !/^\d+(\.\d+)?$/.test(f.areaM2)) e.areaM2 = "????????裕?????얍슖????놁졑??琉얠돪?? ?? 44.2";
    return e;
  }, [f]);

  const hasError = Object.keys(errors).length > 0;

  const saveDraft = () => {
    try { localStorage.setItem(draftKey, JSON.stringify(f)); alert("?熬곣뫖六?????熬곣뫁??"); }
    catch { alert("?熬곣뫖六???????덉넮: ???鰲??泥롨쥈?밸굵 ?筌먦끉逾??琉얠돪??"); }
  );

  const clearForm = () => { setF(initForm); setFiles([]); 
  setSaving(false); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasError) { alert("?熬곣뫖?????????????筌먦끉逾??怨삵룖?筌뤾쑴??"); return; }
    setSaving(true);
    try {
      const landlordLabel = f.landlordName?.trim() || "?熬???;
      const tenantLabel   = f.tenantName?.trim()   || "?熬곣뫕而??;
      const payload = { ...f, landlordLabel, tenantLabel, files: files.map(x => ({ name: x.name, size: x.size })) };
      console.log("SUBMIT NEW LISTING", payload);
      localStorage.removeItem(draftKey);
      alert("?????熬곣뫁????⑤틳嫄?.");
      router.push("/listings");
    } finally { setSaving(false); }
  );

  const L = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs font-medium text-gray-600 mb-1 block">{children}</label>
  );
  const Input = (props: any) => (
    <input {...props} className={"border rounded px-3 h-10 text-sm w-full " + (props.className || "")} />
  );
  const Textarea = (props: any) => (
    <textarea {...props} className={"border rounded px-3 py-2 text-sm w-full min-h-[90px] " + (props.className || "")} />
  );
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="rounded-xl border bg-white">
      <div className="px-5 py-3 border-b"><h3 className="text-sm font-semibold">{title}</h3></div>
      <div className="p-5">{children}</div>
    </section>
  );
  const ToggleBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick}
      className={"px-3 h-10 rounded-full border text-sm " + (active ? "bg-black text-white" : "bg-white hover:bg-gray-50")}>
      {children}
    </button>
  );
};
  return (
    <main className="w-full mx-auto max-w-[1400px] md:max-w-[1500px] px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <button className="px-3 py-2 border rounded-lg hover:bg-gray-50" onClick={() => router.push("/listings")}>??嶺뚮ㅄ維뽨빳??怨쀬Ŧ</button>
        <h1 className="text-2xl md:text-3xl font-bold">嶺뚮씞?뉒ず ?繹먮굞夷?/h1>
        <div className="w-[110px]"></div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* ?リ옇???/ 濾곌쑨???*/}
        <Section title={
  <div className="flex items-center gap-2">
    ?リ옇???/ 濾곌쑨???
    <span className="flex items-center gap-2 ml-2">
      <input
        name="code"
        placeholder="?袁⑤?獄?쓧由??녾퉰"
        className="border rounded px-2 h-8 text-xs w-40"
        value={f.code || ""}
        onChange={(e)= tabIndex={-1}>set("code", (e.target as HTMLInputElement).value)}
        readOnly
      />
      <button type="button" className="border px-2 py-1 rounded text-[11px]"
        onClick={()=>{
          const el = document.querySelector('input[name="code"]') as HTMLInputElement | null;
          if (!el) return;
          if (el.readOnly) { el.readOnly = false; (el as any).dataset.locked="0"; el.focus(); }
          else { el.readOnly = true; (el as any).dataset.locked="1"; }
        }}>??瑜곸젧</button>
      <span className="text-[11px] text-gray-400">濾곌쑬?囹??ル쪇援???ルㅎ臾?????吏???놁졑</span>
    </span>
  </div>
}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <L>濾곌쑨????ル쪇援?*</L>
              <div className="flex gap-2">
                {(["??븐슙??,"?熬곣뫕??,"嶺뚮씞???] as Deal[]).map(d => (
                  <ToggleBtn key={d} active={f.dealType===d} onClick={() => set("dealType", f.dealType===d ? "" : d)}>{d}</ToggleBtn>
                ))}
              </div>
              {errors.dealType && <p className="text-xs text-red-600 mt-1">{errors.dealType}</p>}
            </div>
            <div className="md:col-span-3">
              <L>濾곌쑬?囹??ル쪇援?*</L>
              <div className="flex flex-wrap gap-2">
                {BT_CATS.map(c => (
                  <ToggleBtn key={c} active={f.buildingType===c} onClick={() => set("buildingType", f.buildingType===c ? "" : c)}>{c}</ToggleBtn>
                ))}
              </div>
              {errors.buildingType && <p className="text-xs text-red-600 mt-1">{errors.buildingType}</p>}
            </div>
          </div>
        </Section>

        {/* ?ル?녽뇡?*/}
        <Section title="?ル?녽뇡?>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <L>{f.dealType==="嶺뚮씞??? ? "嶺뚮씞??蹂잛쾸?(嶺뚮씭??? *" : f.dealType==="?熬곣뫕?? ? "?熬곣뫕??뼨?嶺뚮씭??? *" : "?곌랜?삣폑?룸Ь?嶺뚮씭??? *"}</L>
              <NumericInput2 value={f.deposit} onValue={(v)=>set("deposit", v)} placeholder="?? 1000" />
              {errors.deposit && <p className="text-xs text-red-600 mt-1">{errors.deposit}</p>}
            </div>
            <div className="md:col-span-2">
              <L>??븐슙??嶺뚮씭???{f.dealType==="??븐슙?? ? " *" : ""}</L>
              <NumericInput2 value={f.rent} onValue={(v)=>set("rent", v)} placeholder={f.dealType==="??븐슙?? ? "?熬곣뫖?? : "??븐슙????ルㅎ臾??????놁졑"} />
              {errors.rent && <p className="text-xs text-red-600 mt-1">{errors.rent}</p>}
            </div>
            <div className="md:col-span-1">
              <L>??㉱?洹먮맪??嶺뚮씭???</L>
              <NumericInput2 value={f.mgmt} onValue={(v)=>set("mgmt", v)} placeholder="?? 7" />
            </div>
            <div className="md:col-span-3">
              <L>??㉱?洹먮맪?????????/L>
              <Input value={f.mgmtItems} onChange={(e:any)=>set("mgmtItems", e.target.value)} placeholder="?? ??濡レ┣, ?筌뤿굛??? 嶺???ㅻ쑏? />
            </div>
          </div>
        </Section>

        {/* ?낅슣???/ 濾곌쑬?囹?*/}
        <Section title="?낅슣???/ 濾곌쑬?囹?>
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <L>?낅슣???嶺뚯솘???</L>
                  <span className="text-[11px] text-gray-500">* 嶺뚯솘??뺢퀡?꾢퐲????놁졑(?熬곣뫁夷?춯???⑤㈇??썒??닔????戮곕뇶)</span>
                </div>
                <Input
                  value={f.addressJibeon}
                  onChange={(e:any)=>set("addressJibeon", e.target.value)}
                  placeholder="?? 嶺뚳퐣裕???166-21"
                  className="w-[220px]"
                />
                {errors.addressJibeon && <p className="text-xs text-red-600 mt-1">{errors.addressJibeon}</p>}
              </div>

              {/* 嶺??筌뤾쑬堉? ???곸궠梨???뿉??釉뚯뫊??*/}
              <div className="flex flex-col">
                <L>嶺?/L>
                <Input
                  value={f.floor}
                  onChange={(e:any)=>set("floor", e.target.value)}
                  placeholder="?? 3F"
                  className="w-[120px]"
                />
              </div>
              <div className="flex flex-col">
                <L>?筌뤾쑬堉?/L>
                <Input
                  value={f.unit}
                  onChange={(e:any)=>set("unit", e.target.value)}
                  placeholder="?? 301??
                  className="w-[120px]"
                />
              </div>

              <div className="flex flex-col">
                <L>???낇룖?띠럾?????/L>
                <div className="flex items-center gap-2">
                  <Input type="date" value={f.availableDate} onChange={(e:any)=>set("availableDate", e.target.value)} className="w-[180px]" />
                  <label className="inline-flex items-center gap-2 select-none">
                    <input type="checkbox" className="w-4 h-4" checked={f.availableNegotiable} onChange={(e)=>set("availableNegotiable", e.target.checked)} />
                    <span className="text-sm text-gray-700">??얜?踰ζ뤆?쎛??/span>
                  </label>
                </div>
              </div>

              <div className="pb-0.5">
                <L>&nbsp;</L>
                <label className="inline-flex items-center gap-2 select-none h-10">
                  <input type="checkbox" className="w-4 h-4" checked={f.vacant} onChange={(e)=>set("vacant", e.target.checked)} />
                  <span className="text-sm text-gray-700">??ㅻ쾴??/span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.elevator} onChange={(e)=>set("elevator", e.target.checked)} />
                <span className="text-sm text-gray-700">??濡〓뉴?뺢퀣伊??????깅쾳</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.parking} onChange={(e)=>set("parking", e.target.checked)} />
                <span className="text-sm text-gray-700">?낅슣?섇첎??띠럾???/span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.pets} onChange={(e)=>set("pets", e.target.checked)} />
                <span className="text-sm text-gray-700">?꾩룇瑗??????띠럾???/span>
              </label>
            </div>
          </div>
        </Section>

        {/* 嶺뚮∥???/ ??뚮벣??*/}
        <Section title="嶺뚮∥???/ ??뚮벣??>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <L>?熬곣뫗?좂춯濡ル샍????</L>
              <DecimalInput value={f.areaM2} onValue={(v)=>set("areaM2", v)} placeholder="?? 44.2" />
              {errors.areaM2 && <p className="text-xs text-red-600 mt-1">{errors.areaM2}</p>}
              <div className="text-xs text-gray-500 mt-1">? {pyeong.toFixed(2)} ??/div>
            </div>
            <div>
              <L>????</L>
              <NumericInput2 value={f.rooms} onValue={(v)=>set("rooms", v)} maxLen={2} placeholder="?? 1" />
            </div>
            <div>
              <L>?筌먦끇堉???</L>
              <NumericInput2 value={f.baths} onValue={(v)=>set("baths", v)} maxLen={2} placeholder="?? 1" />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.loft} onChange={(e)=>set("loft", e.target.checked)} />
                <span className="text-sm text-gray-700">?곌랜踰딉쭕????</span>
              </label>
            </div>
          </div>
        </Section>

        {/* ?リ옇?? / ??類ㅼ쾼 */}
        <Section title="?リ옇?? / ??類ㅼ쾼">
  <div className="mb-2"><label className="inline-flex items-center gap-2"><input type="checkbox" name="guaranteeInsurance" /> <span>?곌랜?삣폑?삵돦?袁⑦벍</span></label></div>
          <div className="flex flex-wrap items-center gap-3">
            {[
              ["LH","lh"],["SH","sh"],["HUG","hug"],["HF","hf"],["?熬???驪??,"isBiz"],["???????닻뇡??쑏?,"airbnb"]
            ].map(([label, key]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" checked={(f as any)[key]} onChange={(e)=>set(key as any, e.target.checked)} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* ??⑤벡逾?/ 嶺뚮∥???*/}
        <Section title="??⑤벡逾?/ 嶺뚮∥???>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <L>?熬????繹먮봾留?(??㉱?洹먮봿逾?????'??㉱?洹먮봿逾???怨쀬Ŧ ??⑤???</L>
              <Input value={f.landlordName} onChange={(e:any)=>set("landlordName", e.target.value)} placeholder="?? ???녹춸?????裕???㉱?洹먮봿逾? />
            </div>
            <div>
              <L>?熬?????⑤벡逾?춯?/L>
              <Input value={f.landlordPhone} onChange={(e:any)=>set("landlordPhone", e.target.value)} placeholder="?? 010-1234-5678" />
            </div>
            <div>
              <L>?熬곣뫕而???繹먮봾留?(??㉱?洹먮봿逾?????'??㉱?洹먮봿逾???怨쀬Ŧ ??⑤???</L>
              <Input value={f.tenantName} onChange={(e:any)=>set("tenantName", e.target.value)} placeholder="?? 濚밸쮦??熬곣뫕而????裕???㉱?洹먮봿逾? />
            </div>
            <div>
              <L>?熬곣뫕而????⑤벡逾?춯?/L>
              <Input value={f.tenantPhone} onChange={(e:any)=>set("tenantPhone", e.target.value)} placeholder="?? 010-0000-0000" />
            </div>
            <div className="md:col-span-2">
              <L>嶺뚮∥???/L>
              <Textarea value={f.memo} onChange={(e:any)=>set("memo", e.target.value)} placeholder="?熬곣뫗???獄?????? ??얜?踰???怨몃뮔 ?? />
            </div>
          </div>
        </Section>

        {/* ???逾?*/}
        <Section title="???逾?嶺뚳퐘維?">
          <div className="space-y-2">
            <input type="file" multiple onChange={(e:any)=> setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <ul className="list-disc ml-5 text-sm text-gray-700">
                {files.map((f,i) => <li key={i}>{f.name} ({(f.size/1024).toFixed(0)} KB)</li>)}
              </ul>
            )}
            <p className="text-xs text-gray-500">* ??⑤틳嫄? ??類ㅼ뮅 ???놁Ŧ??類ｋ츎 ?怨???API ??⑤슡??</p>
          </div>
        </Section>

        {/* ???떷?묒낯?*/}
        <div className="sticky bottom-0 z-10">
          <div className="bg-white/90 backdrop-blur border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {hasError ? "?熬곣뫖???????嶺뚯솘????筌먦끇六???筌먦끉逾??怨삵룖?筌뤾쑴??" : "???놁졑?띠룆?????ル쪇???紐껊퉵??"}
            </div>
            <div className="flex gap-2">
              <button type="button" className="px-3 h-10 border rounded-lg" onClick={saveDraft}>?熬곣뫖六????/button>
              <button type="button" className="px-3 h-10 border rounded-lg" onClick={clearForm}>?貫?껆뵳??/button>
              <button type="button" className="px-3 h-10 border rounded-lg" onClick={()=>router.push("/listings")}>???쳛??/button>
              <button type="submit" disabled={saving} className={"px-4 h-10 rounded-lg text-white " + (hasError ? "bg-gray-300" : "bg-blue-600 hover:opacity-90")}>
                {saving ? "????쒎ㅇ?.." : "????}
              </button>
            </div>
          </div>
        </div>
      </form>

</main>
  );
}















































