"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CodeNumberBox from "../../../components/code/CodeNumberBox";

/** ===== 유틸/상수 ===== */
type Deal = "월세" | "전세" | "매매";
const BT_CATS = [
  "단독/다가구(상가주택)",
  "빌라/다세대",
  "오피스텔",
  "아파트",
  "상가/사무실",
  "재개발/재건축",
] as const;
type BtCat = (typeof BT_CATS)[number];

const toPyeong = (m2: number) => (m2 > 0 ? m2 / 3.3058 : 0);
const pad4 = (n: number) => String(n).padStart(4, "0");
const GROUP_B = new Set(["오피스텔", "단독/다가구(상가주택)", "빌라/다세대"]);
function codePrefixOf(deal: Deal | "", bt: BtCat | ""): string | null {
  if (!deal || !bt) return null;
  if (bt === "아파트") return "C-";
  if (bt === "재개발/재건축") return "J-";
  if (bt === "상가/사무실") return "R-";
  if (GROUP_B.has(bt)) {
    if (deal === "월세") return "BO-";
    if (deal === "전세") return "BL-";
    if (deal === "매매") return "BS-";
  }
  return null;
}
const formatPhoneLive = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

type Photo = { name: string; dataUrl: string };
const COLOR_CHOICES = [
  { key: "", name: "없음", bg: "#ffffff", border: "#e5e7eb" },
  { key: "#E0F2FE", name: "하늘", bg: "#E0F2FE", border: "#bae6fd" },
  { key: "#DCFCE7", name: "연두", bg: "#DCFCE7", border: "#bbf7d0" },
  { key: "#FEF3C7", name: "연노랑", bg: "#FEF3C7", border: "#fde68a" },
  { key: "#FFE4E6", name: "연핑크", bg: "#FFE4E6", border: "#fecdd3" },
  { key: "#F3E8FF", name: "연보라", bg: "#F3E8FF", border: "#e9d5ff" },
] as const;

/** ===== 폼 타입 ===== */
type Form = {
  agent: string;                  // ★ 담당자(3글자 승인명만)
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
  illegal: boolean;

  lh: boolean; sh: boolean; hug: boolean; hf: boolean; isBiz: boolean; airbnb: boolean;
  guaranteeInsured: boolean;

  landlordName: string; landlordPhone: string;
  tenantName: string;   tenantPhone: string;
  memo: string;

  labelColor: string;
  photos: Photo[];
};

const initForm: Form = {
  agent: "",
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
  illegal: false,
  lh: false,
  sh: false,
  hug: false,
  hf: false,
  isBiz: false,
  airbnb: false,
  guaranteeInsured: false,
  landlordName: "",
  landlordPhone: "",
  tenantName: "",
  tenantPhone: "",
  memo: "",
  labelColor: "",
  photos: [],
};

/** ===== 기본 입력 컴포넌트 ===== */
const L = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-600 mb-1 block">{children}</label>
);
function NumericInput(props: React.InputHTMLAttributes<HTMLInputElement> & { value: string }) {
  const { value, onChange, ...rest } = props;
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={"border rounded px-3 h-10 text-sm w-full " + (props.className || "")}
      value={value}
      onChange={(e) => {
        const v = e.currentTarget.value.replace(/\D/g, "");
        if (v !== e.currentTarget.value) e.currentTarget.value = v;
        onChange?.(e as any);
      }}
      {...rest}
    />
  );
}
function DecimalInput(props: React.InputHTMLAttributes<HTMLInputElement> & { value: string }) {
  const { value, onChange, ...rest } = props;
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={"border rounded px-3 h-10 text-sm w-full " + (props.className || "")}
      value={value}
      onChange={(e) => {
        let v = e.currentTarget.value.replace(/[^0-9.]/g, "");
        const i = v.indexOf(".");
        if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
        if (v !== e.currentTarget.value) e.currentTarget.value = v;
        onChange?.(e as any);
      }}
      {...rest}
    />
  );
}
const Text = (props: React.InputHTMLAttributes<HTMLInputElement> & { value: string }) => (
  <input type="text" autoComplete="off" {...props}
    className={"border rounded px-3 h-10 text-sm w-full " + (props.className || "")}/>
);
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) => (
  <textarea {...props}
    className={"border rounded px-3 py-2 text-sm w-full min-h-[90px] " + (props.className || "")}/>
);
const Section = ({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode; }) => (
  <section className="rounded-xl border bg-white">
    <div className="px-5 py-3 border-b">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>{extra}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </section>
);
const ToggleBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) => (
  <button type="button" tabIndex={-1}
    onClick={onClick}
    className={"px-3 h-10 rounded-full border text-sm " + (active ? "bg-black text-white" : "bg-white hover:bg-gray-50")}>
    {children}
  </button>
);

/** ===== 사진 뷰어 & 업로더 ===== */
function PhotoViewer({ photos, index, onClose, onPrev, onNext }:{
  photos: Photo[]; index: number; onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const p = photos[index];
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);
  if (!p) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-white rounded-xl shadow-2xl p-3" style={{ width: "80vw", maxWidth: 1400 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm truncate pr-2">
            {p.name} <span className="text-gray-400">({index + 1}/{photos.length})</span>
          </div>
          <button className="border rounded px-2 py-0.5 text-sm hover:bg-gray-50" onClick={onClose}>닫기</button>
        </div>
        <div className="relative flex items-center justify-center">
          {photos.length > 1 && (
            <>
              <button aria-label="이전" onClick={onPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border hover:bg-white">‹</button>
              <button aria-label="다음" onClick={onNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border hover:bg-white">›</button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.dataUrl} alt={p.name} className="max-w-[76vw] max-h-[76vh] w-auto h-auto object-contain rounded" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <a className="inline-flex items-center gap-2 text-sm underline" href={p.dataUrl} download={p.name}>이미지 다운로드</a>
          {photos.length > 1 && <div className="text-xs text-gray-500">←/→ 키로 넘겨볼 수 있어요</div>}
        </div>
      </div>
    </div>
  );
}
function PhotoUploader({ value, onChange }: { value: Photo[]; onChange: (p: Photo[]) => void; }) {
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const toDataURL = (f: File) =>
      new Promise<Photo>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve({ name: f.name, dataUrl: String(fr.result) });
        fr.onerror = reject;
        fr.readAsDataURL(f);
      });
    const arr = await Promise.all(files.map(toDataURL));
    onChange([...(value || []), ...arr]);
    try { input.value = ""; } catch {}
  }
  function removeAt(i: number) {
    const copy = [...value];
    copy.splice(i, 1);
    onChange(copy);
  }
  const hasPreview = previewIdx != null && previewIdx >= 0 && previewIdx < (value?.length || 0);
  return (
    <>
      <div className="flex items-center gap-2">
        <input type="file" accept="image/*" multiple onChange={onFiles} />
      </div>
      {(value?.length || 0) > 0 && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {value.map((p, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.dataUrl}
                alt={p.name}
                className="w-full h-24 object-cover rounded border cursor-pointer"
                onClick={() => setPreviewIdx(i)}
                title="클릭하여 미리보기"
              />
              <div className="absolute top-1 right-1 flex gap-1">
                <a href={p.dataUrl} download={p.name} className="bg-white/95 border rounded px-1 text-[11px]" onClick={(ev) => ev.stopPropagation()}>다운</a>
                <button type="button" className="bg-white/95 border rounded px-1 text-[11px]"
                  onClick={(ev) => { ev.stopPropagation(); removeAt(i); }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {hasPreview && (
        <PhotoViewer
          photos={value}
          index={previewIdx!}
          onClose={() => setPreviewIdx(null)}
          onPrev={() => setPreviewIdx((idx) => (idx == null ? 0 : (idx - 1 + value.length) % value.length))}
          onNext={() => setPreviewIdx((idx) => (idx == null ? 0 : (idx + 1) % value.length))}
        />
      )}
    </>
  );
}

/** ===== 페이지 ===== */
export default function NewListingPage() {
  const router = useRouter();
  const [f, setF] = useState<Form>(initForm);
  const [saving, setSaving] = useState(false);

  // 승인된 담당자(설정) 연동
  const [agents, setAgents] = useState<string[]>([]);
  const agentsReady = agents.length > 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/staff?approved=1", { cache: "no-store" });
        const list = (await res.json()) as string[]; // ["김부장","김실장",...]
        // 3글자 이름만 채택
        const only3 = (Array.isArray(list) ? list : []).filter(
          (s) => typeof s === "string" && s.trim().length === 3
        );
        if (alive) setAgents(only3);
      } catch {
        if (alive) setAgents([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 승인 목록이 바뀌었는데 현재 선택값이 목록에 없으면 자동 초기화
  useEffect(() => {
    if (!f.agent) return;
    if (agents.length && !agents.includes(f.agent)) {
      setF((s) => ({ ...s, agent: "" }));
    }
  }, [agents]); // eslint-disable-line react-hooks/exhaustive-deps

  // 코드 채번용 전체 목록
  const [allItems, setAllItems] = useState<Array<{ code?: string }>>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || "";
        const res = await fetch(`${base}/api/listings`, { cache: "no-store" });
        const arr = (await res.json()) as Array<{ code?: string }>;
        if (!alive) return;
        setAllItems(arr ?? []);
      } catch {
        setAllItems([]);
      }
    })();
    return () => { alive = false; };
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
    if (!f.agent || !agents.includes(f.agent)) {
      e.agent = agentsReady ? "담당자를 선택하세요." : "설정에서 담당자를 승인해 주세요.";
    }
    if (!f.dealType) e.dealType = "거래유형을 선택하세요.";
    if (!f.buildingType) e.buildingType = "건물유형을 선택하세요.";
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
    if (f.areaM2 && !/^\d+(\.\d+)?$/.test(f.areaM2))
      e.areaM2 = "숫자 또는 소수로 입력하세요. 예: 44.2";
    return e;
  }, [f, agents, agentsReady]);

  const hasError = Object.keys(errors).length > 0;

  // 다음 코드/최근 코드
  const { nextCode, recentCode } = useMemo(() => {
    const prefix = codePrefixOf(f.dealType, f.buildingType);
    if (!prefix) return { nextCode: "", recentCode: "" };
    let max = 0;
    for (const it of allItems) {
      const c = (it?.code ?? "") as string;
      if (typeof c === "string" && c.startsWith(prefix)) {
        const m = c.match(/(\d{4})$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!Number.isNaN(n)) max = Math.max(max, n);
        }
      }
    }
    return { nextCode: prefix + pad4(max + 1), recentCode: max ? prefix + pad4(max) : "" };
  }, [f.dealType, f.buildingType, allItems]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 승인 목록 자체가 없을 때 저장 차단(UX 가드)
    if (!agentsReady) {
      alert("설정에서 담당자를 승인해 주세요. (담당자 목록이 비어 있음)");
      return;
    }
    if (hasError) return alert("필수 항목을 확인해주세요.");
    if (!nextCode) return alert("거래유형/건물유형을 먼저 선택하세요.");

    setSaving(true);
    try {
      const body = {
        createdAt: new Date().toISOString(),
        agent: f.agent,                         // ★ 담당자(승인명)
        code: nextCode,
        dealType: f.dealType as Deal,
        buildingType: f.buildingType as string,

        deposit: Number(f.deposit) || 0,
        rent: Number(f.rent) || 0,
        mgmt: Number(f.mgmt) || 0,

        tenantInfo: f.availableDate
          ? `이사가능일 ${f.availableDate}${f.availableNegotiable ? "(협의)" : ""}`
          : f.vacant ? "공실" : "",

        address: f.addressJibeon,
        addressSub: [f.floor, f.unit].filter(Boolean).join(" ") || undefined,

        areaM2: f.areaM2 ? Number(f.areaM2) : undefined,
        rooms: f.rooms ? Number(f.rooms) : undefined,
        baths: f.baths ? Number(f.baths) : undefined,

        elevator: f.elevator ? "Y" as const : "N" as const,
        parking: f.parking ? "가능" as const : "불가" as const,
        pets: f.pets ? "가능" as const : "불가" as const,

        landlord: f.landlordName || undefined,
        tenant: f.tenantName || undefined,
        contact1: f.landlordPhone || undefined,
        contact2: f.tenantPhone || undefined,

        isBiz: f.isBiz ? "Y" as const : "N" as const,
        memo: [
          f.memo || "",
          f.guaranteeInsured ? "보증보험" : "",
          f.lh ? "LH" : "",
          f.sh ? "SH" : "",
          f.hug ? "HUG" : "",
          f.hf ? "HF" : "",
          f.airbnb ? "에어비앤비" : "",
        ].filter(Boolean).join(" | "),

        vacant: f.vacant,
        completed: false,

        labelColor: f.labelColor || "",
        loft: !!f.loft,
        illegal: !!f.illegal,
        photos: f.photos,
      };

      const base = process.env.NEXT_PUBLIC_BASE_URL || "";
      const res = await fetch(`${base}/api/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const t = await res.text();
        alert(`저장 실패: ${res.status} ${t || ""}`.trim());
        return;
      }

      alert("저장 완료.");
      router.push("/listings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="w-full mx-auto max-w-[1400px] md:max-w-[1500px] px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <button className="px-3 py-2 border rounded-lg hover:bg-gray-50" onClick={() => router.push("/listings")}>
          ← 목록으로
        </button>
        <h1 className="text-2xl md:text-3xl font-bold">매물 등록</h1>
        <div className="w-[110px]"></div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* 기본 / 거래 */}
        <Section
          title="기본 / 거래"
          extra={
            <div tabIndex={-1} className="flex items-center gap-3">
              <CodeNumberBox
                dealType={f.dealType as any}
                buildingType={f.buildingType as any}
                variant="compact"
                overrideCode={nextCode || ""}
                recentCode={recentCode || ""}
              />
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 담당자 선택 */}
            <div>
              <L>담당자 *</L>
              <select
                aria-label="담당자"
                className="border rounded px-3 h-10 text-sm w-full"
                value={f.agent}
                onChange={(e) => setF((s) => ({ ...s, agent: e.target.value }))}
                disabled={!agentsReady}
              >
                <option value="">
                  {agentsReady ? "담당자 선택" : "설정에서 승인된 담당자가 없습니다"}
                </option>
                {agents.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              {(!agentsReady) && (
                <p className="text-[11px] text-amber-600 mt-1">
                  설정 &gt; 담당자 승인 후 사용 가능합니다.
                </p>
              )}
              {errors.agent && agentsReady && <p className="text-xs text-red-600 mt-1">{errors.agent}</p>}
            </div>

            <div>
              <L>거래유형 *</L>
              <div className="flex gap-2">
                {(["월세", "전세", "매매"] as Deal[]).map((d) => (
                  <ToggleBtn
                    key={d}
                    active={f.dealType === d}
                    onClick={() => setF((s) => ({ ...s, dealType: s.dealType === d ? "" : d }))}
                  >
                    {d}
                  </ToggleBtn>
                ))}
              </div>
              {errors.dealType && <p className="text-xs text-red-600 mt-1">{errors.dealType}</p>}
            </div>

            <div className="md:col-span-2">
              <L>건물유형 *</L>
              <div className="flex flex-wrap gap-2">
                {BT_CATS.map((c) => (
                  <ToggleBtn
                    key={c}
                    active={f.buildingType === c}
                    onClick={() =>
                      setF((s) => ({ ...s, buildingType: s.buildingType === c ? "" : (c as BtCat) }))
                    }
                  >
                    {c}
                  </ToggleBtn>
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
              <L>{f.dealType === "매매" ? "매매가(만원) *" : f.dealType === "전세" ? "전세금(만원) *" : "보증금(만원) *"}</L>
              <NumericInput value={f.deposit} onChange={(e) => setF((s)=>({ ...s, deposit: (e.target as HTMLInputElement).value }))} placeholder="예: 1000" />
            </div>
            <div className="md:col-span-2">
              <L>월세(만원){f.dealType === "월세" ? " *" : ""}</L>
              <NumericInput value={f.rent} onChange={(e) => setF((s)=>({ ...s, rent: (e.target as HTMLInputElement).value }))} placeholder={f.dealType === "월세" ? "필수" : "월세 선택 시 입력"} />
            </div>
            <div className="md:col-span-1">
              <L>관리비(만원)</L>
              <NumericInput value={f.mgmt} onChange={(e) => setF((s)=>({ ...s, mgmt: (e.target as HTMLInputElement).value }))} placeholder="예: 7" />
            </div>
            <div className="md:col-span-3">
              <L>관리비 포함항목</L>
              <Text value={f.mgmtItems} onChange={(e) => setF((s)=>({ ...s, mgmtItems: (e.target as HTMLInputElement).value }))} placeholder="예: 수도, 인터넷, 청소비" />
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
                  <span className="text-[11px] text-gray-500">
                    * 지번만 입력(도로명/상세주소 제외)
                  </span>
                </div>
                <Text
                  value={f.addressJibeon}
                  onChange={(e) => setF((s)=>({ ...s, addressJibeon: (e.target as HTMLInputElement).value }))}
                  placeholder="예: 천호동 166-21"
                  className="w-[220px]"
                />
                {errors.addressJibeon && (
                  <p className="text-xs text-red-600 mt-1">{errors.addressJibeon}</p>
                )}
              </div>

              <div className="flex flex-col">
                <L>층</L>
                <Text
                  value={f.floor}
                  onChange={(e) => setF((s)=>({ ...s, floor: (e.target as HTMLInputElement).value }))}
                  placeholder="예: 3F"
                  className="w-[120px]"
                />
              </div>

              <div className="flex flex-col">
                <L>호실</L>
                <Text
                  value={f.unit}
                  onChange={(e) => setF((s)=>({ ...s, unit: (e.target as HTMLInputElement).value }))}
                  placeholder="예: 301호"
                  className="w-[120px]"
                />
              </div>

              <div className="flex flex-col">
                <L>입주가능일</L>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="border rounded px-3 h-10 text-sm w-[180px]"
                    value={f.availableDate}
                    onChange={(e) => setF((s)=>({ ...s, availableDate: (e.target as HTMLInputElement).value }))}
                  />
                  <label className="inline-flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={f.availableNegotiable}
                      onChange={(e) => setF((s)=>({ ...s, availableNegotiable: e.target.checked }))}
                    />
                    <span className="text-sm text-gray-700">협의가능</span>
                  </label>
                </div>
              </div>

              <div className="pb-0.5">
                <L>&nbsp;</L>
                <label className="inline-flex items-center gap-2 select-none h-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={f.vacant}
                    onChange={(e) => setF((s)=>({ ...s, vacant: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">공실</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.elevator}
                  onChange={(e) => setF((s)=>({ ...s, elevator: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">엘리베이터 있음</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.parking}
                  onChange={(e) => setF((s)=>({ ...s, parking: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">주차 가능</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.pets}
                  onChange={(e) => setF((s)=>({ ...s, pets: e.target.checked }))}
                />
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
              <DecimalInput
                value={f.areaM2}
                onChange={(e) => setF((s)=>({ ...s, areaM2: (e.target as HTMLInputElement).value }))}
                placeholder="예: 44.2"
              />
              {errors.areaM2 && (
                <p className="text-xs text-red-600 mt-1">{errors.areaM2}</p>
              )}
              <div className="text-xs text-gray-500 mt-1">≈ {pyeong.toFixed(2)} 평</div>
            </div>
            <div>
              <L>방(개)</L>
              <NumericInput
                value={f.rooms}
                onChange={(e) => setF((s)=>({ ...s, rooms: (e.target as HTMLInputElement).value }))}
                placeholder="예: 1"
              />
            </div>
            <div>
              <L>욕실(개)</L>
              <NumericInput
                value={f.baths}
                onChange={(e) => setF((s)=>({ ...s, baths: (e.target as HTMLInputElement).value }))}
                placeholder="예: 1"
              />
            </div>
            <div className="flex items-end gap-6">
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.loft}
                  onChange={(e) => setF((s)=>({ ...s, loft: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">복층 여부</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.illegal}
                  onChange={(e) => setF((s)=>({ ...s, illegal: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">위반건축물</span>
              </label>
            </div>
          </div>
        </Section>

        {/* 기관 / 서류 */}
        <Section title="기관 / 서류">
          <div className="flex flex-wrap items-center gap-3">
            {[
              ["LH", "lh"],
              ["SH", "sh"],
              ["HUG", "hug"],
              ["HF", "hf"],
              ["보증보험", "guaranteeInsured"],
              ["임대사업자", "isBiz"],
              ["에어비앤비", "airbnb"],
            ].map(([label, key]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={(f as any)[key]}
                  onChange={(e) => setF((s)=>({ ...(s as any), [key]: e.target.checked }))}
                />
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
              <Text
                value={f.landlordName}
                onChange={(e) => setF((s)=>({ ...s, landlordName: (e.target as HTMLInputElement).value }))}
                placeholder="예: 홍길동 또는 관리인"
              />
            </div>
            <div>
              <L>임대인 연락처</L>
              <Text
                value={f.landlordPhone}
                onChange={(e) => setF((s)=>({ ...s, landlordPhone: formatPhoneLive((e.target as HTMLInputElement).value) }))}
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <L>임차인 성함 (관리인이면 '관리인'으로 적기)</L>
              <Text
                value={f.tenantName}
                onChange={(e) => setF((s)=>({ ...s, tenantName: (e.target as HTMLInputElement).value }))}
                placeholder="예: 김임차 또는 관리인"
              />
            </div>
            <div>
              <L>임차인 연락처</L>
              <Text
                value={f.tenantPhone}
                onChange={(e) => setF((s)=>({ ...s, tenantPhone: formatPhoneLive((e.target as HTMLInputElement).value) }))}
                placeholder="010-0000-0000"
              />
            </div>

            <div className="md:col-span-2">
              <L>표시색(선택)</L>
              <div className="flex flex-wrap gap-2">
                {COLOR_CHOICES.map((c) => (
                  <label
                    key={c.key || "none"}
                    className={
                      "px-3 py-1 rounded-full border cursor-pointer text-sm " +
                      (f.labelColor === c.key ? "outline outline-2 outline-black" : "")
                    }
                    style={{ background: c.bg, borderColor: c.border }}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      value={c.key}
                      checked={f.labelColor === c.key}
                      onChange={() => setF((s)=>({ ...s, labelColor: c.key }))}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <L>메모</L>
              <Textarea
                value={f.memo}
                onChange={(e) => setF((s)=>({ ...s, memo: (e.target as HTMLTextAreaElement).value }))}
                placeholder="현장 특이사항, 협의 내용 등"
              />
            </div>

            <div className="md:col-span-2">
              <L>사진</L>
              <PhotoUploader value={f.photos} onChange={(p) => setF((s)=>({ ...s, photos: p }))} />
            </div>
          </div>
        </Section>

        {/* 액션바 */}
        <div className="sticky bottom-0 z-10">
          <div className="bg-white/90 backdrop-blur border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {hasError ? "필수/숫자/지번 형식을 확인해주세요." : "입력값이 유효합니다."}
            </div>
            <div className="flex gap-2">
              <button type="button" tabIndex={-1} className="px-3 h-10 border rounded-lg" onClick={() => router.push("/listings")}>취소</button>
              <button type="submit" tabIndex={-1} disabled={saving}
                className={"px-4 h-10 rounded-lg text-white " + (hasError ? "bg-gray-300" : "bg-blue-600 hover:opacity-90")}>
                {saving ? "저장중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
