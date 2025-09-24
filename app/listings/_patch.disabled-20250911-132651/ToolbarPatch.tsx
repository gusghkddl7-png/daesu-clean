"use client";

import { useEffect } from "react";

function txt(el: Element | null | undefined) {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

export default function ToolbarPatch() {
  useEffect(() => {
    try {
      // v3에서 만들었던 래퍼들은 "자식 먼저 부모 앞으로 빼고" 래퍼 제거(unwrap)
      document.querySelectorAll('[data-daesu="left"],[data-daesu="mid"],[data-daesu="right"]').forEach(w => {
        const parent = w.parentNode;
        if (parent) {
          while (w.firstChild) parent.insertBefore(w.firstChild, w);
        }
        (w as HTMLElement).remove();
      });
      // 이전에 만든 필터바는 통째로 제거(우리 버튼만 있음)
      document.querySelectorAll('[data-daesu="filterbar"]').forEach(el => el.remove());

      // "기준 고정(체크포인트 n)"은 제거 대신 '숨김'만 (React 노드 보존)
      const fixed = Array.from(document.querySelectorAll("body *")).find(el =>
        /기준\s*고정.*체크포인트\s*\d+/.test(txt(el))
      );
      if (fixed) (fixed as HTMLElement).style.display = "none";

      // 핵심 요소 찾기
      const search = document.querySelector(
        'input[placeholder*="검색"],input[placeholder*="주소"],input[placeholder*="메모"]'
      ) as HTMLInputElement | null;

      const labels = Array.from(document.querySelectorAll("label"));
      const lblVac  = labels.find(el => /공실만/.test(txt(el)));             // 공실만 체크
      const lblDone = labels.find(el => /거래완료\s*숨기기/.test(txt(el)));   // 거래완료 숨기기
      const addBtn  = Array.from(document.querySelectorAll("a,button"))
                        .find(el => /매물등록/.test(txt(el)));                // + 매물등록

      // 공통 부모(툴바) — 부모 변경 없이 "flex + order"만 사용
      const toolbar =
        (search?.closest("form,div,section,header") as HTMLElement) ||
        (addBtn ?.closest("form,div,section,header") as HTMLElement) ||
        null;
      if (!toolbar) return;

      // 부모를 flex로 만들고 간격 설정 (부모/자식 구조는 유지)
      toolbar.style.display    = "flex";
      toolbar.style.flexWrap   = "wrap";
      toolbar.style.alignItems = "center";
      toolbar.style.gap        = "8px";

      // 검색은 맨 왼쪽
      if (search) {
        (search as unknown as HTMLElement).style.order = "0";
      }

      // 검색 오른쪽에 "우리 전용 필터바"만 추가(React 노드 이동 없음)
      let holder: HTMLElement | null = null;
      if (search) {
        holder = document.createElement("div");
        holder.dataset.daesu = "filterbar";
        holder.className = "inline-flex items-center gap-2 ml-3";
        search.insertAdjacentElement("afterend", holder);

        holder.innerHTML = `
          <button type="button" class="px-3 py-1 rounded border text-sm" data-k="LHSH">LH/SH</button>
          <button type="button" class="px-3 py-1 rounded border text-sm" data-k="HUGHF">허그/HF</button>
          <button type="button" class="px-3 py-1 rounded border text-sm" data-k="INSURABLE">보증보험가능</button>
          <button type="button" class="px-3 py-1 rounded border text-sm" data-daesu-btn="refresh">새로고침</button>
        `;
        (holder as HTMLElement).style.order = "1";
      }

      // 체크박스들은 오른쪽 영역: 첫 번째(공실만)에 margin-left:auto로 오른쪽 끝으로 밀기
      if (lblVac) {
        (lblVac as HTMLElement).style.order = "2";
        (lblVac as HTMLElement).style.marginLeft = "auto";
      }
      if (lblDone) {
        (lblDone as HTMLElement).style.order = "2";
      }

      // "+ 매물등록"은 맨 오른쪽 끝
      if (addBtn) {
        (addBtn as HTMLElement).style.order = "3";
      }

      // ===== 표 필터/새로고침 동작 (행 display만 제어 — 데이터/상태에 손대지 않음) =====
      const clearRows = () => {
        document.querySelectorAll("table tbody tr").forEach(r => (r as HTMLElement).style.display = "");
      };
      const apply = (key: string) => {
        const rows = document.querySelectorAll("table tbody tr");
        let re: RegExp | null = null;
        if (key === "LHSH") re = /\b(LH|SH)\b/i;
        else if (key === "HUGHF") re = /\b(HUG|HF|허그)\b/i;
        else if (key === "INSURABLE") re = /(보증보험|보증보험가능|SGI|HUG|HF)/i;
        if (!re) return;
        rows.forEach(r => {
          const t = txt(r);
          (r as HTMLElement).style.display = re!.test(t) ? "" : "none";
        });
      };

      if (holder) {
        // 단일 활성 토글
        holder.querySelectorAll("button[data-k]").forEach(btn => {
          btn.addEventListener("click", () => {
            const b = btn as HTMLButtonElement;
            const k = b.getAttribute("data-k")!;
            const active = b.getAttribute("data-active") === "1";
            holder!.querySelectorAll("button[data-k]").forEach(bb => (bb as HTMLButtonElement).setAttribute("data-active","0"));
            if (active) { b.setAttribute("data-active","0"); clearRows(); }
            else { b.setAttribute("data-active","1"); apply(k); }
          });
        });

        // 새로고침: 필터/검색/체크박스 초기화 → 원래 리스트 복귀
        const refreshBtn = holder.querySelector('button[data-daesu-btn="refresh"]') as HTMLButtonElement | null;
        if (refreshBtn) {
          refreshBtn.addEventListener("click", () => {
            clearRows();
            holder!.querySelectorAll("button[data-k]").forEach(bb => (bb as HTMLButtonElement).setAttribute("data-active","0"));
            if (search) {
              search.value = "";
              search.dispatchEvent(new Event("input", { bubbles: true }));
              search.dispatchEvent(new Event("change", { bubbles: true }));
            }
            [lblVac, lblDone].forEach(lab => {
              const cb = lab?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
              if (cb && cb.checked) cb.click();
            });
          });
        }
      }
    } catch (e) {
      console.error("[ToolbarPatch v4] ", e);
    }
  }, []);

  return null;
}
