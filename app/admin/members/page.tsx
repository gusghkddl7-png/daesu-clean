"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ===== 공통 키 ===== */
const SITE_MANAGER_KEY = "daesu:site:managerName";

/** ===== 유틸 ===== */
const norm = (s?: string) => (s || "").trim().toLowerCase();
const dedupeById = (arr: any[]) => {
  const seen = new Set<string>(); const out: any[] = [];
  for (const x of arr || []) {
    const k = norm(x.id || x.email);
    if (!seen.has(k)) { seen.add(k); out.push({ ...x, id: x.id || x.email }); }
  }
  return out;
};

async function apiGet(url: string, opts: RequestInit = {}) {
  try {
    const r = await fetch(url, { cache: "no-store", ...opts });
    if (!r.ok) throw new Error();
    return await r.json();
  } catch { return null; }
}
async function apiPost(url: string, body: any, opts: RequestInit = {}) {
  try {
    const r = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(opts.headers||{}) },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error();
    return await r.json();
  } catch { return null; }
}

export default function Page() {
  const router = useRouter();

  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [q, setQ] = useState("");

  // 각 행 담당자 입력 ref
  const nameRefs = useRef<Record<string, HTMLInputElement|null>>({});

  async function loadAll() {
    setLoading(true);
    const [pRes, aRes] = await Promise.all([
      apiGet("/api/users/pending",  { headers: { "x-role":"admin" } }),
      apiGet("/api/users/approved", { headers: { "x-role":"admin" } }),
    ]);
    const reachable = (pRes !== null) || (aRes !== null);
    setApiAvailable(reachable);

    setPending(Array.isArray(pRes) ? pRes : []);
    setApproved(Array.isArray(aRes) ? dedupeById(aRes) : []);
    setLoading(false);
  }
  useEffect(()=>{ loadAll(); }, []);

  async function approve(ident: string) {
    const input = nameRefs.current[ident];
    const displayName = input?.value?.trim() || "";
    if (!displayName) { alert("담당자 이름을 입력하세요."); input?.focus(); return; }

    const payload: any = { displayName };
    if (ident.includes("@")) payload.email = ident; else payload.id = ident;

    const ok = await apiPost("/api/users/approve", payload, { headers:{ "x-role":"admin" } });
    if (!ok) { alert("승인 실패"); return; }

    // ✅ ‘사이트 담당자’ 연동: 최근 승인자의 이름을 저장
    try { localStorage.setItem(SITE_MANAGER_KEY, displayName); } catch {}

    // UI 업데이트
    setPending(p => p.filter(u => norm(u.email||u.id) !== norm(ident)));
    setApproved(a => dedupeById([{ id: ident, email: ident.includes("@")?ident:undefined, displayName, status:"approved" }, ...a]));
  }

  async function reject(ident: string) {
    // 단순히 목록에서만 제거 (API가 있으면 여기 연결)
    setPending(p => p.filter(u => norm(u.email||u.id) !== norm(ident)));
  }

  async function removeUser(ident: string) {
    if (!confirm(`정말 삭제할까요?\n${ident}`)) return;
    // 먼저 UI에서 제거
    setPending(p => p.filter(u => norm(u.email||u.id) !== norm(ident)));
    setApproved(a => a.filter(u => norm(u.email||u.id) !== norm(ident)));

    // API 삭제 (POST /api/users/remove 또는 DELETE /api/users?id=…)
    let ok = false;
    const res1 = await apiPost("/api/users/remove", ident.includes("@") ? { email: ident } : { id: ident }, { headers:{ "x-role":"admin"} });
    if (res1 && res1.ok !== false) ok = true;
    if (!ok) {
      const r = await fetch(`/api/users?${ident.includes("@") ? `email=${encodeURIComponent(ident)}` : `id=${encodeURIComponent(ident)}`}`, {
        method:"DELETE", cache:"no-store", headers:{ "x-role":"admin" }
      });
      ok = r.ok;
    }
    if (!ok) { alert("삭제 실패. 새로고침 후 다시 시도하세요."); await loadAll(); }
  }

  const filtered = useMemo(()=>{
    const kw = q.trim().toLowerCase();
    if (!kw) return pending;
    return pending.filter(u =>
      (u.name||"").toLowerCase().includes(kw) ||
      (u.email||u.id||"").toLowerCase().includes(kw) ||
      (u.phone||"").toLowerCase().includes(kw)
    );
  }, [pending, q]);

  return (
    <main className="wrap">
      <div className="topbar">
        <button className="back" onClick={()=>router.push("/settings")}><span className="arrow">←</span> 설정으로</button>
        <div className="title">승인 관리</div>
        <div/>
      </div>

      <div className="info">
        <span className="chip">{apiAvailable ? "API 연결됨" : "API 미연결"}</span>
        <button className="mini" style={{marginLeft:8}} onClick={loadAll} disabled={loading}>{loading?"새로고침 중…":"새로고침"}</button>
      </div>

      {/* 검색 */}
      <div className="searchrow">
        <input className="search" placeholder="이름/이메일/전화 검색" value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      {/* 대기 목록 */}
      <section className="cardbox">
        <div className="cardtitle">대기 중({filtered.length}명)</div>
        {loading ? <div className="empty">불러오는 중…</div> :
        filtered.length===0 ? <div className="empty">대기 중인 요청이 없습니다.</div> :
        <table className="table">
          <thead>
            <tr>
              <th style={{width:140}}>신청자</th>
              <th>이메일/ID</th>
              <th style={{width:180}}>사이트 담당자(이름)</th>
              <th style={{width:230}}>작업</th>
              <th style={{width:90}}>삭제</th> {/* ✅ 삭제 칼럼 */}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u=>{
              const ident = u.email || u.id;
              return (
                <tr key={ident}>
                  <td className="bold">{u.name || "-"}</td>
                  <td className="muted">{ident}{u.phone?` · ${u.phone}`:""}</td>
                  <td>
                    <input
                      ref={el => (nameRefs.current[ident] = el)}
                      className="search" placeholder="담당자 이름"
                      defaultValue={u.displayName || u.name || ""}
                      onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); approve(ident); } }}
                    />
                  </td>
                  <td>
                    <div className="rowbtns">
                      <button className="mini on" onClick={()=>approve(ident)}>승인</button>
                      <button className="mini" onClick={()=>reject(ident)}>거절</button>
                    </div>
                  </td>
                  <td>
                    <button className="mini danger" onClick={()=>removeUser(ident)}>삭제</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </section>

      {/* 승인된 직원(요약) */}
      <section className="cardbox">
        <div className="cardtitle">최근 승인</div>
        {approved.length===0 ? <div className="empty">데이터 없음</div> :
          <ul className="flatlist">
            {approved.slice(0,8).map(a=>{
              const key = a.id || a.email;
              return (
                <li key={key} className="row">
                  <span className="name">{a.displayName || a.name || key}</span>
                  <span className="sep">—</span>
                  <span className="meta">{a.email || a.id}</span>
                </li>
              );
            })}
          </ul>
        }
      </section>

      <style jsx>{`
        .wrap{min-height:100svh;padding:12px;color:var(--fg)}
        .topbar{display:grid;grid-template-columns:auto 1fr auto;align-items:center;margin-bottom:12px}
        .title{font-weight:900;text-align:center}
        .back{border:1px solid var(--border);background:var(--card);border-radius:10px;padding:8px 12px}
        .info{margin-bottom:8px}
        .chip{display:inline-block;font-size:12px;border:1px solid var(--border);border-radius:999px;padding:4px 8px;background:var(--card)}
        .mini{border:1px solid var(--border);background:var(--card);border-radius:8px;padding:6px 8px;cursor:pointer}
        .mini.on{background:var(--accent); color:#fff; border-color:transparent}
        .mini.danger{border-color:#ef4444}
        .searchrow{margin:8px 0}
        .search{border:1px solid var(--border);border-radius:10px;padding:8px 10px;width:100%}
        .cardbox{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden;margin-bottom:12px}
        .cardtitle{font-weight:800;padding:10px 12px;border-bottom:1px solid var(--border)}
        .empty{padding:26px;text-align:center;opacity:.7}
        .table{width:100%;border-collapse:separate;border-spacing:0}
        th, td{padding:10px;border-bottom:1px solid var(--border);vertical-align:middle}
        th{background:var(--card-contrast);text-align:left}
        .bold{font-weight:800}
        .muted{opacity:.7;font-size:12px}
        .rowbtns{display:flex;gap:8px;flex-wrap:wrap}
        .flatlist{list-style:none;margin:0;padding:10px;display:flex;flex-direction:column;gap:8px}
        .row{display:flex;gap:10px;align-items:center;border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card)}
        .name{font-weight:800}
        .sep{opacity:.6}
        .meta{font-size:12px;opacity:.7}
      `}</style>
    </main>
  );
}
