"use client";
import { useEffect } from "react";

function t(el: Element | null) { return (el?.textContent || "").replace(/\s+/g, " ").trim(); }

export default function ToolbarStyleFix() {
  useEffect(() => {
    try {
      // 0) "기준 고정(체크포인트 n)" 문구는 숨김(삭제 X)
      const fixed = Array.from(document.querySelectorAll("body *"))
        .find(el => /기준\s*고정.*체크포인트\s*\d+/.test(t(el)));
      if (fixed) (fixed as HTMLElement).style.display = "none";

      // 1) 핵심 요소 찾아서 "부모는 flex" + order/margin만 조정
      const search = document.querySelector(
        'input[placeholder*="검색"],input[placeholder*="주소"],input[placeholder*="메모"]'
      ) as HTMLInputElement | null;

      const labels = Array.from(document.querySelectorAll("label"));
      const lblVac  = labels.find(el => /공실만/.test(t(el)));             // 공실만
      const lblDone = labels.find(el => /거래완료\s*숨기기/.test(t(el)));   // 거래완료 숨기기
      const addBtn  = Array.from(document.querySelectorAll("a,button"))
                        .find(el => /매물등록/.test(t(el)));                // + 매물등록

      const toolbar =
        (search?.closest("form,div,section,header") as HTMLElement) ||
        (addBtn ?.closest("form,div,section,header") as HTMLElement) ||
        null;
      if (!toolbar) return;

      // 부모를 flex로 (구조/자식은 그대로)
      toolbar.style.display    = "flex";
      toolbar.style.flexWrap   = "wrap";
      toolbar.style.alignItems = "center";
      toolbar.style.gap        = "8px";

      // 검색: 맨 왼쪽
      if (search) (search as unknown as HTMLElement).style.order = "0";

      // 공실만/거래완료 숨기기: 같은 줄 오른쪽 끝
      if (lblVac)  { (lblVac  as HTMLElement).style.order = "2"; (lblVac  as HTMLElement).style.marginLeft = "auto"; }
      if (lblDone) { (lblDone as HTMLElement).style.order = "2"; }

      // + 매물등록: 제일 오른쪽
      if (addBtn)  { (addBtn  as HTMLElement).style.order = "3"; }
    } catch {}
  }, []);

  return null;
}
