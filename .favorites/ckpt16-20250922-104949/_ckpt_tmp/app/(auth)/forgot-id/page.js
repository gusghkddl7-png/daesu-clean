"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
function loadUsers(){ try{ return JSON.parse(localStorage.getItem("daesu:users")||"[]"); }catch{return[];} }

export default function FindId(){
  const router = useRouter();
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [result,setResult] = useState("");

  function onSubmit(e){
    e.preventDefault();
    const u = loadUsers().find(x=>x.name===name && x.phone===phone);
    setResult(u ? `\uC544\uC774\uB514\uB294 "${u.id}" \uC785\uB2C8\uB2E4.` : "\uC77C\uCE58\uD558\uB294 \uAC00\uC785 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  }

  return (
    <div className="screen">
      <div className="card">
        <div className="title">{'\uC544\uC774\uB514 \uCC3E\uAE30'}</div>
        <form className="form" onSubmit={onSubmit}>
          <div className="row"><label>{'\uC131\uD568'}</label><input value={name} onChange={e=>setName(e.target.value)} required/></div>
          <div className="row"><label>{'\uC5F0\uB77D\uCC98'}</label><input value={phone} onChange={e=>setPhone(e.target.value)} required/></div>
          <div className="btns">
            <button className="btn primary" type="submit">{'\uCC3E\uAE30'}</button>
            <button type="button" className="btn ghost" onClick={()=>router.push("/sign-in")}>{'\uB85C\uADF8\uC778\uC73C\uB85C'}</button>
          </div>
        </form>
        {result && <div className="note">{result}</div>}
      </div>
      <style jsx>{`
        .screen{min-height:100svh;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111}
        .card{width:min(560px,92vw);border-radius:24px;padding:32px 28px 28px;background:#fff;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .title{font-size:22px;font-weight:800;margin-bottom:14px;color:#111}
        .form{display:grid;gap:12px}.row{display:grid;gap:6px}
        label{font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#555}
        input{width:100%;background:#fff;border:1px solid #d1d5db;border-radius:12px;color:#111;padding:12px 14px;outline:none;transition:.2s}
        input:focus{border-color:#111;box-shadow:0 0 0 3px rgba(0,0,0,.1)}
        .btns{display:flex;gap:10px;justify-content:space-between;margin-top:6px;flex-wrap:wrap}
        .btn{display:inline-flex;justify-content:center;align-items:center;padding:12px 14px;border-radius:12px;font-weight:800;letter-spacing:.2px;text-decoration:none;cursor:pointer}
        .btn.primary{flex:1 1 160px;border:1px solid #111;background:#111;color:#fff}
        .btn.primary:hover{filter:brightness(1.06)}
        .btn.ghost{flex:1 1 140px;border:1px dashed rgba(0,0,0,.5);background:transparent;color:#111;text-align:center}
        .btn.ghost:hover{border-style:solid}
        .note{margin-top:10px;font-size:13px;opacity:.9}
      `}</style>
    </div>
  );
}