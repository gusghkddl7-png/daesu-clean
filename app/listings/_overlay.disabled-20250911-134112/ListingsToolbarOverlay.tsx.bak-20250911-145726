"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Refs = {
  search: HTMLInputElement | null;
  vac: HTMLInputElement | null;
  done: HTMLInputElement | null;
  addBtn: HTMLElement | null;
  toolbar: HTMLElement | null;
};

function txt(el: Element | null) {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

export default function ListingsToolbarOverlay() {
  const [ready, setReady] = useState(false);
  const r = useRef<Refs>({ search: null, vac: null, done: null, addBtn: null, toolbar: null });

  // 1) 마운트 후 기존 요소만 "찾기"(이동/수정 X)
  useEffect(() => {
    try {
      const search = document.querySelector(
        'input[placeholder*="검색"],input[placeholder*="주소"],input[placeholder*="메모"]'
      ) as HTMLInputElement | null;

      const labels = Array.from(document.querySelectorAll("label"));
      const lblVac  = labels.find(el => /공실만/.test(txt(el))) || null;
      const lblDone = labels.find(el => /거래완료\s*숨기기/.test(txt(el))) || null;

      const vac  = (lblVac  ? (lblVac.querySelector('input[type="checkbox"]') as HTMLInputElement)  : null);
      const done = (lblDone ? (lblDone.querySelector('input[type="checkbox"]') as HTMLInputElement) : null);

      const addBtn = (Array.from(document.querySelectorAll("a,button")) as HTMLElement[])
        .find(el => /매물등록/.test(txt(el))) || null;

      const toolbar = (search?.closest("form,div,section,header") as HTMLElement) ||
                      (addBtn?.closest("form,div,section,header") as HTMLElement) || null;

      r.current = { search, vac, done, addBtn, toolbar };
      setReady(true);

      // “기준 고정(체크포인트 n)” 문구는 숨김(삭제 X)
      const fixed = Array.from(document.querySelectorAll("body *"))
        .find(el => /기준\s*고정.*체크포인트\s*\d+/.test(txt(el)));
      if (fixed) (fixed as HTMLElement).style.display = "none";
    } catch {}
  }, []);

  // 2) 기존 툴바는 화면에서만 숨김(React DOM 보존)
  useEffect(() => {
    if (!ready) return;
    const tb = r.current.toolbar;
    if (tb) {
      tb.setAttribute("data-daesu-original-toolbar", "1");
      (tb.style as any).visibility = "hidden";
      (tb.style as any).height = "0";
      (tb.style as any).margin = "0";
      (tb.style as any).padding = "0";
      (tb.style as any).overflow = "hidden";
    }
  }, [ready]);

  // 표 필터
  const clearRows = () => {
    document.querySelectorAll("table tbody tr").forEach(tr => (tr as HTMLElement).style.display = "");
  };
  const apply = (key: string) => {
    const rows = document.querySelectorAll("table tbody tr");
    let re: RegExp | null = null;
    if (key === "LHSH") re = /\b(LH|SH)\b/i;
    else if (key === "HUGHF") re = /\b(HUG|HF|허그)\b/i;
    else if (key === "INSURABLE") re = /(보증보험|보증보험가능|SGI|HUG|HF)/i;
    if (!re) return;
    rows.forEach(tr => {
      const t = txt(tr);
      (tr as HTMLElement).style.display = re!.test(t) ? "" : "none";
    });
  };

  // 프록시 액션
  const setSearch = (val: string) => {
    const el = r.current.search;
    if (!el) return;
    el.value = val;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const toggleCheck = (which: "vac" | "done", nextChecked: boolean) => {
    const el = r.current[which];
    if (!el) return;
    if (el.checked !== nextChecked) el.click(); // React state 동기화
  };
  const doAdd = () => {
    const el = r.current.addBtn;
    if (!el) return;
    const href = (el as HTMLAnchorElement).href;
    if (href) { window.location.href = href; } else { el.click(); }
  };
  const doRefresh = () => {
    clearRows();
    setSearch("");
    toggleCheck("vac", false);
    toggleCheck("done", false);
    // 필터 버튼 시각 상태 초기화
    document.querySelectorAll("#daesu-toolbar [data-k]").forEach(b => b.setAttribute("data-active","0"));
  };

  if (!ready) return null;

  // 오버레이 렌더(원래 DOM은 숨긴 상태)
  return (
    <div id="daesu-toolbar" className="w-full px-4">
      <div className="flex items-center gap-2">
        {/* 왼쪽: 검색 */}
        <input
          placeholder="주소·메모 검색"
          className="border rounded px-3 py-1 w-64"
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />

        {/* 검색 오른쪽: 필터 버튼 */}
        <div className="inline-flex items-center gap-2">
          <button type="button" className="px-3 py-1 rounded border text-sm" data-k="LHSH"
            onClick={(e) => {
              const b = e.currentTarget;
              const active = b.getAttribute("data-active") === "1";
              document.querySelectorAll("#daesu-toolbar [data-k]").forEach(bb => bb.setAttribute("data-active","0"));
              if (active) { b.setAttribute("data-active","0"); clearRows(); }
              else { b.setAttribute("data-active","1"); apply("LHSH"); }
            }}>LH/SH</button>
          <button type="button" className="px-3 py-1 rounded border text-sm" data-k="HUGHF"
            onClick={(e) => {
              const b = e.currentTarget;
              const active = b.getAttribute("data-active") === "1";
              document.querySelectorAll("#daesu-toolbar [data-k]").forEach(bb => bb.setAttribute("data-active","0"));
              if (active) { b.setAttribute("data-active","0"); clearRows(); }
              else { b.setAttribute("data-active","1"); apply("HUGHF"); }
            }}>허그/HF</button>
          <button type="button" className="px-3 py-1 rounded border text-sm" data-k="INSURABLE"
            onClick={(e) => {
              const b = e.currentTarget;
              const active = b.getAttribute("data-active") === "1";
              document.querySelectorAll("#daesu-toolbar [data-k]").forEach(bb => bb.setAttribute("data-active","0"));
              if (active) { b.setAttribute("data-active","0"); clearRows(); }
              else { b.setAttribute("data-active","1"); apply("INSURABLE"); }
            }}>보증보험가능</button>
          <button type="button" className="px-3 py-1 rounded border text-sm"
            onClick={doRefresh}>새로고침</button>
        </div>

        {/* 오른쪽 끝: 체크박스 2개 + 매물등록 */}
        <div className="ml-auto inline-flex items-center gap-4">
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" onChange={(e) => toggleCheck("vac", e.currentTarget.checked)} />
            공실만
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" onChange={(e) => toggleCheck("done", e.currentTarget.checked)} />
            거래완료 숨기기
          </label>
          <button type="button" className="px-3 py-1 rounded border text-sm"
            onClick={doAdd}>+ 매물등록</button>
        </div>
      </div>
    </div>
  );
}
