"use client";
import React from "react";

function txt(el: Element | null) { return (el?.textContent || "").replace(/\s+/g, " "); }

export default function ExtraFilterBar() {
  // 표 행만 display로 제어 (데이터/상태 변경 없음)
  const clearRows = () => {
    document.querySelectorAll("table tbody tr").forEach(tr => ((tr as HTMLElement).style.display = ""));
  };
  const apply = (re: RegExp) => {
    document.querySelectorAll("table tbody tr").forEach(tr => {
      const t = txt(tr);
      (tr as HTMLElement).style.display = re.test(t) ? "" : "none";
    });
  };
  const resetControls = () => {
    // 검색 초기화 (원래 검색 인풋 이벤트 발생)
    const inp = document.querySelector<HTMLInputElement>(
      'input[placeholder*="검색"],input[placeholder*="주소"],input[placeholder*="메모"]'
    );
    if (inp) {
      inp.value = "";
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    }
    // 체크박스 해제 (React state 반영 위해 click)
    const uncheck = (re: RegExp) => {
      const label = Array.from(document.querySelectorAll("label"))
        .find(el => re.test((el.textContent || "").replace(/\s+/g, " ")));
      const cb = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (cb && cb.checked) cb.click();
    };
    uncheck(/공실만/);
    uncheck(/거래완료\s*숨기기/);

    // 우리 버튼 활성표시 리셋
    document.querySelectorAll<HTMLButtonElement>("#daesu-extra [data-active]")
      .forEach(b => b.setAttribute("data-active", "0"));
  };

  return (
    <div id="daesu-extra" className="w-full px-4 mt-2">
      <div className="flex items-center gap-2">
        {/* 왼쪽: 빈 자리(검색은 원래 줄에 있음) */}
        <div className="grow"></div>

        {/* 가운데: 필터 버튼 */}
        <div className="inline-flex items-center gap-2">
          <button className="px-3 py-1 rounded border text-sm" data-active="0"
            onClick={(e) => {
              const b = e.currentTarget; const act = b.getAttribute("data-active")==="1";
              document.querySelectorAll<HTMLButtonElement>("#daesu-extra [data-active]").forEach(bb=>bb.setAttribute("data-active","0"));
              if (act) { b.setAttribute("data-active","0"); clearRows(); }
              else { b.setAttribute("data-active","1"); apply(/\b(LH|SH)\b/i); }
            }}>LH/SH</button>

          <button className="px-3 py-1 rounded border text-sm" data-active="0"
            onClick={(e) => {
              const b = e.currentTarget; const act = b.getAttribute("data-active")==="1";
              document.querySelectorAll<HTMLButtonElement>("#daesu-extra [data-active]").forEach(bb=>bb.setAttribute("data-active","0"));
              if (act) { b.setAttribute("data-active","0"); clearRows(); }
              else { b.setAttribute("data-active","1"); apply(/\b(HUG|HF|허그)\b/i); }
            }}>허그/HF</button>

          <button className="px-3 py-1 rounded border text-sm" data-active="0"
            onClick={(e) => {
              const b = e.currentTarget; const act = b.getAttribute("data-active")==="1";
              document.querySelectorAll<HTMLButtonElement>("#daesu-extra [data-active]").forEach(bb=>bb.setAttribute("data-active","0"));
              if (act) { b.setAttribute("data-active","0"); clearRows(); }
              else { b.setAttribute("data-active","1"); apply(/(보증보험|보증보험가능|SGI|HUG|HF)/i); }
            }}>보증보험가능</button>

          <button className="px-3 py-1 rounded border text-sm"
            onClick={() => { clearRows(); resetControls(); }}>새로고침</button>
        </div>

        {/* 오른쪽: 비워둠(원래 체크박스/매물등록은 기존 줄에 그대로) */}
        <div className="ml-auto"></div>
      </div>
    </div>
  );
}
