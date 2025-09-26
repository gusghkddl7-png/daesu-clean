"use client";
import { useEffect } from "react";

/** 텍스트에서 날짜 추출(여러 포맷 지원) → ISO(YYYY-MM-DD) */
function parseDate(t: string): string | null {
  t = (t || "").trim(); if (!t) return null;
  let m = t.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) { const y = m[1] ?? String(new Date().getFullYear()); const iso = `${y}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(Date.parse(iso))) return iso; }
  m = t.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if (m) { const iso = `${m[1]}-${m[2]}-${m[3]}`; if(!isNaN(Date.parse(iso))) return iso; }
  const norm = t.replace(/[^\d./-]/g, " ").replace(/[.\/]/g, "-");
  m = norm.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) { const iso = `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(Date.parse(iso))) return iso; }
  m = norm.match(/(\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) { const iso = `20${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`; if(!isNaN(Date.parse(iso))) return iso; }
  m = norm.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if (m) { const y = String(new Date().getFullYear()); const iso = `${y}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`; if(!isNaN(Date.parse(iso))) return iso; }
  return null;
}
const days = (iso: string) => { const d=new Date(iso), n=new Date(); d.setHours(0,0,0,0); n.setHours(0,0,0,0); return Math.ceil((+d - +n)/86400000); };

function findTable(): HTMLTableElement | null {
  return (document.querySelector("main table") || document.querySelector("table")) as HTMLTableElement | null;
}

/** thead에서 '입주/입주일/이사' 열 인덱스 찾기 */
function findMoveInIndex(thead: HTMLElement | null): number {
  if (!thead) return -1;
  const ths = Array.from(thead.querySelectorAll("th"));
  return ths.findIndex(th => /입주|입주일|이사/i.test(th.textContent || ""));
}

/** 표 스캔해서 각 tr에 data-urgent="1|0" + data-days 부여 */
function tagRows() {
  const table = findTable(); if (!table) return;
  const thead = table.querySelector("thead") as HTMLElement | null;
  const tbody = table.querySelector("tbody") as HTMLElement | null;
  if (!tbody) return;
  const idx = findMoveInIndex(thead);

  Array.from(tbody.querySelectorAll("tr")).forEach(tr => {
    let txt = "";
    if (idx >= 0) {
      const tds = (tr as HTMLTableRowElement).querySelectorAll("td");
      if (tds && tds[idx]) txt = (tds[idx].textContent || "").trim();
    }
    if (!txt) {
      const cells = Array.from((tr as HTMLTableRowElement).querySelectorAll("td")).map(td => td.textContent || "");
      const cand = cells.find(c => parseDate(c));
      if (cand) txt = cand;
    }
    const iso = parseDate(txt || "");
    if (!iso) { (tr as HTMLElement).setAttribute("data-urgent","0"); (tr as HTMLElement).removeAttribute("data-days"); return; }
    const d = days(iso);
    const urgent = (d >= 0 && d <= 30) ? "1" : "0";
    (tr as HTMLElement).setAttribute("data-urgent", urgent);
    (tr as HTMLElement).setAttribute("data-days", String(d));
  });
}

/** 버튼 만들기 & 토글 동작(Body에 .cuo-on 클래스) */
function ensureButton() {
  if (document.getElementById("cuo-btn")) return;
  const btn = document.createElement("button");
  btn.id = "cuo-btn";
  btn.type = "button";
  btn.style.marginLeft = "8px";
  btn.style.padding = "6px 10px";
  btn.style.border = "1px solid #d1d5db";
  btn.style.borderRadius = "8px";
  btn.style.background = "#fff";
  btn.style.fontSize = "12px";
  btn.style.boxShadow = "0 1px 2px rgba(0,0,0,.04)";
  const setLabel = () => { btn.textContent = document.body.classList.contains("cuo-on") ? "급한만 보기: ON" : "급한만 보기: OFF"; };
  btn.addEventListener("click", () => {
    document.body.classList.toggle("cuo-on");
    localStorage.setItem("cuo:on", document.body.classList.contains("cuo-on") ? "1" : "0");
    setLabel();
  });
  setLabel();

  // 뒤로가기 버튼 오른쪽에 붙이기 시도 → 실패 시 상단에 삽입
  const backBtn = document.querySelector("a[role=button], button[aria-label='뒤로가기'], button:has(svg)") as HTMLElement | null;
  if (backBtn && backBtn.parentElement) {
    backBtn.parentElement.insertBefore(btn, backBtn.nextSibling);
  } else {
    const host = (document.querySelector("main") || document.body) as HTMLElement;
    const wrap = document.createElement("div");
    wrap.style.display = "flex"; wrap.style.gap = "8px"; wrap.style.alignItems = "center"; wrap.style.marginBottom = "8px";
    wrap.appendChild(btn); host.insertBefore(wrap, host.firstChild);
  }
}

export default function ClientsUrgentOnlyGlobal(){
  useEffect(() => {
    // 초기 상태 복원
    if (localStorage.getItem("cuo:on") === "1") document.body.classList.add("cuo-on"); else document.body.classList.remove("cuo-on");
    ensureButton();
    tagRows();

    // 표 구조 변화에 대응
    const mo = new MutationObserver(() => { tagRows(); });
    mo.observe(document.body, { childList: true, subtree: true });

    // 스크롤/리사이즈 후에도 한 번 더
    let t: any; window.addEventListener("resize", () => { clearTimeout(t); t=setTimeout(tagRows, 200); });
    return () => { mo.disconnect(); window.removeEventListener("resize", () => {}); };
  }, []);
  return null;
}
