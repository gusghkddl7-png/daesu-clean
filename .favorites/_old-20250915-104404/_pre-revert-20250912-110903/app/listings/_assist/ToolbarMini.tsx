"use client";
import { useEffect } from "react";

function findByText(regex: RegExp): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("button, a, label, span, div"));
  return nodes.find(n => regex.test((n.textContent || "").replace(/\s+/g, " ").trim())) || null;
}

function getRow(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  let cur: HTMLElement | null = el;
  for (let i = 0; i < 8 && cur; i++) {
    const style = getComputedStyle(cur);
    // 실제 배치되는 div 컨테이너(버튼/체크박스들이 같은 줄에 있는 상위 div)를 찾기
    if (cur.children?.length && style.display !== "inline") return cur;
    cur = cur.parentElement as HTMLElement | null;
  }
  return null;
}

export default function ToolbarMini() {
  useEffect(() => {
    // 렌더 직후 한 프레임 뒤에 적용(깜빡임 최소화). 캐시/빌드 건드리지 않음.
    const id = requestAnimationFrame(() => {
      try {
        const addBtn = findByText(/\+\s*매물등록/);
        const onlyVacant = findByText(/공\s*실\s*만/);
        const hideClosed = findByText(/거래완료\s*숨기기/);

        // 1) + 매물등록 오른쪽 끝
        const btnRow = getRow(addBtn);
        if (btnRow && addBtn) {
          const r = btnRow as HTMLElement;
          r.style.display = "flex";
          r.style.alignItems = "center";
          r.style.flexWrap = "wrap";
          r.style.gap = r.style.gap || "8px";
          (addBtn as HTMLElement).style.marginLeft = "auto";
        }

        // 2) 공실만 / 거래완료숨기기 묶음 오른쪽 끝
        const anchor = (onlyVacant || hideClosed) as HTMLElement | null;
        const chkRow = getRow(anchor);
        if (chkRow && anchor) {
          const r = chkRow as HTMLElement;
          r.style.display = "flex";
          r.style.alignItems = "center";
          r.style.flexWrap = "wrap";
          r.style.gap = r.style.gap || "8px";
          // 개별 label/span이 여러 개일 수 있으니, 첫 번째 앵커에만 auto 주면 그룹 전체가 우측으로 밀림
          anchor.style.marginLeft = "auto";
        }
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return null;
}
