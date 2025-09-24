"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CodeNumberBox from "../../../components/code/CodeNumberBox";

/* ========= Tab ??猷??????μ맄嚥?'筌앸맩?? 筌ｌ꼶??========= */
/* 甕곌쑵??筌ｋ똾寃??醫롮?/???????뽰뇚??랁? ???袁ⓥ뀮??筌앸맩????쇱벉 ?袁⑤굡嚥???猷?*/
const FOCUS_SELECTOR =
  "input:not([type='checkbox']):not([type='date']):not([tabindex='-1']):not([disabled]), textarea:not([tabindex='-1']):not([disabled]), select:not([tabindex='-1']):not([disabled]), [contenteditable='true']:not([tabindex='-1'])";

function getTabbablesIn(form: HTMLFormElement) {
  const list = Array.from(
    form.querySelectorAll<HTMLElement>(FOCUS_SELECTOR)
  ).filter((el) => !el.hasAttribute("data-skip-tab"));
  return list;
}

function focusNext(form: HTMLFormElement, forward: boolean) {
  const items = getTabbablesIn(form);
  if (!items.length) return;
  const active = (document.activeElement as HTMLElement) || items[0];
  let idx = items.indexOf(active);
  if (idx === -1) {
    items[0].focus();
    return;
  }
  let next = forward ? idx + 1 : idx - 1;
  if (next >= items.length) next = 0;
  if (next < 0) next = items.length - 1;
  items[next].focus();
}

/* ========= ????낅굶 ========= */
type Deal = "?遺욧쉭" | "?袁⑷쉭" | "筌띲끇??;
const BT_CATS = [
  "?袁る솁??,
  "??쎈돗??쎈?,
  "??ㅻ즴/??????怨?雅뚯눛源?",
  "??슢????쇨쉭??",
  "?怨?/??龜??,
  "??而삭쳸???援붺빊?,
] as const;
type BtCat = (typeof BT_CATS)[number];

type Form = {
  dealType: Deal | "";
  buildingType: BtCat | "";

  addressJibeon: string;
  floor: string;
  unit: string;
  availableDate: string;
  availableNegotiable: boolean;
  vacant: boolean;
  elevator: boolean;
  parking: boolean;
  pets: boolean;

  deposit: string;
  rent: string;
  mgmt: string;
  mgmtItems: string;

  areaM2: string;
  rooms: string;
  baths: string;
  loft: boolean;

  lh: boolean;
  sh: boolean;
  hug: boolean;
  hf: boolean;
  isBiz: boolean;
  airbnb: boolean;

  landlordName: string;
  landlordPhone: string;
  tenantName: string;
  tenantPhone: string;
  memo: string;
};

const initForm: Form = {
  dealType: "",
  buildingType: "",
  addressJibeon: "",
  floor: "",
  unit: "",
  availableDate: "",
  availableNegotiable: false,
  vacant: false,
  elevator: false,
  parking: false,
  pets: false,
  deposit: "",
  rent: "",
  mgmt: "",
  mgmtItems: "",
  areaM2: "",
  rooms: "",
  baths: "",
  loft: false,
  lh: false,
  sh: false,
  hug: false,
  hf: false,
  isBiz: false,
  airbnb: false,
  landlordName: "",
  landlordPhone: "",
  tenantName: "",
  tenantPhone: "",
  memo: "",
};

const toPyeong = (m2: number) => (m2 > 0 ? m2 / 3.3058 : 0);

/* ========= ?????꾨뗀諭??밴쉐(嚥≪뮇類? ========= */
const STORAGE_KEY = "daesu:listings";

function resolvePrefix(deal?: Deal | "", bldg?: string | "") {
  if (!deal || !bldg) return null;
  if (bldg === "?袁る솁??) return "C";
  if (bldg === "??而삭쳸???援붺빊?) return "J";
  if (bldg === "?怨?/??龜??) return "R";
  // ??쎈돗??쎈???ㅻ즴/???????슢????쇨쉭??
  if (deal === "?遺욧쉭") return "BO";
  if (deal === "?袁⑷쉭") return "BL";
  if (deal === "筌띲끇??) return "BM"; // (?遺욧퍕 獄쏆꼷?? 筌띲끇????쎈돗??쎈???ㅻ즴/??쇨쉭?? ??BM
  return null;
}
function nextSeq(prefix: string) {
  const k = `daesu:seq:${prefix}`;
  const n = Number(localStorage.getItem(k) || "0") + 1;
  localStorage.setItem(k, String(n));
  return String(n).padStart(4, "0");
}
function formToListing(f: any) {
  const prefix = resolvePrefix(f.dealType, f.buildingType);
  const code = prefix ? `${prefix}-${nextSeq(prefix)}` : "??;
  const today = new Date();
  const createdAt = today.toISOString().slice(0, 10);
  const id = `${prefix || "X"}-${Date.now()}`;

  return {
    id,
    createdAt,
    agent: "???삢",
    code,
    dealType: f.dealType,
    buildingType: f.buildingType,
    deposit: f.deposit ? Number(f.deposit) : undefined,
    rent: f.rent ? Number(f.rent) : undefined,
    mgmt: f.mgmt ? Number(f.mgmt) : undefined,
    tenantInfo: f.vacant ? "?⑤벊?? : (f.availableDate ? `??곴텢揶쎛?關??${f.availableDate}` : ""),
    address: f.addressJibeon || "",
    addressSub: [f.floor, f.unit].filter(Boolean).join(" "),
    areaM2: f.areaM2 ? Number(f.areaM2) : undefined,
    rooms: f.rooms ? Number(f.rooms) : undefined,
    baths: f.baths ? Number(f.baths) : undefined,
    elevator: f.elevator ? "Y" : "N",
    parking: f.parking ? "揶쎛?? : "?븍뜃?",
    pets: f.pets ? "揶쎛?? : "?븍뜃?",
    landlord: f.landlordName || "",
    tenant: f.tenantName || "",
    contact1: f.landlordPhone || "",
    contact2: f.tenantPhone || "",
    isBiz: f.isBiz ? "Y" : "N",
    memo: f.memo || "",
    vacant: !!f.vacant,
    completed: false,
  };
}
function saveListingToLocal(listing: any) {
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const next = Array.isArray(arr) ? [listing, ...arr] : [listing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([listing]));
  }
}

/* ========= ??逾???낆젾 ?뚮똾猷??곕뱜(揶쎛甕곗눘?) ========= */
const L = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-600 mb-1 block">
    {children}
  </label>
);

const Text = (
  props: React.InputHTMLAttributes<HTMLInputElement> & { value: string }
) => (
  <input
    type="text"
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck={false}
    {...props}
    className={
      "border rounded px-3 h-10 text-sm w-full " + (props.className || "")
    }
  />
);

function NumericInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { value: string }
) {
  const { onChange, ...rest } = props;
  return (
    <Text
      {...rest}
      onChange={(e) => {
        const v = e.currentTarget.value.replace(/\D/g, "");
        if (v !== e.currentTarget.value) e.currentTarget.value = v; // ?類ㅼ젫??筌앸맩?? ?怨밴묶 ??낅쑓??꾨뱜??揶쎛癰귣씧苡?        onChange?.(e as any);
      }}
    />
  );
}

function DecimalInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { value: string }
) {
  const { onChange, ...rest } = props;
  return (
    <Text
      {...rest}
      onChange={(e) => {
        let v = e.currentTarget.value.replace(/[^0-9.]/g, "");
        const i = v.indexOf(".");
        if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
        if (v !== e.currentTarget.value) e.currentTarget.value = v;
        onChange?.(e as any);
      }}
    />
  );
}

const Textarea = (
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }
) => (
  <textarea
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck={false}
    {...props}
    className={
      "border rounded px-3 py-2 text-sm w-full min-h-[90px] " +
      (props.className || "")
    }
  />
);

const Section = ({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border bg-white">
    <div className="px-5 py-3 border-b">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {extra}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const ToggleBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    tabIndex={-1}
    onClick={onClick}
    className={
      "px-3 h-10 rounded-full border text-sm " +
      (active ? "bg-black text-white" : "bg-white hover:bg-gray-50")
    }
  >
    {children}
  </button>
);

/* ========= ??륁뵠筌왖 ========= */
export default function NewListingPage() {
  const router = useRouter();
  const [f, setF] = useState<Form>(initForm);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const draftKey = "listing-form-draft";
  const formRef = useRef<HTMLFormElement>(null);

  
//
// === [?섏젙 紐⑤뱶] ?ㅼ젙 ===
const sp = useSearchParams();
const editId = sp.get("edit");
const [orig, setOrig] = useState<any>(null); // 湲곗〈 臾몄꽌 ?먮낯

function listingToForm(x: any): Form {
  const sub = (x?.addressSub || "").trim();
  const [first, ...rest] = sub.split(/\s+/);
  const floor = first || "";
  const unit = rest.join(" ") || "";

  let vacant = false, availableDate = "", availableNegotiable = false;
  if (x?.tenantInfo) {
    if (x.tenantInfo.includes("怨듭떎")) vacant = true;
    const m = x.tenantInfo.match(/?댁궗媛?μ씪\s+(\d{4}-\d{2}-\d{2})/);
    if (m) availableDate = m[1];
  }

  return {
    dealType: (x?.dealType ?? "") as any,
    buildingType: (x?.buildingType ?? "") as any,

    addressJibeon: x?.address ?? "",
    floor, unit,
    availableDate,
    availableNegotiable,
    vacant,

    elevator: x?.elevator === "Y",
    parking: x?.parking === "媛??,
    pets: x?.pets === "媛??,

    deposit: x?.deposit != null ? String(x.deposit) : "",
    rent:    x?.rent    != null ? String(x.rent)    : "",
    mgmt:    x?.mgmt    != null ? String(x.mgmt)    : "",
    mgmtItems: "",

    areaM2:  x?.areaM2  != null ? String(x.areaM2)  : "",
    rooms:   x?.rooms   != null ? String(x.rooms)   : "",
    baths:   x?.baths   != null ? String(x.baths)   : "",
    loft: !!x?.loft,

    lh: !!x?.lh, sh: !!x?.sh, hug: !!x?.hug, hf: !!x?.hf,
    isBiz: x?.isBiz === "Y",
    airbnb: !!x?.airbnb,

    landlordName: x?.landlord ?? "",
    landlordPhone: x?.contact1 ?? "",
    tenantName: x?.tenant ?? "",
    tenantPhone: x?.contact2 ?? "",
    memo: x?.memo ?? "",
  };
}

useEffect(() => {
  if (!editId) return;
  (async () => {
    try {
      const res = await fetch(`/api/listings/${editId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setOrig(data);
      setF(listingToForm(data));
    } catch (e) {
      console.error(e);
      alert("留ㅻЪ 遺덈윭?ㅺ린???ㅽ뙣?덉뒿?덈떎.");
    }
  })();
}, [editId]);
useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setF({ ...initForm, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const pyeong = useMemo(() => {
    const m2 = parseFloat(f.areaM2 || "0");
    const p = toPyeong(m2);
    return isNaN(p) ? 0 : p;
  }, [f.areaM2]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!f.dealType) e.dealType = "椰꾧퀡??醫륁굨???醫뤾문??뤾쉭??";
    if (!f.buildingType) e.buildingType = "椰꾨?窺?醫륁굨???醫뤾문??뤾쉭??";
    if (f.addressJibeon && !/??s*\d+\-\d+/.test(f.addressJibeon)) {
      e.addressJibeon = "筌왖甕??類ㅻ뻼??곗쨮 ??낆젾??뤾쉭?? ?? 筌ｌ뮉???166-21";
    }
    const dep = Number(f.deposit || "0");
    const rent = Number(f.rent || "0");
    if (f.dealType === "?遺욧쉭") {
      if (!dep) e.deposit = "癰귣똻弛녷묾?筌띾슣???? ?袁⑸땾??낅빍??";
      if (!rent) e.rent = "?遺욧쉭(筌띾슣???? ?袁⑸땾??낅빍??";
    } else if (f.dealType === "?袁⑷쉭" || f.dealType === "筌띲끇??) {
      if (!dep)
        e.deposit =
          (f.dealType === "?袁⑷쉭" ? "?袁⑷쉭疫?筌띾슣??" : "筌띲끇?볟첎?(筌띾슣??") + "???袁⑸땾??낅빍??";
    }
    if (f.areaM2 && !/^\d+(\.\d+)?$/.test(f.areaM2))
      e.areaM2 = "??ъ쁽 ?癒?뮉 ???땾嚥???낆젾??뤾쉭?? ?? 44.2";
    return e;
  }, [f]);

  const hasError = Object.keys(errors).length > 0;

  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(f));
      alert("?袁⑸뻻?????袁⑥┷.");
    } catch {
      alert("?袁⑸뻻??????쎈솭: ???觀?у첎袁⑹뱽 ?類ㅼ뵥??뤾쉭??");
    }
  };

  const clearForm = () => {
    setF(initForm);
    setFiles([]);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (hasError) {
    alert("필수/숫자 항목을 확인해주세요.");
    return;
  }
  setSaving(true);
  try {
    const base = formToListing(f);
    const payload = editId && orig
      ? { ...base, code: orig.code, createdAt: orig.createdAt }
      : base;

    const url = editId ? `/api/listings/${editId}` : "/api/listings";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`${method} failed`);

    localStorage.removeItem(draftKey);
    alert("저장 완료!");
    router.push("/listings");
  } catch (err) {
    console.error("[save error]", err);
    alert("저장 오류가 발생했습니다. 콘솔을 확인해주세요.");
  } finally {
    setSaving(false);
  }
};

  // ??????μ뵬 ?紐껊굶?? Tab 筌앸맩????猷?(capture ??ｍ?
  const onFormKeyDownCapture: React.KeyboardEventHandler<HTMLFormElement> = (
    e
  ) => {
    if (e.key !== "Tab") return;
    const t = e.target as HTMLElement;
    // 甕곌쑵??筌ｋ똾寃??醫롮?/?????? 疫꿸퀡?????醫?
    if (
      t.hasAttribute("data-skip-tab") ||
      (t as HTMLInputElement).type === "checkbox" ||
      (t as HTMLInputElement).type === "date" ||
      t.getAttribute("tabindex") === "-1"
    ) {
      return;
    }
    e.preventDefault(); // 疫꿸퀡????筌띾맦??    const form = formRef.current;
    if (!form) return;
    focusNext(form, !e.shiftKey); // 筌앸맩????쇱벉 ??鍮??  };

  return (
    <main className="w-full mx-auto max-w-[1400px] md:max-w-[1500px] px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <button
          className="px-3 py-2 border rounded-lg hover:bg-gray-50"
          onClick={() => router.push("/listings")}
          data-skip-tab
          tabIndex={-1}
        >
          ??筌뤴뫖以??곗쨮
        </button>
        <h1 className="text-2xl md:text-3xl font-bold">筌띲끇窺 ?源낆쨯</h1>
        <div className="w-[110px]"></div>
      </div>

      {/* ??form??筌╈돦荑??紐껊굶????甕곕뜄彛?*/}
      <form
        ref={formRef}
        onKeyDownCapture={onFormKeyDownCapture}
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {/* 疫꿸퀡??/ 椰꾧퀡??*/}
        <Section
          title="疫꿸퀡??/ 椰꾧퀡??
          extra={
            <div tabIndex={-1} data-skip-tab>
              <CodeNumberBox
                dealType={f.dealType as any}
                buildingType={f.buildingType as any}
                variant="compact"
              />
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <L>椰꾧퀡??醫륁굨 *</L>
              <div className="flex gap-2" data-skip-tab>
                {(["?遺욧쉭", "?袁⑷쉭", "筌띲끇??] as Deal[]).map((d) => (
                  <ToggleBtn
                    key={d}
                    active={f.dealType === d}
                    onClick={() =>
                      set("dealType", f.dealType === d ? "" : d)
                    }
                  >
                    {d}
                  </ToggleBtn>
                ))}
              </div>
              {errors.dealType && (
                <p className="text-xs text-red-600 mt-1">{errors.dealType}</p>
              )}
            </div>
            <div className="md:col-span-3">
              <L>椰꾨?窺?醫륁굨 *</L>
              <div className="flex flex-wrap gap-2" data-skip-tab>
                {BT_CATS.map((c) => (
                  <ToggleBtn
                    key={c}
                    active={f.buildingType === c}
                    onClick={() =>
                      set("buildingType", f.buildingType === c ? "" : c)
                    }
                  >
                    {c}
                  </ToggleBtn>
                ))}
              </div>
              {errors.buildingType && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.buildingType}
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* 疫뀀뜆釉?*/}
        <Section title="疫뀀뜆釉?>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <L>
                {f.dealType === "筌띲끇??
                  ? "筌띲끇?볟첎?(筌띾슣?? *"
                  : f.dealType === "?袁⑷쉭"
                  ? "?袁⑷쉭疫?筌띾슣?? *"
                  : "癰귣똻弛녷묾?筌띾슣?? *"}
              </L>
              <NumericInput
                value={f.deposit}
                onChange={(e) =>
                  set("deposit", (e.target as HTMLInputElement).value)
                }
                placeholder="?? 1000"
              />
            </div>
            <div className="md:col-span-2">
              <L>?遺욧쉭(筌띾슣??{f.dealType === "?遺욧쉭" ? " *" : ""}</L>
              <NumericInput
                value={f.rent}
                onChange={(e) =>
                  set("rent", (e.target as HTMLInputElement).value)
                }
                placeholder={f.dealType === "?遺욧쉭" ? "?袁⑸땾" : "?遺욧쉭 ?醫뤾문 ????낆젾"}
              />
            </div>
            <div className="md:col-span-1">
              <L>?온?귐됲돩(筌띾슣??</L>
              <NumericInput
                value={f.mgmt}
                onChange={(e) =>
                  set("mgmt", (e.target as HTMLInputElement).value)
                }
                placeholder="?? 7"
              />
            </div>
            <div className="md:col-span-3">
              <L>?온?귐됲돩 ??釉????/L>
              <Text
                value={f.mgmtItems}
                onChange={(e) =>
                  set("mgmtItems", (e.target as HTMLInputElement).value)
                }
                placeholder="?? ??롫즲, ?紐낃숲?? 筌??쇤뜮?
              />
            </div>
          </div>
        </Section>

        {/* 雅뚯눘??/ 椰꾨?窺 */}
        <Section title="雅뚯눘??/ 椰꾨?窺">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <L>雅뚯눘??筌왖甕?</L>
                  <span className="text-[11px] text-gray-500">
                    * 筌왖甕곕뜄彛???낆젾(?袁⑥쨮筌??怨멸쉭雅뚯눘????뽰뇚)
                  </span>
                </div>
                <Text
                  value={f.addressJibeon}
                  onChange={(e) =>
                    set("addressJibeon", (e.target as HTMLInputElement).value)
                  }
                  placeholder="?? 筌ｌ뮉???166-21"
                  className="w-[220px]"
                />
                {errors.addressJibeon && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.addressJibeon}
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <L>筌?/L>
                <Text
                  value={f.floor}
                  onChange={(e) =>
                    set("floor", (e.target as HTMLInputElement).value)
                  }
                  placeholder="?? 3F"
                  className="w-[120px]"
                />
              </div>

              <div className="flex flex-col">
                <L>?紐꾨뼄</L>
                <Text
                  value={f.unit}
                  onChange={(e) =>
                    set("unit", (e.target as HTMLInputElement).value)
                  }
                  placeholder="?? 301??
                  className="w-[120px]"
                />
              </div>

              {/* ?醫롮?/筌ｋ똾寃???Tab ??쎄땁 */}
              <div className="flex flex-col" data-skip-tab>
                <L>??놅폒揶쎛?關??/L>
                <div className="flex items-center gap-2">
                  <input
                    tabIndex={-1}
                    type="date"
                    className="border rounded px-3 h-10 text-sm w-[180px]"
                    value={f.availableDate}
                    onChange={(e) =>
                      set("availableDate", (e.target as HTMLInputElement).value)
                    }
                  />
                  <label className="inline-flex items-center gap-2 select-none">
                    <input
                      tabIndex={-1}
                      type="checkbox"
                      className="w-4 h-4"
                      checked={f.availableNegotiable}
                      onChange={(e) =>
                        set("availableNegotiable", e.target.checked)
                      }
                    />
                    <span className="text-sm text-gray-700">?臾믪벥揶쎛??/span>
                  </label>
                </div>
              </div>

              <div className="pb-0.5" data-skip-tab>
                <L>&nbsp;</L>
                <label className="inline-flex items-center gap-2 select-none h-10">
                  <input
                    tabIndex={-1}
                    type="checkbox"
                    className="w-4 h-4"
                    checked={f.vacant}
                    onChange={(e) => set("vacant", e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">?⑤벊??/span>
                </label>
              </div>
            </div>

            {/* 筌ｋ똾寃?3??Tab ??쎄땁 */}
            <div className="flex flex-wrap items-center gap-6" data-skip-tab>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  tabIndex={-1}
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.elevator}
                  onChange={(e) => set("elevator", e.target.checked)}
                />
                <span className="text-sm text-gray-700">??롡봺甕곗쥙?????됱벉</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  tabIndex={-1}
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.parking}
                  onChange={(e) => set("parking", e.target.checked)}
                />
                <span className="text-sm text-gray-700">雅뚯눘媛?揶쎛??/span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  tabIndex={-1}
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.pets}
                  onChange={(e) => set("pets", e.target.checked)}
                />
                <span className="text-sm text-gray-700">獄쏆꼶???눺?揶쎛??/span>
              </label>
            </div>
          </div>
        </Section>

        {/* 筌롫똻??/ ?닌듼?*/}
        <Section title="筌롫똻??/ ?닌듼?>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <L>?袁⑹뒠筌롫똻????</L>
              <DecimalInput
                value={f.areaM2}
                onChange={(e) =>
                  set("areaM2", (e.target as HTMLInputElement).value)
                }
                placeholder="?? 44.2"
              />
              {errors.areaM2 && (
                <p className="text-xs text-red-600 mt-1">{errors.areaM2}</p>
              )}
              <div className="text-xs text-gray-500 mt-1">
                ??{pyeong.toFixed(2)} ??              </div>
            </div>
            <div>
              <L>獄?揶?</L>
              <NumericInput
                value={f.rooms}
                onChange={(e) =>
                  set("rooms", (e.target as HTMLInputElement).value)
                }
                placeholder="?? 1"
              />
            </div>
            <div>
              <L>?類ㅻ뼄(揶?</L>
              <NumericInput
                value={f.baths}
                onChange={(e) =>
                  set("baths", (e.target as HTMLInputElement).value)
                }
                placeholder="?? 1"
              />
            </div>
            <div className="flex items-end" data-skip-tab>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  tabIndex={-1}
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.loft}
                  onChange={(e) => set("loft", e.target.checked)}
                />
                <span className="text-sm text-gray-700">癰귣벊留????</span>
              </label>
            </div>
          </div>
        </Section>

        {/* 疫꿸퀗? / ??뺤첒 ????쎄땁 */}
        <Section title="疫꿸퀗? / ??뺤첒">
          <div className="flex flex-wrap items-center gap-3" data-skip-tab>
            {[
              ["LH", "lh"],
              ["SH", "sh"],
              ["HUG", "hug"],
              ["HF", "hf"],
              ["?袁???毓??, "isBiz"],
              ["?癒?선??쑴釉삯뜮?, "airbnb"],
            ].map(([label, key]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input
                  tabIndex={-1}
                  type="checkbox"
                  className="w-4 h-4"
                  checked={(f as any)[key]}
                  onChange={(e) => set(key as any, e.target.checked)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* ?怨뺤뵭 / 筌롫뗀??*/}
        <Section title="?怨뺤뵭 / 筌롫뗀??>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <L>?袁????源딅맙 (?온?귐딆뵥????'?온?귐딆뵥'??곗쨮 ?怨대┛)</L>
              <Text
                value={f.landlordName}
                onChange={(e) =>
                  set("landlordName", (e.target as HTMLInputElement).value)
                }
                placeholder="?? ??삳쭔???癒?뮉 ?온?귐딆뵥"
              />
            </div>
            <div>
              <L>?袁????怨뺤뵭筌?/L>
              <Text
                value={f.landlordPhone}
                onChange={(e) =>
                  set("landlordPhone", (e.target as HTMLInputElement).value)
                }
                placeholder="?? 010-1234-5678"
              />
            </div>
            <div>
              <L>?袁⑷컧???源딅맙 (?온?귐딆뵥????'?온?귐딆뵥'??곗쨮 ?怨대┛)</L>
              <Text
                value={f.tenantName}
                onChange={(e) =>
                  set("tenantName", (e.target as HTMLInputElement).value)
                }
                placeholder="?? 繹먃?袁⑷컧 ?癒?뮉 ?온?귐딆뵥"
              />
            </div>
            <div>
              <L>?袁⑷컧???怨뺤뵭筌?/L>
              <Text
                value={f.tenantPhone}
                onChange={(e) =>
                  set("tenantPhone", (e.target as HTMLInputElement).value)
                }
                placeholder="?? 010-0000-0000"
              />
            </div>
            <div className="md:col-span-2">
              <L>筌롫뗀??/L>
              <Textarea
                value={f.memo}
                onChange={(e) =>
                  set("memo", (e.target as HTMLTextAreaElement).value)
                }
                placeholder="?袁⑹삢 ?諭???鍮? ?臾믪벥 ??곸뒠 ??
              />
            </div>
          </div>
        </Section>

        {/* ??る↑쳸???甕곌쑵??Tab ??쎄땁 */}
        <div className="sticky bottom-0 z-10">
          <div className="bg-white/90 backdrop-blur border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {hasError
                ? "?袁⑸땾/??ъ쁽/筌왖甕??類ㅻ뻼???類ㅼ뵥??곻폒?紐꾩뒄."
                : "??낆젾揶쏅????醫륁뒞??몃빍??"}
            </div>
            <div className="flex gap-2" data-skip-tab>
              <button
                type="button"
                tabIndex={-1}
                className="px-3 h-10 border rounded-lg"
                onClick={saveDraft}
              >
                ?袁⑸뻻????              </button>
              <button
                type="button"
                tabIndex={-1}
                className="px-3 h-10 border rounded-lg"
                onClick={clearForm}
              >
                ?λ뜃由??              </button>
              <button
                type="button"
                tabIndex={-1}
                className="px-3 h-10 border rounded-lg"
                onClick={() => router.push("/listings")}
              >
                ?띯뫁??              </button>
              <button
                type="submit"
                tabIndex={-1}
                disabled={saving}
                className={
                  "px-4 h-10 rounded-lg text-white " +
                  (hasError ? "bg-gray-300" : "bg-blue-600 hover:opacity-90")
                }
              >
                {saving ? "???關夷?.." : "????}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
