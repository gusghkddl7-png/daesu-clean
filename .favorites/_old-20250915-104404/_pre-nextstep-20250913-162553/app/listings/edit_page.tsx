"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ========= IME(한글 입력기) 안전 숫자 입력 유틸 ========= */
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

type Deal = "월세" | "전세" | "매매";
const BT_CATS = [
  "아파트","오피스텔","단독/다가구(상가주택)","빌라/다세대","상가/사무실","재개발/재건축",
] as const;
type BtCat = typeof BT_CATS[number];

type Form = {
  dealType: Deal | "";
  buildingType: BtCat | "";

  // 주소/건물
  addressJibeon: string; // 지번 주소 (선택)
  floor: string;         // 층
  unit: string;          // 호실  ← 추가!
  availableDate: string;
  availableNegotiable: boolean;
  vacant: boolean;
  elevator: boolean;
  parking: boolean;
  pets: boolean;

  // 금액
  deposit: string;   // 만원
  rent: string;      // 만원
  mgmt: string;      // 만원
  mgmtItems: string; // 관리비 포함항목

  // 면적/구조
  areaM2: string; // 소수
  rooms: string;
  baths: string;
  loft: boolean;  // 복층

  // 기관/서류
  lh: boolean; sh: boolean; hug: boolean; hf: boolean; isBiz: boolean; airbnb: boolean;

  // 연락/메모
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
  // === PREFILL FROM SESSION (safe) ===
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("editRecord");
      if (!raw) return;
      const rec = JSON.parse(raw);
      const setVal = (name, val) => {
        const el = document.querySelector(`[name="${name}"]`);
        if (!el) return;
        if (el.type === "checkbox") {
          el.checked = !!val;
        } else {
          el.value = (val ?? "");
        }
        el.dispatchEvent(new Event("input",  { bubbles:true }));
        el.dispatchEvent(new Event("change", { bubbles:true }));
      };
      Object.entries(rec).forEach(([k,v]) => setVal(k, v));
      if (rec && rec.code) setVal("code", rec.code);
    } catch {}
  }, []);
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
    if (!f.dealType) e.dealType = "거래유형을 선택하세요.";
    if (!f.buildingType) e.buildingType = "건물유형을 선택하세요.";

    // 주소(지번) = 필수 아님! (값이 있을 때만 형식 체크)
    if (f.addressJibeon && !/동\s*\d+\-\d+/.test(f.addressJibeon)) {
      e.addressJibeon = "지번 형식으로 입력하세요. 예) 천호동 166-21";
    }

    const dep = Number(f.deposit || "0");
    const rent = Number(f.rent || "0");
    if (f.dealType === "월세") {
      if (!dep) e.deposit = "보증금(만원)은 필수입니다.";
      if (!rent) e.rent = "월세(만원)은 필수입니다.";
    } else if (f.dealType === "전세" || f.dealType === "매매") {
      if (!dep) e.deposit = (f.dealType === "전세" ? "전세금(만원)" : "매매가(만원)") + "는 필수입니다.";
    }
    if (f.areaM2 && !/^\d+(\.\d+)?$/.test(f.areaM2)) e.areaM2 = "숫자 또는 소수로 입력하세요. 예: 44.2";
    return e;
  }, [f]);

  const hasError = Object.keys(errors).length > 0;

  const saveDraft = () => {
    try { localStorage.setItem(draftKey, JSON.stringify(f)); alert("임시저장 완료."); }
    catch { alert("임시저장 실패: 저장공간을 확인하세요."); }
  };

  const clearForm = () => { setF(initForm); setFiles([]); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasError) { alert("필수/숫자 항목을 확인해주세요."); return; }
    setSaving(true);
    try {
      const landlordLabel = f.landlordName?.trim() || "임대인";
      const tenantLabel   = f.tenantName?.trim()   || "임차인";
      const payload = { ...f, landlordLabel, tenantLabel, files: files.map(x => ({ name: x.name, size: x.size })) };
      console.log("SUBMIT NEW LISTING", payload);
      localStorage.removeItem(draftKey);
      alert("저장 완료(데모).");
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
        <button className="px-3 py-2 border rounded-lg hover:bg-gray-50" onClick={() => router.push("/listings")}>← 목록으로</button>
        <h1 className="text-2xl md:text-3xl font-bold">매물수정</h1>
        <div className="w-[110px]"></div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* 기본 / 거래 */}
        <Section title={
  <div className="flex items-center gap-2">
    기본 / 거래
    <span className="flex items-center gap-2 ml-2">
      <input name="code" readOnly data-locked="1" placeholder="코드번호"
             className="border rounded px-2 h-8 text-xs w-36" />
      <button type="button" className="border px-2 py-1 rounded text-[11px]"
        onClick={()=>{
          const el = document.querySelector('input[name="code"]') as HTMLInputElement | null;
          if(!el) return;
          if (el.readOnly) { el.readOnly = false; (el as any).dataset.locked="0"; (el as any).dataset.autofill="0"; el.focus(); }
          else { el.readOnly = true; (el as any).dataset.locked="1"; }
        }}>수정</button>
      <span className="text-[11px] text-gray-400">건물유형 선택시 자동입력</span>
    </span>
  </div>
}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <L>거래유형 *</L>
              <div className="flex gap-2">
                {(["월세","전세","매매"] as Deal[]).map(d => (
                  <ToggleBtn key={d} active={f.dealType===d} onClick={() => set("dealType", f.dealType===d ? "" : d)}>{d}</ToggleBtn>
                ))}
              </div>
              {errors.dealType && <p className="text-xs text-red-600 mt-1">{errors.dealType}</p>}
            </div>
            <div className="md:col-span-3">
              <L>건물유형 *</L>
              <div className="flex flex-wrap gap-2">
                {BT_CATS.map(c => (
                  <ToggleBtn key={c} active={f.buildingType===c} onClick={() => set("buildingType", f.buildingType===c ? "" : c)}>{c}</ToggleBtn>
                ))}
              </div>
              {errors.buildingType && <p className="text-xs text-red-600 mt-1">{errors.buildingType}</p>}
            </div>
          </div>
        </Section>

        {/* 금액 */}
        <Section title="금액">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <L>{f.dealType==="매매" ? "매매가(만원) *" : f.dealType==="전세" ? "전세금(만원) *" : "보증금(만원) *"}</L>
              <NumericInput value={f.deposit} onValue={(v)=>set("deposit", v)} placeholder="예: 1000" />
              {errors.deposit && <p className="text-xs text-red-600 mt-1">{errors.deposit}</p>}
            </div>
            <div className="md:col-span-2">
              <L>월세(만원){f.dealType==="월세" ? " *" : ""}</L>
              <NumericInput value={f.rent} onValue={(v)=>set("rent", v)} placeholder={f.dealType==="월세" ? "필수" : "월세 선택 시 입력"} />
              {errors.rent && <p className="text-xs text-red-600 mt-1">{errors.rent}</p>}
            </div>
            <div className="md:col-span-1">
              <L>관리비(만원)</L>
              <NumericInput value={f.mgmt} onValue={(v)=>set("mgmt", v)} placeholder="예: 7" />
            </div>
            <div className="md:col-span-3">
              <L>관리비 포함항목</L>
              <Input value={f.mgmtItems} onChange={(e:any)=>set("mgmtItems", e.target.value)} placeholder="예: 수도, 인터넷, 청소비" />
            </div>
          </div>
        </Section>

        {/* 주소 / 건물 */}
        <Section title="주소 / 건물">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <L>주소(지번)</L>
                  <span className="text-[11px] text-gray-500">* 지번만 입력(도로명/상세주소 제외)</span>
                </div>
                <Input
                  value={f.addressJibeon}
                  onChange={(e:any)=>set("addressJibeon", e.target.value)}
                  placeholder="예: 천호동 166-21"
                  className="w-[220px]"
                />
                {errors.addressJibeon && <p className="text-xs text-red-600 mt-1">{errors.addressJibeon}</p>}
              </div>

              {/* 층/호실: 두 칸으로 분리 */}
              <div className="flex flex-col">
                <L>층</L>
                <Input
                  value={f.floor}
                  onChange={(e:any)=>set("floor", e.target.value)}
                  placeholder="예: 3F"
                  className="w-[120px]"
                />
              </div>
              <div className="flex flex-col">
                <L>호실</L>
                <Input
                  value={f.unit}
                  onChange={(e:any)=>set("unit", e.target.value)}
                  placeholder="예: 301호"
                  className="w-[120px]"
                />
              </div>

              <div className="flex flex-col">
                <L>입주가능일</L>
                <div className="flex items-center gap-2">
                  <Input type="date" value={f.availableDate} onChange={(e:any)=>set("availableDate", e.target.value)} className="w-[180px]" />
                  <label className="inline-flex items-center gap-2 select-none">
                    <input type="checkbox" className="w-4 h-4" checked={f.availableNegotiable} onChange={(e)=>set("availableNegotiable", e.target.checked)} />
                    <span className="text-sm text-gray-700">협의가능</span>
                  </label>
                </div>
              </div>

              <div className="pb-0.5">
                <L>&nbsp;</L>
                <label className="inline-flex items-center gap-2 select-none h-10">
                  <input type="checkbox" className="w-4 h-4" checked={f.vacant} onChange={(e)=>set("vacant", e.target.checked)} />
                  <span className="text-sm text-gray-700">공실</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.elevator} onChange={(e)=>set("elevator", e.target.checked)} />
                <span className="text-sm text-gray-700">엘리베이터 있음</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.parking} onChange={(e)=>set("parking", e.target.checked)} />
                <span className="text-sm text-gray-700">주차 가능</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.pets} onChange={(e)=>set("pets", e.target.checked)} />
                <span className="text-sm text-gray-700">반려동물 가능</span>
              </label>
            </div>
          </div>
        </Section>

        {/* 면적 / 구조 */}
        <Section title="면적 / 구조">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <L>전용면적(㎡)</L>
              <DecimalInput value={f.areaM2} onValue={(v)=>set("areaM2", v)} placeholder="예: 44.2" />
              {errors.areaM2 && <p className="text-xs text-red-600 mt-1">{errors.areaM2}</p>}
              <div className="text-xs text-gray-500 mt-1">≈ {pyeong.toFixed(2)} 평</div>
            </div>
            <div>
              <L>방(개)</L>
              <NumericInput value={f.rooms} onValue={(v)=>set("rooms", v)} maxLen={2} placeholder="예: 1" />
            </div>
            <div>
              <L>욕실(개)</L>
              <NumericInput value={f.baths} onValue={(v)=>set("baths", v)} maxLen={2} placeholder="예: 1" />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="w-4 h-4" checked={f.loft} onChange={(e)=>set("loft", e.target.checked)} />
                <span className="text-sm text-gray-700">복층 여부</span>
              </label>
            </div>
          </div>
        </Section>

        {/* 기관 / 서류 */}
        <Section title="기관 / 서류">
          <div className="flex flex-wrap items-center gap-3">
            {[
              ["LH","lh"],["SH","sh"],["HUG","hug"],["HF","hf"],["임대사업자","isBiz"],["에어비앤비","airbnb"]
            ].map(([label, key]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" checked={(f as any)[key]} onChange={(e)=>set(key as any, e.target.checked)} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* 연락 / 메모 */}
        <Section title="연락 / 메모">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <L>임대인 성함 (관리인이면 '관리인'으로 적기)</L>
              <Input value={f.landlordName} onChange={(e:any)=>set("landlordName", e.target.value)} placeholder="예: 홍길동 또는 관리인" />
            </div>
            <div>
              <L>임대인 연락처</L>
              <Input value={f.landlordPhone} onChange={(e:any)=>set("landlordPhone", e.target.value)} placeholder="예: 010-1234-5678" />
            </div>
            <div>
              <L>임차인 성함 (관리인이면 '관리인'으로 적기)</L>
              <Input value={f.tenantName} onChange={(e:any)=>set("tenantName", e.target.value)} placeholder="예: 김임차 또는 관리인" />
            </div>
            <div>
              <L>임차인 연락처</L>
              <Input value={f.tenantPhone} onChange={(e:any)=>set("tenantPhone", e.target.value)} placeholder="예: 010-0000-0000" />
            </div>
            <div className="md:col-span-2">
              <L>메모</L>
              <Textarea value={f.memo} onChange={(e:any)=>set("memo", e.target.value)} placeholder="현장 특이사항, 협의 내용 등" />
            </div>
          </div>
        </Section>

        {/* 파일 */}
        <Section title="파일 첨부">
          <div className="space-y-2">
            <input type="file" multiple onChange={(e:any)=> setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <ul className="list-disc ml-5 text-sm text-gray-700">
                {files.map((f,i) => <li key={i}>{f.name} ({(f.size/1024).toFixed(0)} KB)</li>)}
              </ul>
            )}
            <p className="text-xs text-gray-500">* 데모: 서버 업로드는 추후 API 연결.</p>
          </div>
        </Section>

        <div className="mb-2">           <label className="inline-flex items-center gap-2">             <input type="checkbox" name="completed" />             <span>거래완료</span>           </label>         </div>
        {/* 액션바 */}
        <div className="sticky bottom-0 z-10">
          <div className="bg-white/90 backdrop-blur border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {hasError ? "필수/숫자/지번 형식을 확인해주세요." : "입력값이 유효합니다."}
            </div>
            <div className="flex gap-2">
              <label className="inline-flex items-center gap-2 mr-2">
  <input type="checkbox" name="completed" />
  <span>거래완료</span>
</label>
              <button type="button" className="px-3 h-10 border rounded-lg" onClick={clearForm}>초기화</button>
              <button type="button" className="px-3 h-10 border rounded-lg" onClick={()=>router.push("/listings")}>취소</button>
              <button type="submit" disabled={saving} className={"px-4 h-10 rounded-lg text-white " + (hasError ? "bg-gray-300" : "bg-blue-600 hover:opacity-90")}>
                {saving ? "저장중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}


