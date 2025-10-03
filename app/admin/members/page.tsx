"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ===== 로컬 키 ===== */
const USERS_KEY = "daesu:users";
const SITE_MANAGER_KEY = "daesu:site:managerName";

/** ===== 유틸 ===== */
const norm = (s?: string) => (s || "").trim().toLowerCase();
const dedupeById = (arr: any[]) => {
  const seen = new Set<string>(); const out: any[] = [];
  for (const x of arr || []) {
    const k = norm(x?.id || x?.email);
    if (!k) continue;
    if (!seen.has(k)) { seen.add(k); out.push({ ...x, id: x.id || x.email }); }
  }
  return out;
};
const loadUsers = (): any[] => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
};
const saveUsers = (a: any[]) => {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(a)); } catch {}
};

// API 응답 언랩 + 공통 사용자 맵
function getItems(res: any) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}
function mapUser(u: any, fallbackStatus: string) {
  return {
    id: u.id || u.email || u._id || "",
    email: u.email || "",
    name: u.name || u.displayName || "",
    displayName: u.displayName || u.name || "",
    phone: u.phone || "",
    birth: u.birth ?? null,
    joinDate: u.joinDate ?? null,
    status: u.status || fallbackStatus,
    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null,
  };
}

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

  const [pending, setPending]   = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [q, setQ] = useState("");

  // 각 행 담당자 입력 ref
  const nameRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /** === 목록 로딩: API -> 실패 시 로컬 폴백 === */
  async function loadAll() {
    setLoading(true);

    const [pRes, aRes] = await Promise.all([
      apiGet("/api/users/pending",  { headers: { "x-role":"admin" } }),
      apiGet("/api/users/approved", { headers: { "x-role":"admin" } }),
    ]);

    const reachable = (pRes !== null) || (aRes !== null);
    setApiAvailable(reachable);

    if (reachable) {
      const pItems = getItems(pRes).map((u:any)=>mapUser(u,"pending"));
      const aItems = getItems(aRes).map((u:any)=>mapUser(u,"approved"));
      setPending(pItems);
      setApproved(dedupeById(aItems));
    } else {
      // ✅ 로컬 폴백
      const local = loadUsers();
      const pLocal = (local || [])
        .filter((u: any) => (u.status || "pending") === "pending")
        .map((u: any) => ({
          id: u.id, email: u.email || (u.id ? `${u.id}@example.com` : undefined),
          name: u.name, displayName: u.name || "", phone: u.phone,
          status: "pending",
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        }));
      const aLocal = (local || [])
        .filter((u: any) => (u.status || "") === "approved")
        .map((u: any) => ({
          id: u.id, email: u.email, name: u.name,
          displayName: u.name || u.id, phone: u.phone,
          status: "approved",
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        }));
      setPending(pLocal);
      setApproved(dedupeById(aLocal));
    }
    setLoading(false);
  }
  useEffect(()=>{ loadAll(); }, []);

  /** === 승인 === */
  async function approve(ident: string) {
    const input = nameRefs.current[ident] || null;
    const displayName = input?.value?.trim() || "";
    if (!displayName) { alert("담당자 이름을 입력하세요."); input?.focus(); return; }

    // 백엔드는 userId 또는 email을 받지만, 우리는 안정적으로 email만 사용
    const email = ident.includes("@") ? ident : "";
    if (!email) { alert("이메일이 없어 승인할 수 없습니다."); return; }

    let ok = false;
    if (apiAvailable) {
      const res = await apiPost("/api/users/approve", { email, displayName }, { headers:{ "x-role":"admin" } });
      ok = !!(res && res.ok !== false);
    } else {
      // ✅ 로컬 폴백
      const cur = loadUsers();
      const key = norm(email);
      const next = cur.map(u =>
        (norm(u.email)===key || norm(u.id)===key)
          ? { ...u, status: "approved", name: displayName || u.name, updatedAt: new Date().toISOString() }
          : u
      );
      saveUsers(next);
      ok = true;
    }

    if (!ok) { alert("승인 실패"); return; }

    try { localStorage.setItem(SITE_MANAGER_KEY, displayName); } catch {}

    // UI 업데이트
    setPending(p => p.filter(u => norm(u.email||u.id) !== norm(ident)));
    setApproved(a => dedupeById([{ id: email, email, displayName, status:"approved" }, ...a]));
  }

  /** === 거절(로컬 전용) === */
  function reject(ident: string) {
    if (apiAvailable) {
      // 필요 시 /api/users/reject 연동. 지금은 UI 제거만.
    } else {
      const cur = loadUsers();
      const key = norm(ident);
      const next = cur.map(u =>
        (norm(u.id)===key || norm(u.email)===key)
          ? { ...u, status: "rejected", updatedAt: new Date().toISOString() }
          : u
      );
      saveUsers(next);
    }
    setPending(p => p.filter(u => norm(u.email||u.id) !== norm(ident)));
  }

  /** === 삭제 === */
  async function removeUser(ident: string) {
    if (!confirm(`정말 삭제할까요?\n${ident}`)) return;

    // 먼저 UI에서 제거
    setPending(p => p.filter(u => norm(u.email||u.id) !== norm(ident)));
    setApproved(a => a.filter(u => norm(u.email||u.id) !== norm(ident)));

    let ok = false;
    if (apiAvailable) {
      const res1 = await apiPost("/api/users/remove", ident.includes("@") ? { email: ident } : { id: ident }, { headers:{ "x-role":"admin"} });
      ok = !!(res1 && res1.ok !== false);
      if (!ok) {
        const r = await fetch(`/api/users?${ident.includes("@") ? `email=${encodeURIComponent(ident)}` : `id=${encodeURIComponent(ident)}`}`, {
          method:"DELETE", cache:"no-store", headers:{ "x-role":"admin" }
        });
        ok = r.ok;
      }
    } else {
      const cur = loadUsers();
      const key = norm(ident);
      const next = (cur || []).filter(u => norm(u.id)!==key && norm(u.email)!==key);
      saveUsers(next);
      ok = true;
    }

    if (!ok) {
      alert("삭제 실패. 새로고침 후 다시 시도하세요.");
      await loadAll();
    }
  }

  /** === 검색 필터 === */
  const filtered = useMemo(()=>{
    const kw = q.trim().toLowerCase();
    if (!kw) return pending;
    return pending.filter(u =>
      (u.name||"").toLowerCase().includes(kw) ||
      (u.displayName||"").toLowerCase().includes(kw) ||
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
        <span className="chip">{apiAvailable ? "API 연결됨" : "로컬 폴백"}</span>
        <button className="mini" style={{marginLeft:8}} onClick={loadAll} disabled={loading}>{loading?"새로고침 중…":"새로고침"}</button>
      </div>

      {/* 검색 */}
      <div className="searchrow">
        <input className="search" placeholder="이름/담당자/이메일/전화 검색" value={q} onChange={e=>setQ(e.target.value)} />
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
              <th style={{width:200}}>사이트 담당자(이름)</th>
              <th style={{width:230}}>작업</th>
              <th style={{width:90}}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u=>{
              const ident = u.email || u.id;
              return (
                <tr key={ident}>
                  <td className="bold">{u.name || "-"}</td>
                  <td className="muted">
                    {ident}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </td>
                  <td>
                    <input
                      ref={(el) => {
                        if (el) nameRefs.current[ident] = el;
                        else delete nameRefs.current[ident];
                      }}
                      className="search"
                      placeholder="담당자 이름"
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
            {approved.slice(0,12).map(a=>{
              const key = a.id || a.email;
              return (
                <li key={key} className="row">
                  <span className="name">{a.displayName || a.name || key}</span>
                  <span className="sep">—</span>
                  <span className="meta">{a.email || a.id}</span>
                  {a.phone && <span className="meta"> · {a.phone}</span>}
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
