"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeNumberBox from "../../../components/code/CodeNumberBox";

/* ========= Tab 이동을 폼 단위로 '즉시' 처리 ========= */
/* 버튼/체크/날짜/탭스킵 제외하고, 탭 누르는 즉시 다음 필드로 이동 */
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

/* ========= 타입들 ========= */
type Deal = "월세" | "전세" | "매매";
const BT_CATS = [
  "아파트",
  "오피스텔",
  "단독/다가구(상가주택)",
  "빌라/다세대",
  "상가/사무실",
  "재개발/재건축",
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

/* ========= 저장/코드생성(로컬) ========= */
const STORAGE_KEY = "daesu:listings";

function resolvePrefix(deal?: Deal | "", bldg?: string | "") {
  if (!deal || !bldg) return null;
  if (bldg === "아파트") return "C";
  if (bldg === "재개발/재건축") return "J";
  if (bldg === "상가/사무실") return "R";
  // 오피스텔/단독/다가구/빌라/다세대
  if (deal === "월세") return "BO";
  if (deal === "전세") return "BL";
  if (deal === "매매") return "BM"; // (요청 반영) 매매+오피스텔/단독/다세대 → BM
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
  const code = prefix ? `${prefix}-${nextSeq(prefix)}` : "—";
  const today = new Date();
  const createdAt = today.toISOString().slice(0, 10);
  const id = `${prefix || "X"}-${Date.now()}`;

  return {
    id,
    createdAt,
    agent: "소장",
    code,
    dealType: f.dealType,
    buildingType: f.buildingType,
    deposit: f.deposit ? Number(f.deposit) : undefined,
    rent: f.rent ? Number(f.rent) : undefined,
    mgmt: f.mgmt ? Number(f.mgmt) : undefined,
    tenantInfo: f.vacant ? "공실" : (f.availableDate ? `이사가능일 ${f.availableDate}` : ""),
    address: f.addressJibeon || "",
    addressSub: [f.floor, f.unit].filter(Boolean).join(" "),
    areaM2: f.areaM2 ? Number(f.areaM2) : undefined,
    rooms: f.rooms ? Number(f.rooms) : undefined,
    baths: f.baths ? Number(f.baths) : undefined,
    elevator: f.elevator ? "Y" : "N",
    parking: f.parking ? "가능" : "불가",
    pets: f.pets ? "가능" : "불가",
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

/* ========= 심플 입력 컴포넌트(가벼움) ========= */
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
        if (v !== e.currentTarget.value) e.currentTarget.value = v; // 정제는 즉시, 상태 업데이트는 가볍게
        onChange?.(e as any);
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

/* ========= 페이지 ========= */
export default function NewListingPage() {
  const router = useRouter();
  const [f, setF] = useState<Form>(initForm);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const draftKey = "listing-form-draft";
  const formRef = useRef<HTMLFormElement>(null);

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
      if (!dep)
        e.deposit =
          (f.dealType === "전세" ? "전세금(만원)" : "매매가(만원)") + "는 필수입니다.";
    }
    if (f.areaM2 && !/^\d+(\.\d+)?$/.test(f.areaM2))
      e.areaM2 = "숫자 또는 소수로 입력하세요. 예: 44.2";
    return e;
  }, [f]);

  const hasError = Object.keys(errors).length > 0;

  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(f));
      alert("임시저장 완료.");
    } catch {
      alert("임시저장 실패: 저장공간을 확인하세요.");
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
    // ① 상태값을 서버에 보낼 payload로 변환
    const listing = formToListing(f);

    // ② API로 저장
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listing),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`save failed ${res.status} ${msg}`);
    }

    // ③ 임시저장 드래프트 제거 후 목록으로 이동
    localStorage.removeItem(draftKey);
    router.push("/listings");
  } catch (err) {
    console.error("[save error]", err);
    alert("저장 오류가 발생했습니다. 콘솔을 확인해주세요.");
  } finally {
    setSaving(false);
  }
};

  // ★ 폼 단일 핸들러: Tab 즉시 이동 (capture 단계)
  const onFormKeyDownCapture: React.KeyboardEventHandler<HTMLFormElement> = (
    e
  ) => {
    if (e.key !== "Tab") return;
    const t = e.target as HTMLElement;
    // 버튼/체크/날짜/탭스킵은 기본 탭 유지
    if (
      t.hasAttribute("data-skip-tab") ||
      (t as HTMLInputElement).type === "checkbox" ||
      (t as HTMLInputElement).type === "date" ||
      t.getAttribute("tabindex") === "-1"
    ) {
      return;
    }
    e.preventDefault(); // 기본 탭 막고
    const form = formRef.current;
    if (!form) return;
    focusNext(form, !e.shiftKey); // 즉시 다음 포커스
  };

  return (
    <main className="w-full mx-auto max-w-[1400px] md:max-w-[1500px] px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <button
          className="px-3 py-2 border rounded-lg hover:bg-gray-50"
          onClick={() => router.push("/listings")}
          data-skip-tab
          tabIndex={-1}
        >
          ← 목록으로
        </button>
        <h1 className="text-2xl md:text-3xl font-bold">매물 등록</h1>
        <div className="w-[110px]"></div>
      </div>

      {/* ★ form에 캡처 핸들러 한 번만 */}
      <form
        ref={formRef}
        onKeyDownCapture={onFormKeyDownCapture}
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {/* 기본 / 거래 */}
        <Section
          title="기본 / 거래"
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
              <L>거래유형 *</L>
              <div className="flex gap-2" data-skip-tab>
                {(["월세", "전세", "매매"] as Deal[]).map((d) => (
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
              <L>건물유형 *</L>
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

        {/* 금액 */}
        <Section title="금액">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <L>
                {f.dealType === "매매"
                  ? "매매가(만원) *"
                  : f.dealType === "전세"
                  ? "전세금(만원) *"
                  : "보증금(만원) *"}
              </L>
              <NumericInput
                value={f.deposit}
                onChange={(e) =>
                  set("deposit", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 1000"
              />
            </div>
            <div className="md:col-span-2">
              <L>월세(만원){f.dealType === "월세" ? " *" : ""}</L>
              <NumericInput
                value={f.rent}
                onChange={(e) =>
                  set("rent", (e.target as HTMLInputElement).value)
                }
                placeholder={f.dealType === "월세" ? "필수" : "월세 선택 시 입력"}
              />
            </div>
            <div className="md:col-span-1">
              <L>관리비(만원)</L>
              <NumericInput
                value={f.mgmt}
                onChange={(e) =>
                  set("mgmt", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 7"
              />
            </div>
            <div className="md:col-span-3">
              <L>관리비 포함항목</L>
              <Text
                value={f.mgmtItems}
                onChange={(e) =>
                  set("mgmtItems", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 수도, 인터넷, 청소비"
              />
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
                  onChange={(e) =>
                    set("addressJibeon", (e.target as HTMLInputElement).value)
                  }
                  placeholder="예: 천호동 166-21"
                  className="w-[220px]"
                />
                {errors.addressJibeon && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.addressJibeon}
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <L>층</L>
                <Text
                  value={f.floor}
                  onChange={(e) =>
                    set("floor", (e.target as HTMLInputElement).value)
                  }
                  placeholder="예: 3F"
                  className="w-[120px]"
                />
              </div>

              <div className="flex flex-col">
                <L>호실</L>
                <Text
                  value={f.unit}
                  onChange={(e) =>
                    set("unit", (e.target as HTMLInputElement).value)
                  }
                  placeholder="예: 301호"
                  className="w-[120px]"
                />
              </div>

              {/* 날짜/체크 → Tab 스킵 */}
              <div className="flex flex-col" data-skip-tab>
                <L>입주가능일</L>
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
                    <span className="text-sm text-gray-700">협의가능</span>
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
                  <span className="text-sm text-gray-700">공실</span>
                </label>
              </div>
            </div>

            {/* 체크 3종 Tab 스킵 */}
            <div className="flex flex-wrap items-center gap-6" data-skip-tab>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  tabIndex={-1}
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.elevator}
                  onChange={(e) => set("elevator", e.target.checked)}
                />
                <span className="text-sm text-gray-700">엘리베이터 있음</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  tabIndex={-1}
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.parking}
                  onChange={(e) => set("parking", e.target.checked)}
                />
                <span className="text-sm text-gray-700">주차 가능</span>
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  tabIndex={-1}
                  type="checkbox"
                  className="w-4 h-4"
                  checked={f.pets}
                  onChange={(e) => set("pets", e.target.checked)}
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
                onChange={(e) =>
                  set("areaM2", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 44.2"
              />
              {errors.areaM2 && (
                <p className="text-xs text-red-600 mt-1">{errors.areaM2}</p>
              )}
              <div className="text-xs text-gray-500 mt-1">
                ≈ {pyeong.toFixed(2)} 평
              </div>
            </div>
            <div>
              <L>방(개)</L>
              <NumericInput
                value={f.rooms}
                onChange={(e) =>
                  set("rooms", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 1"
              />
            </div>
            <div>
              <L>욕실(개)</L>
              <NumericInput
                value={f.baths}
                onChange={(e) =>
                  set("baths", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 1"
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
                <span className="text-sm text-gray-700">복층 여부</span>
              </label>
            </div>
          </div>
        </Section>

        {/* 기관 / 서류 — 스킵 */}
        <Section title="기관 / 서류">
          <div className="flex flex-wrap items-center gap-3" data-skip-tab>
            {[
              ["LH", "lh"],
              ["SH", "sh"],
              ["HUG", "hug"],
              ["HF", "hf"],
              ["임대사업자", "isBiz"],
              ["에어비앤비", "airbnb"],
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

        {/* 연락 / 메모 */}
        <Section title="연락 / 메모">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <L>임대인 성함 (관리인이면 '관리인'으로 적기)</L>
              <Text
                value={f.landlordName}
                onChange={(e) =>
                  set("landlordName", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 홍길동 또는 관리인"
              />
            </div>
            <div>
              <L>임대인 연락처</L>
              <Text
                value={f.landlordPhone}
                onChange={(e) =>
                  set("landlordPhone", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 010-1234-5678"
              />
            </div>
            <div>
              <L>임차인 성함 (관리인이면 '관리인'으로 적기)</L>
              <Text
                value={f.tenantName}
                onChange={(e) =>
                  set("tenantName", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 김임차 또는 관리인"
              />
            </div>
            <div>
              <L>임차인 연락처</L>
              <Text
                value={f.tenantPhone}
                onChange={(e) =>
                  set("tenantPhone", (e.target as HTMLInputElement).value)
                }
                placeholder="예: 010-0000-0000"
              />
            </div>
            <div className="md:col-span-2">
              <L>메모</L>
              <Textarea
                value={f.memo}
                onChange={(e) =>
                  set("memo", (e.target as HTMLTextAreaElement).value)
                }
                placeholder="현장 특이사항, 협의 내용 등"
              />
            </div>
          </div>
        </Section>

        {/* 액션바 — 버튼 Tab 스킵 */}
        <div className="sticky bottom-0 z-10">
          <div className="bg-white/90 backdrop-blur border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {hasError
                ? "필수/숫자/지번 형식을 확인해주세요."
                : "입력값이 유효합니다."}
            </div>
            <div className="flex gap-2" data-skip-tab>
              <button
                type="button"
                tabIndex={-1}
                className="px-3 h-10 border rounded-lg"
                onClick={saveDraft}
              >
                임시저장
              </button>
              <button
                type="button"
                tabIndex={-1}
                className="px-3 h-10 border rounded-lg"
                onClick={clearForm}
              >
                초기화
              </button>
              <button
                type="button"
                tabIndex={-1}
                className="px-3 h-10 border rounded-lg"
                onClick={() => router.push("/listings")}
              >
                취소
              </button>
              <button
                type="submit"
                tabIndex={-1}
                disabled={saving}
                className={
                  "px-4 h-10 rounded-lg text-white " +
                  (hasError ? "bg-gray-300" : "bg-blue-600 hover:opacity-90")
                }
              >
                {saving ? "저장중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
