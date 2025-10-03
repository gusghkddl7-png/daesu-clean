"use client";

import { useEffect, useMemo, useState } from "react";

/** /api/staff 응답 포맷:
 *  - { ok:true, items:[{ id, email, label, name, displayName }] }
 *  - 또는 배열 그대로 [{ email, displayName, name, ...}]
 */
type StaffRow = {
  email?: string;
  id?: string;
  displayName?: string;
  name?: string;
  phone?: string;
  [k: string]: any;
};

type StaffItem = {
  id: string;       // 내부 키 (email 사용)
  email: string;
  label: string;    // 표시 텍스트: displayName > name > email
  name?: string;
  displayName?: string;
};

type Props = {
  value?: string;                         // 선택된 이메일
  onChange: (email: string) => void;      // 변경 콜백
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;                   // 상단 검색창 사용
  allowClear?: boolean;                   // '담당자 없음' 허용
  name?: string;                          // form 연동 hidden input name
  label?: string;                         // 라벨
  helpText?: string;                      // 도움말
  disabled?: boolean;
};

export default function AssigneeSelect({
  value,
  onChange,
  placeholder = "담당자 검색",
  required = false,
  searchable = true,
  allowClear = true,
  name,
  label,
  helpText,
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StaffItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // 승인된 직원 목록 로드 (/api/staff -> displayName 기준 정렬)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/staff", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();

        const rows: StaffRow[] = Array.isArray(data) ? data : (data?.items || []);
        const mapped: StaffItem[] = (rows || [])
          .map((x) => {
            const email = String(x.email || x.id || "").trim().toLowerCase();
            if (!email) return null;
            const label = String(x.displayName || x.name || email);
            return { id: email, email, label, name: x.name, displayName: x.displayName } as StaffItem;
          })
          .filter(Boolean) as StaffItem[];

        // 중복 제거(이메일 기준)
        const seen = new Set<string>();
        const deduped: StaffItem[] = [];
        for (const it of mapped) {
          if (!seen.has(it.email)) { seen.add(it.email); deduped.push(it); }
        }

        if (alive) {
          deduped.sort((a, b) => a.label.localeCompare(b.label, "ko"));
          setItems(deduped);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || "불러오기 실패");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 검색 필터
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((it) =>
      it.label.toLowerCase().includes(kw) ||
      it.email.toLowerCase().includes(kw)
    );
  }, [items, q]);

  return (
    <div className="assignee-wrap">
      {label && <div className="assignee-label">{label}</div>}

      {searchable && (
        <input
          className="search"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled || loading}
          aria-label="담당자 검색"
          style={{ marginBottom: 6 }}
        />
      )}

      <select
        className="search"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled || loading || !!error}
        aria-label="담당자 선택"
      >
        {allowClear && <option value="">{loading ? "불러오는 중…" : "담당자 없음"}</option>}
        {error && <option value="" disabled>불러오기 오류: {error}</option>}
        {!error && !loading && filtered.length === 0 && (
          <option value="" disabled>검색 결과 없음</option>
        )}
        {filtered.map((it) => (
          <option key={it.email} value={it.email}>
            {it.label}
          </option>
        ))}
      </select>

      {!!helpText && <div className="assignee-help">{helpText}</div>}
      {name && <input type="hidden" name={name} value={value || ""} />}

      <style jsx>{`
        .assignee-wrap{display:grid;gap:6px}
        .assignee-label{font-weight:700;font-size:13px}
        .assignee-help{font-size:12px;opacity:.7}
        .search{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card);color:var(--fg)}
      `}</style>
    </div>
  );
}
