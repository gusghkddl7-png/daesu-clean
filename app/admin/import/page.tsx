"use client";
import { useEffect, useMemo, useState } from "react";

type DatasetMap = Record<string, any[]>;

// 기본 제외(이미 DB로 동작하는 영역)
const DEFAULT_EXCLUDE = new Set<string>(["billing","payments","users","auth","sessions"]);

export default function ImportPage() {
  const [text, setText] = useState("");
  const [token, setToken] = useState("");
  const [detected, setDetected] = useState<DatasetMap>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // daesu:* 모든 키 스캔
  function scanLocal() {
    const map: DatasetMap = {};
    const keys = Object.keys(localStorage).filter(k => k.startsWith("daesu:"));
    for (const k of keys) {
      const name = k.replace(/^daesu:/, ""); // 컬렉션 이름
      try {
        const arr = JSON.parse(localStorage.getItem(k) || "[]");
        if (Array.isArray(arr)) map[name] = arr;
      } catch {}
    }
    setDetected(map);
    // 기본 체크 상태: 기본 제외는 false, 나머지는 값이 있으면 true
    const ck: Record<string, boolean> = {};
    for (const [name, arr] of Object.entries(map)) {
      ck[name] = !DEFAULT_EXCLUDE.has(name) && Array.isArray(arr) && arr.length > 0;
    }
    setChecked(ck);
    setText(JSON.stringify({ datasets: map }, null, 2));
  }

  function chooseFile() {
    const i = document.createElement("input");
    i.type = "file"; i.accept = ".json,application/json";
    i.onchange = () => {
      const f = i.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const raw = String(r.result || "");
        setText(raw);
        try {
          const parsed = JSON.parse(raw);
          const m = (parsed?.datasets) || {};
          setDetected(m);
          const ck: Record<string, boolean> = {};
          for (const [name, arr] of Object.entries(m)) {
            ck[name] = !DEFAULT_EXCLUDE.has(name) && Array.isArray(arr) && arr.length > 0;
          }
          setChecked(ck);
        } catch {}
      };
      r.readAsText(f, "utf-8");
    };
    i.click();
  }

  async function sendToDB() {
    try {
      const base = JSON.parse(text || "{}");
      const datasets: DatasetMap = base?.datasets || detected;
      const include = Object.entries(checked).filter(([k,v])=>v).map(([k])=>k);
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasets, include, token }),
      });
      const j = await res.json();
      alert(j.ok ? "DB 저장 완료!\n" + JSON.stringify(j.summary, null, 2) : "실패: " + j.error);
    } catch (e: any) {
      alert("오류: " + (e?.message || e));
    }
  }

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k,v] of Object.entries(detected)) out[k] = Array.isArray(v) ? v.length : 0;
    return out;
  }, [detected]);

  return (
    <div style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>데이터 가져오기 (localStorage → DB, 다폼 지원)</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={scanLocal}>이 브라우저 전체 스캔(daesu:*)</button>
        <button onClick={chooseFile}>파일 선택(daesu-export.json)</button>
      </div>

      <input
        placeholder="SEED_TOKEN (있으면 입력, 없으면 비워두세요)"
        value={token}
        onChange={e=>setToken(e.target.value)}
        style={{width:"100%", padding:8, fontFamily:"monospace", marginBottom:8}}
      />

      {/* 체크박스 리스트 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:8 }}>
        {Object.keys(detected).length === 0 ? (
          <div style={{gridColumn:"1 / -1", opacity:.6}}>감지된 daesu:* 키가 없습니다. 상단 버튼으로 스캔하거나 파일을 선택하세요.</div>
        ) : Object.entries(counts).map(([name, n]) => (
          <label key={name} style={{ display:"flex", alignItems:"center", gap:8, padding:8, border:"1px solid #eee", borderRadius:8 }}>
            <input
              type="checkbox"
              checked={!!checked[name]}
              onChange={e=>setChecked(prev=>({ ...prev, [name]: e.target.checked }))}
            />
            <span style={{fontWeight:600}}>{name}</span>
            <span style={{opacity:.6}}>{n}건</span>
            {DEFAULT_EXCLUDE.has(name) && <span style={{fontSize:12, color:"#c00"}}>(기본 제외)</span>}
          </label>
        ))}
      </div>

      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder='{"datasets":{"clients":[...],"inquiries":[...],"listings":[...],"schedules":[...],...}}'
        rows={14}
        style={{width:"100%", fontFamily:"monospace"}}
      />
      <div style={{marginTop:8}}>
        <button onClick={sendToDB}>DB로 저장</button>
      </div>

      <p style={{opacity:.6, marginTop:8}}>
        기본 제외: billing/payments/users/auth/sessions. 필요 시 체크로 포함/제외를 바꿀 수 있습니다.
      </p>
    </div>
  );
}
