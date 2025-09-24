"use client";

import CodeNumberLive from "./CodeNumberLive";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ========= IME(?쒓? ?낅젰湲? ?덉쟾 ?レ옄 ?낅젰 ?좏떥 ========= */
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
  useEffect(() => { if (value !== draft) setDraft(value); }, [value]);

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
  useEffect(() => { if (value !== draft) setDraft(value); }, [value]);

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

type Deal = "?붿꽭" | "?꾩꽭" | "留ㅻℓ";
const BT_CATS = [
  "?꾪뙆??,"?ㅽ뵾?ㅽ뀛","?⑤룆/?ㅺ?援??곴?二쇳깮)","鍮뚮씪/?ㅼ꽭?","?곴?/?щТ??,"?ш컻諛??ш굔異?,
] as const;
type BtCat = typeof BT_CATS[number];

type Form = {
  dealType: Deal | "";
  buildingType: BtCat | "";

  // 二쇱냼/嫄대Ъ
  addressJibeon: string; // 吏踰?二쇱냼 (?좏깮)
  floor: string;         // 痢?  unit: string;          // ?몄떎  ??異붽?!
  availableDate: string;
  availableNegotiable: boolean;
  vacant: boolean;
  elevator: boolean;
  parking: boolean;
  pets: boolean;

  // 湲덉븸
  deposit: string;   // 留뚯썝
  rent: string;      // 留뚯썝
  mgmt: string;      // 留뚯썝
  mgmtItems: string; // 愿由щ퉬 ?ы븿??ぉ

  // 硫댁쟻/援ъ“
  areaM2: string; // ?뚯닔
  rooms: string;
  baths: string;
  loft: boolean;  // 蹂듭링

  // 湲곌?/?쒕쪟
  lh: boolean; sh: boolean; hug: boolean; hf: boolean; isBiz: boolean; airbnb: boolean;

  // ?곕씫/硫붾え
  landlordName: string; landlordPhone: string;
  tenantName: string;   tenantPhone: string;
  memo: string;
};

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

export default function NewListingPage() {
  const router = useRouter();
  const [f, setF] = useState<Form>(initForm);
  const [saving, setSaving] = useState(false);
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

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!f.dealType) e.dealType = "嫄곕옒?좏삎???좏깮?섏꽭??";
    if (!f.buildingType) e.buildingType = "嫄대Ъ?좏삎???좏깮?섏꽭??";

    // 二쇱냼(吏踰? = ?꾩닔 ?꾨떂! (媛믪씠 ?덉쓣 ?뚮쭔 ?뺤떇 泥댄겕)
    if (f.addressJibeon && !/??s*\d+\-\d+/.test(f.addressJibeon)) {
      e.addressJibeon = "吏踰??뺤떇?쇰줈 ?낅젰?섏꽭?? ?? 泥쒗샇??166-21";
    }

    const dep = Number(f.deposit || "0");
    const rent = Number(f.rent || "0");
    if (f.dealType === "?붿꽭") {
      if (!dep) e.deposit = "蹂댁쬆湲?留뚯썝)? ?꾩닔?낅땲??";
      if (!rent) e.rent = "?붿꽭(留뚯썝)? ?꾩닔?낅땲??";
    } else if (f.dealType === "?꾩꽭" || f.dealType === "留ㅻℓ") {
      if (!dep) e.deposit = (f.dealType === "?꾩꽭" ? "?꾩꽭湲?留뚯썝)" : "留ㅻℓ媛(留뚯썝)") + "???꾩닔?낅땲??";
    }
    if (f.areaM2 && !/^\d+(\.\d+)?$/.test(f.areaM2)) e.areaM2 = "?レ옄 ?먮뒗 ?뚯닔濡??낅젰?섏꽭?? ?? 44.2";
    return e;
  }, [f]);

  const hasError = Object.keys(errors).length > 0;

  const saveDraft = () => {
    try { localStorage.setItem(draftKey, JSON.stringify(f)); alert("?꾩떆????꾨즺."); }
    catch { alert("?꾩떆????ㅽ뙣: ??κ났媛꾩쓣 ?뺤씤?섏꽭??"); }
  };

  const clearForm = () => { setF(initForm); setFiles([]); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasError) { alert("?꾩닔/?レ옄 ??ぉ???뺤씤?댁＜?몄슂."); return; }
    setSaving(true);
    try {
      const landlordLabel = f.landlordName?.trim() || "?꾨???;
      const tenantLabel   = f.tenantName?.trim()   || "?꾩감??;
      const payload = { ...f, landlordLabel, tenantLabel, files: files.map(x => ({ name: x.name, size: x.size })) };
      console.log("SUBMIT NEW LISTING", payload);
      localStorage.removeItem(draftKey);
      alert("????꾨즺(?곕え).");
      router.push("/listings");
    } finally { setSaving(false); }
  };

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

  return (
    <main className="w-full mx-auto max-w-[1400px] md:max-w-[1500px] px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <button type="button" className="px-3 py-2 border rounded-lg hover:bg-gray-50" onClick={() => router.push("/listings")}>??紐⑸줉?쇰줈</button>
        <h1 className="text-2xl md:text-3xl font-bold">留ㅻЪ ?깅줉</h1>
        <div className="w-[110px]"></div>
      </div>

      <form id="listing-new-form" onSubmit={onSubmit} className="space-y-5">
  <CodeNumberLive />
        {/* 湲곕낯 / 嫄곕옒 */}
        <Section title="湲곕낯 / 嫄곕옒">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <L>嫄곕옒?좏삎 *</L>
              <div className="flex gap-2">
                {(["?붿꽭","?꾩꽭","留ㅻℓ"] as Deal[]).map(d => (
                  <ToggleBtn key={d} active={f.dealType===d} onClick={() => set("dealType", f.dealType===d ? "" : d)}>{d}</ToggleBtn>
                ))}
              </div>
              {errors.dealType && <p className="text-xs text-red-600 mt-1">{errors.dealType}</p>}
            </div>
            <div className="md:col-span-3">
              <L>嫄대Ъ?좏삎 *</L>
              <div className="flex flex-wrap gap-2">
                {BT_CATS.map(c => (
                  <ToggleBtn key={c} active={f.buildingType===c} onClick={() => set("buildingType", f.buildingType===c ? "" : c)}>{c}</ToggleBtn>
                ))}
              </div>
              {errors.buildingType && <p className="text-xs text-red-600 mt-1">{errors.buildingType}</p>}
            </div>
          </div>
        </Section>

        {/* 湲덉븸 */}
        <Section title="湲덉븸">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <L>{f.dealType==="留ㅻℓ" ? "留ㅻℓ媛(留뚯썝) *" : f.dealType==="?꾩꽭" ? "?꾩꽭湲?留뚯썝) *" : "蹂댁쬆湲?留뚯썝) *"}</L>
              <NumericInput value={f.deposit} onValue={(v)=>set("deposit", v)} placeholder="?? 1000" />
              {errors.deposit && <p className="text-xs text-red-600 mt-1">{errors.deposit}</p>}
            </div>
            <div className="md:col-span-2">
              <L>?붿꽭(留뚯썝){f.dealType==="?붿꽭" ? " *" : ""}</L>
              <NumericInput value={f.rent} onValue={(v)=>set("rent", v)} placeholder={f.dealType==="?붿꽭" ? "?꾩닔" : "?붿꽭 ?좏깮 ???낅젰"} />
              {errors.rent && <p className="text-xs text-red-600 mt-1">{errors.rent}</p>}
            </div>
            <div className="md:col-span-1">
              <L>愿由щ퉬(留뚯썝)</L>
              <NumericInput value={f.mgmt} onValue={(v)=>set("mgmt", v)} placeholder="?? 7" />
            </div>
            <div className="md:col-span-3">
              <L>愿由щ퉬 ?ы븿??ぉ</L>
              <Input value={f.mgmtItems} onChange={(e:any)=>set("mgmtItems", e.target.value)} placeholder="?? ?섎룄, ?명꽣?? 泥?냼鍮? />
            </div>
          </div>
        </Section>

        {/* 二쇱냼 / 嫄대Ъ */}
        <Section title="二쇱냼 / 嫄대Ъ">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <L>二쇱냼(吏踰?</L>
                  <span className="text-[11px] text-gray-500">* 吏踰덈쭔 ?낅젰(?꾨줈紐??곸꽭二쇱냼 ?쒖쇅)</span>
                </div>
                <Input
                  value={f.addressJibeon}
                  onChange={(e:any)=>set("addressJibeon", e.target.value)}
                  placeholder="?? 泥쒗샇??166-21"
                  className="w-[220px]"
                />
                {errors.addressJibeon && <p className="text-xs text-red-600 mt-1">{errors.addressJibeon}</p>}
              </div>

              {/* 痢??몄떎: ??移몄쑝濡?遺꾨━ */}
              <div className="flex flex-col">
                <L>痢?/L>
                <Input
                  value={f.floor}
                  onChange={(e:any)=>set("floor", e.target.value)}
                  placeholder="?? 3F"
                  className="w-[120px]"
                />
              </div>
              <div className="flex flex-col">
                <L>?몄떎</L>
                <Input
                  value={f.unit}
                  onChange={(e:any)=>set("unit", e.target.value)}
                  placeholder="?? 301??
                  className="w-[120px]"
                />
              </div>

              <div className="flex flex-col">
                <L>?낆＜媛?μ씪</L>
                <div className="flex items-center gap-2">
                  <Input type="date" value={f.availableDate} onChange={(e:any)=>set("availableDate", e.target.value)} className="w-[180px]" />
                  <label className="inline-flex items-center gap-2 select-none">
                    <input type="checkbox" className="w-4 h-4" checked={f.availableNegotiable} onChange={(e)=>set("availableNegotiable", e.target.checked)} />
                    <span className="text-sm text-gray-700">?묒쓽媛??/span>
                  </label>
                </div>
              </div>

              <div className="pb-0.5">
                <L>&nbsp;</L>
                <label className="inline-flex items-center gap-2 select-none h-10">
                  <input type="checkbox" className="w-4 h-4" checked={f.vacant} onChange={(e)=>set("vacant", e.target.checked)} />
                  <span className="text-sm text-gray-700">怨듭떎</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.elevator} onChange={(e)=>set("elevator", e.target.checked)} />
                <span className="text-sm text-gray-700">?섎━踰좎씠???덉쓬</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.parking} onChange={(e)=>set("parking", e.target.checked)} />
                <span className="text-sm text-gray-700">二쇱감 媛??/span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.pets} onChange={(e)=>set("pets", e.target.checked)} />
                <span className="text-sm text-gray-700">諛섎젮?숇Ъ 媛??/span>
              </label>
            </div>
          </div>
        </Section>

        {/* 硫댁쟻 / 援ъ“ */}
        <Section title="硫댁쟻 / 援ъ“">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <L>?꾩슜硫댁쟻(??</L>
              <DecimalInput value={f.areaM2} onValue={(v)=>set("areaM2", v)} placeholder="?? 44.2" />
              {errors.areaM2 && <p className="text-xs text-red-600 mt-1">{errors.areaM2}</p>}
              <div className="text-xs text-gray-500 mt-1">??{pyeong.toFixed(2)} ??/div>
            </div>
            <div>
              <L>諛?媛?</L>
              <NumericInput value={f.rooms} onValue={(v)=>set("rooms", v)} maxLen={2} placeholder="?? 1" />
            </div>
            <div>
              <L>?뺤떎(媛?</L>
              <NumericInput value={f.baths} onValue={(v)=>set("baths", v)} maxLen={2} placeholder="?? 1" />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.loft} onChange={(e)=>set("loft", e.target.checked)} />
                <span className="text-sm text-gray-700">蹂듭링 ?щ?</span>
              </label>
            </div>
          </div>
        </Section>

        {/* 湲곌? / ?쒕쪟 */}
        <Section title="湲곌? / ?쒕쪟">
          <div className="flex flex-wrap items-center gap-3">
            {[
              ["LH","lh"],["SH","sh"],["HUG","hug"],["HF","hf"],["?꾨??ъ뾽??,"isBiz"],["?먯뼱鍮꾩븻鍮?,"airbnb"]
            ].map(([label, key]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" checked={(f as any)[key]} onChange={(e)=>set(key as any, e.target.checked)} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* ?곕씫 / 硫붾え */}
        <Section title="?곕씫 / 硫붾え">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <L>?꾨????깊븿 (愿由ъ씤?대㈃ '愿由ъ씤'?쇰줈 ?곴린)</L>
              <Input value={f.landlordName} onChange={(e:any)=>set("landlordName", e.target.value)} placeholder="?? ?띻만???먮뒗 愿由ъ씤" />
            </div>
            <div>
              <L>?꾨????곕씫泥?/L>
              <Input value={f.landlordPhone} onChange={(e:any)=>set("landlordPhone", e.target.value)} placeholder="?? 010-1234-5678" />
            </div>
            <div>
              <L>?꾩감???깊븿 (愿由ъ씤?대㈃ '愿由ъ씤'?쇰줈 ?곴린)</L>
              <Input value={f.tenantName} onChange={(e:any)=>set("tenantName", e.target.value)} placeholder="?? 源?꾩감 ?먮뒗 愿由ъ씤" />
            </div>
            <div>
              <L>?꾩감???곕씫泥?/L>
              <Input value={f.tenantPhone} onChange={(e:any)=>set("tenantPhone", e.target.value)} placeholder="?? 010-0000-0000" />
            </div>
            <div className="md:col-span-2">
              <L>硫붾え</L>
              <Textarea value={f.memo} onChange={(e:any)=>set("memo", e.target.value)} placeholder="?꾩옣 ?뱀씠?ы빆, ?묒쓽 ?댁슜 ?? />
            </div>
          </div>
        </Section>

        {/* ?뚯씪 */}
        <Section title="?뚯씪 泥⑤?">
          <div className="space-y-2">
            <input type="file" multiple onChange={(e:any)=> setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <ul className="list-disc ml-5 text-sm text-gray-700">
                {files.map((f,i) => <li key={i}>{f.name} ({(f.size/1024).toFixed(0)} KB)</li>)}
              </ul>
            )}
            <p className="text-xs text-gray-500">* ?곕え: ?쒕쾭 ?낅줈?쒕뒗 異뷀썑 API ?곌껐.</p>
          </div>
        </Section>

        {/* ?≪뀡諛?*/}
        <div className="sticky bottom-0 z-10">
          <div className="bg-white/90 backdrop-blur border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {hasError ? "?꾩닔/?レ옄/吏踰??뺤떇???뺤씤?댁＜?몄슂." : "?낅젰媛믪씠 ?좏슚?⑸땲??"}
            </div>
            <div className="flex gap-2">
              <button type="button" className="px-3 h-10 border rounded-lg" onClick={saveDraft}>?꾩떆???/button>
              <button type="button" className="px-3 h-10 border rounded-lg" onClick={clearForm}>珥덇린??/button>
              <button type="button" className="px-3 h-10 border rounded-lg" onClick={()=>router.push("/listings")}>痍⑥냼</button>
              <button type="submit" disabled={saving} className={"px-4 h-10 rounded-lg text-white " + (hasError ? "bg-gray-300" : "bg-blue-600 hover:opacity-90")}>
                {saving ? "??μ쨷..." : "???}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
