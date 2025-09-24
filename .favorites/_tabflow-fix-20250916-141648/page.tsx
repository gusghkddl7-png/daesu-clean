"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** =========================
 *  타입/상수
 *  ========================= */
type Deal = "월세" | "전세" | "매매";
const DEALS: Deal[] = ["월세", "전세", "매매"];

const BT_CATS = [
  "아파트",
  "오피스텔",
  "단독/다가구(상가주택)",
  "빌라/다세대",
  "상가/사무실",
  "재개발/재건축",
] as const;
type BtCat = typeof BT_CATS[number];

type Form = {
  // 분류
  dealType: Deal | "";
  buildingType: BtCat | "";

  // 코드
  code: string; // 확정된 코드 (등록 시 확정/증가)

  // 기본정보
  addressJibeon: string;
  floor: string;
  unit: string;
  availableDate: string;
  availableNegotiable: boolean; // 협의가능
  vacant: boolean;              // 공실

  // 특징/가능한항목
  elevator: boolean;
  parking: boolean;
  pets: boolean;
  lh: boolean;
  sh: boolean;
  hug: boolean;
  hf: boolean;
  isBiz: boolean;   // 라벨은 "보증보험"로 표기
  airbnb: boolean;

  // 연락/메모
  landlordName: string;
  landlordPhone: string;
  tenantName: string;
  tenantPhone: string;
  memo: string;
};

const initForm: Form = {
  dealType: "", buildingType: "", code: "",

  addressJibeon: "", floor: "", unit: "", availableDate: "",
  availableNegotiable: false, vacant: false,

  elevator: false, parking: false, pets: false,
  lh: false, sh: false, hug: false, hf: false, isBiz: false, airbnb: false,

  landlordName: "", landlordPhone: "",
  tenantName: "", tenantPhone: "",
  memo: "",
};

/** =========================
 *  코드번호 로직
 *  ========================= */
// 규칙: 건물/거래유형 -> prefix
function getPrefix(deal: Deal | "", bt: BtCat | ""): string | "" {
  if (!deal || !bt) return "";
  if (bt === "아파트") return "C";
  if (bt === "재개발/재건축") return "J";
  if (bt === "상가/사무실") return "R";
  // 오피스텔/단독/빌라 계열
  if (deal === "월세") return "BO";
  if (deal === "전세") return "BL";
  // 매매
  return "BM";
}

const seqKey = (pfx: string) => `codeSeq:${pfx}`;

function peekNextCode(pfx: string): string {
  try {
    const cur = parseInt(localStorage.getItem(seqKey(pfx)) || "0", 10) || 0;
    const next = cur + 1;
    return `${pfx}-${String(next).padStart(4, "0")}`;
  } catch { return `${pfx}-0001`; }
}

function bumpAndGetCode(pfx: string): string {
  try {
    const cur = parseInt(localStorage.getItem(seqKey(pfx)) || "0", 10) || 0;
    const next = cur + 1;
    localStorage.setItem(seqKey(pfx), String(next));
    return `${pfx}-${String(next).padStart(4, "0")}`;
  } catch {
    // 저장 실패 시라도 코드 리턴
    return `${pfx}-0001`;
  }
}

/** =========================
 *  유틸: tabIndex 순번 생성기
 *  ========================= */


/** =========================
 *  UI
 *  ========================= */
export default function NewListingPage() {
  // tabfix: dev-only TAB debug
  useEffect(() => {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'development') return;
    const killer = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && e.defaultPrevented) {
        // 누가 막았는지 추적
        console.warn('[TAB prevented]', e.target);
      }
    };
    document.addEventListener('keydown', killer, true);
    return () => document.removeEventListener('keydown', killer, true);
  }, []);
  const router = useRouter();
  const [f, setF] = useState<Form>(initForm);
  const [editCode, setEditCode] = useState(false);
const prefix = useMemo(() => getPrefix(f.dealType, f.buildingType), [f.dealType, f.buildingType]);
  const codePreview = useMemo(() => {
    if (!prefix) return "";
    return peekNextCode(prefix);
  }, [prefix]);

  // 거래/건물 버튼 공통
  const isSel = (x: any, cur: any) => x === cur;
  const selBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-full border ${active ? "bg-black text-white border-black" : "hover:bg-gray-50"} transition`;

  // 핸들러
  const setKV = (k: keyof Form, v: any) => setF(prev => ({ ...prev, [k]: v }));

  const onRegister = () => {
    // 코드 확정(증가)
    if (prefix) {
      const newCode = bumpAndGetCode(prefix);
      setF(prev => ({ ...prev, code: newCode }));
      alert(`등록 완료\n코드: ${newCode}`);
    } else {
      alert("거래유형과 건물유형을 먼저 선택하세요.");
      return;
    }
    // 여기서 실제 저장 API 호출을 붙이면 됨.
  };

  const onReset = () => setF(initForm);

  return (
    <main className="w-full mx-auto max-w-[1200px] px-4 md:px-6 py-6">
      {/* 상단 바 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/listings")}
          className="px-3 py-2 border rounded-lg hover:bg-gray-50"
        >
          매물 목록으로
        </button>
        <h1 className="text-2xl md:text-3xl font-bold">매물 등록</h1>
      </div>

      {/* 코드번호 */}
      <section className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-1">코드번호</label>
        <div className="flex gap-2 items-center">
          <input
            value={editCode ? f.code : (f.code || codePreview)}
            onChange={(e) => setKV("code", e.target.value)}
            readOnly={!editCode}
            placeholder="예: 유형 선택 시 자동입력"
            className="flex-1 border rounded px-3 h-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setEditCode(s => !s)}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            title="코드번호 직접 수정"
          >
            {editCode ? "수정 종료" : "수정"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">예: C-0001 / J-0001 / R-0001 / BO-0001 / BL-0001 / BM-0001</p>
      </section>

      {/* 분류 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 거래유형 */}
        <section className="border rounded-xl p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">거래유형</div>
          <div className="flex flex-wrap gap-2">
            {DEALS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setKV("dealType", d)}
                className={selBtn(isSel(d, f.dealType))}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        {/* 건물유형 */}
        <section className="border rounded-xl p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">건물유형</div>
          <div className="flex flex-wrap gap-2">
            {BT_CATS.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setKV("buildingType", b)}
                className={selBtn(isSel(b, f.buildingType))}
              >
                {b}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 기본정보 */}
      <section className="border rounded-xl p-4 mb-6">
        <div className="text-sm font-medium text-gray-800 mb-3">기본정보</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 주소 (가로 전체) */}
          <div className="md:col-span-3">
            <input
              value={f.addressJibeon}
              onChange={e => setKV("addressJibeon", e.target.value)}
              placeholder="예: 천호동 166-82"
              className="w-full border rounded px-3 h-10 text-sm"
            />
          </div>

          {/* 층 / 호 / 입주 가능일 (각 1/3) */}
          <input
            value={f.floor}
            onChange={e => setKV("floor", e.target.value)}
            placeholder="층 (예: 12)"
            className="border rounded px-3 h-10 text-sm"
          />
          <input
            value={f.unit}
            onChange={e => setKV("unit", e.target.value)}
            placeholder="호 (예: 1201)"
            className="border rounded px-3 h-10 text-sm"
          />
          <input
            type="date"
            value={f.availableDate}
            onChange={e => setKV("availableDate", e.target.value)}
            placeholder="입주 가능일"
            className="border rounded px-3 h-10 text-sm"
          />

          {/* 체크박스(가로): 협의가능 / 공실 */}
          <div className="md:col-span-3 flex flex-wrap items-center gap-4 mt-1">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.availableNegotiable}
                onChange={e => setKV("availableNegotiable", e.target.checked)}
              />
              협의가능
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.vacant}
                onChange={e => setKV("vacant", e.target.checked)}
              />
              공실
            </label>
          </div>
        </div>
      </section>

      {/* 특징/가능한항목 (구: 기관/서류) */}
      <section className="border rounded-xl p-4 mb-6">
        <div className="text-sm font-medium text-gray-800 mb-3">특징/가능한항목</div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {/* 기본정보에서 이동: 엘리베이터/주차/반려동물 */}
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.elevator} onChange={e => setKV("elevator", e.target.checked)} />
            엘리베이터
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.parking} onChange={e => setKV("parking", e.target.checked)} />
            주차
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.pets} onChange={e => setKV("pets", e.target.checked)} />
            반려동물
          </label>

          {/* 제도/서류성 항목 */}
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.lh} onChange={e => setKV("lh", e.target.checked)} />
            LH
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.sh} onChange={e => setKV("sh", e.target.checked)} />
            SH
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.hug} onChange={e => setKV("hug", e.target.checked)} />
            HUG
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.hf} onChange={e => setKV("hf", e.target.checked)} />
            HF
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.isBiz} onChange={e => setKV("isBiz", e.target.checked)} />
            보증보험
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.airbnb} onChange={e => setKV("airbnb", e.target.checked)} />
            에어비앤비 가능
          </label>
        </div>
      </section>

      {/* 연락/메모 */}
      <section className="border rounded-xl p-4 mb-8">
        <div className="text-sm font-medium text-gray-800 mb-3">연락/메모</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={f.landlordName}
            onChange={e => setKV("landlordName", e.target.value)}
            placeholder="임대인 이름 (예: 홍길동 — 관리자일 경우 '관리자')"
            className="border rounded px-3 h-10 text-sm"
          />
          <input
            value={f.landlordPhone}
            onChange={e => setKV("landlordPhone", e.target.value)}
            placeholder="임대인 연락처 (숫자만)"
            className="border rounded px-3 h-10 text-sm"
          />
          <input
            value={f.tenantName}
            onChange={e => setKV("tenantName", e.target.value)}
            placeholder="임차인 이름 (예: 홍길동 — 관리자일 경우 '관리자')"
            className="border rounded px-3 h-10 text-sm"
          />
          <input
            value={f.tenantPhone}
            onChange={e => setKV("tenantPhone", e.target.value)}
            placeholder="임차인 연락처 (숫자만)"
            className="border rounded px-3 h-10 text-sm"
          />
        </div>

        <textarea
          value={f.memo}
          onChange={e => setKV("memo", e.target.value)}
          placeholder="메모"
          className="mt-3 w-full border rounded px-3 py-2 text-sm min-h-28"
        />
      </section>

      {/* 액션 버튼: 오른쪽 정렬 (등록이 맨 오른쪽) */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          className="px-4 h-10 border rounded-lg hover:bg-gray-50"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onRegister}
          className="px-5 h-10 rounded-lg bg-black text-white hover:opacity-90"
        >
          등록
        </button>
      </div>
    </main>
  );
}