"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* utils */
const toYMD = (d=new Date())=>{
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const fmtPhone = (v) => {
  const digits = String(v||"").replace(/\D/g,"").slice(0,11); // 최대 11자리
  const a = digits.slice(0,3);
  const b = digits.slice(3,7);
  const c = digits.slice(7,11);
  if (digits.length <= 3) return a;
  if (digits.length <= 7) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
};

export default function SignUpPage(){
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");      // YYYY-MM-DD
  const [joinDate, setJoinDate] = useState(""); // 고정: 오늘
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  // 입사일은 오늘 날짜로 고정
  useEffect(()=>{ setJoinDate(toYMD(new Date())); },[]);

  const canSubmit = useMemo(()=>{
    return (
      email.trim() &&
      pw.length >= 4 &&
      pw === pw2 &&
      name.trim() &&
      /^\d{3}-\d{4}-\d{4}$/.test(phone) &&   // 3-4-4
      /^\d{4}-\d{2}-\d{2}$/.test(birth) &&
      joinDate // 이미 오늘자로 세팅됨
    );
  },[email,pw,pw2,name,phone,birth,joinDate]);

  async function onSubmit(e){
    e.preventDefault();
    if (!canSubmit || busy) return;
    setErr(""); setOk(false); setBusy(true);
    try {
      const r = await fetch("/api/users", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          email,
          password: pw,
          birth,
          joinDate,   // 서버에는 고정된 오늘 날짜 전송
          name,
          phone
        })
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j?.ok===false) {
        setErr(j?.message || "가입 신청에 실패했습니다.");
      } else {
        setOk(true);
        // 잠깐 안내 후 로그인 페이지로 이동
        setTimeout(()=>router.replace("/sign-in"), 900);
      }
    } catch {
      setErr("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{minHeight:"100svh",display:"grid",placeItems:"center",background:"#f7f8f9"}}>
      <form onSubmit={onSubmit} style={{width:420,maxWidth:"96%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16,boxShadow:"0 10px 30px rgba(0,0,0,.06)"}}>
        <h1 style={{textAlign:"center",fontWeight:900,margin:"6px 0 14px"}}>회원가입</h1>

        <label className="lb">아이디 *이메일형식 <span style={{color:"#9ca3af"}}>(ex apple@naver.com)</span></label>
        <input className="ip" type="email" placeholder="이메일" value={email} onChange={e=>setEmail(e.target.value.trim())} />

        <label className="lb">비밀번호 <span style={{color:"#9ca3af"}}>(4자리 이상)</span></label>
        <input className="ip" type="password" value={pw} onChange={e=>setPw(e.target.value)} />

        <label className="lb">비밀번호 확인</label>
        <input className="ip" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} />

        <label className="lb">성함</label>
        <input className="ip" value={name} onChange={e=>setName(e.target.value)} />

        <label className="lb">연락처 <span style={{color:"#9ca3af"}}>(자동으로 000-0000-0000 형식)</span></label>
        <input
          className="ip"
          inputMode="numeric"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e)=> setPhone(fmtPhone(e.target.value))}
        />

        <label className="lb">생년월일</label>
        <input className="ip" type="date" value={birth} onChange={e=>setBirth(e.target.value)} />

        <label className="lb">입사일(가입일)</label>
        <input className="ip" type="date" value={joinDate} readOnly disabled />

        {!!err && <div style={{color:"#b91c1c",fontSize:13,marginTop:6}}>{err}</div>}
        {ok &&  <div style={{color:"#065f46",fontSize:13,marginTop:6}}>가입 승인 요청이 접수되었습니다. 곧 이동합니다…</div>}

        <button className="btn" type="submit" disabled={!canSubmit || busy}>
          {busy ? "처리 중…" : "회원가입 신청"}
        </button>

        <div style={{textAlign:"center",marginTop:10,fontSize:13}}>
          이미 계정이 있어요 (로그인) → <a href="/sign-in">로그인</a>
        </div>
      </form>

      <style jsx>{`
        .lb{display:block;margin:8px 0 6px;font-size:13.5px;color:#374151}
        .ip{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:10px}
        .ip[disabled]{background:#f3f4f6;color:#6b7280;cursor:not-allowed}
        .btn{width:100%;margin-top:12px;border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:10px;font-weight:800;cursor:pointer}
        .btn[disabled]{opacity:.55;cursor:not-allowed}
        .btn:not([disabled]):hover{filter:brightness(1.06)}
      `}</style>
    </main>
  );
}
