"use client";
import { useState } from "react";

export default function ImportPage() {
  const [text, setText] = useState("");
  const [token, setToken] = useState("");

  function loadFromThisBrowser() {
    const payload = {
      clients:   JSON.parse(localStorage.getItem("daesu:clients")   || "[]"),
      inquiries: JSON.parse(localStorage.getItem("daesu:inquiries") || "[]"),
      listings:  JSON.parse(localStorage.getItem("daesu:listings")  || "[]"),
    };
    setText(JSON.stringify(payload, null, 2));
  }

  function chooseFile() {
    const i = document.createElement("input");
    i.type = "file"; i.accept = ".json,application/json";
    i.onchange = () => {
      const f = i.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => setText(String(r.result || ""));
      r.readAsText(f, "utf-8");
    };
    i.click();
  }

  async function sendToDB() {
    try {
      const body = JSON.parse(text || "{}");
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token }),
      });
      const j = await res.json();
      alert(j.ok ? "DB 저장 완료! 페이지를 새로고침하세요." : "실패: " + j.error);
    } catch (e: any) {
      alert("JSON 오류: " + (e?.message || e));
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>데이터 가져오기 (localStorage → DB)</h1>
      <div style={{display:"flex", gap:8, marginBottom: 8}}>
        <button onClick={loadFromThisBrowser}>이 브라우저에서 불러오기</button>
        <button onClick={chooseFile}>파일 선택(daesu-export.json)</button>
      </div>
      <input
        placeholder="SEED_TOKEN"
        value={token}
        onChange={e=>setToken(e.target.value)}
        style={{width:"100%", padding:8, fontFamily:"monospace", marginBottom:8}}
      />
      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder='{"clients":[...],"inquiries":[...],"listings":[...]}'
        rows={18}
        style={{width:"100%", fontFamily:"monospace"}}
      />
      <div style={{marginTop:8}}>
        <button onClick={sendToDB}>DB로 저장</button>
      </div>
      <p style={{opacity:.6, marginTop:8}}>
        Tip: 개발(데이터 있는) 탭에서도 이 페이지를 열어 "이 브라우저에서 불러오기" 후 JSON을 복사/파일저장하고,
        프로덕션에서 파일 선택 또는 붙여넣기로 DB에 저장하세요.
      </p>
    </div>
  );
}
