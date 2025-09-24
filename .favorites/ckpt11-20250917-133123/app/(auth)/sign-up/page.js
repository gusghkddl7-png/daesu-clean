"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function loadUsers(){ try{ return JSON.parse(localStorage.getItem("daesu:users")||"[]"); }catch{return[];} }
function saveUsers(v){ try{ localStorage.setItem("daesu:users", JSON.stringify(v)); }catch{} }

export default function SignUp(){
  const router = useRouter();
  const [f,setF] = useState({ id:"", password:"", confirm:"", name:"", phone:"" });
  const [msg,setMsg] = useState(null);
  const [err,setErr] = useState(null);
  const match = f.password && f.confirm && f.password===f.confirm;

  function onSubmit(e){
    e.preventDefault();
    setErr(null); setMsg(null);
    if(!match){ setErr("\uBE44\uBC00\uBC88\uD638\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."); return; }
    const users = loadUsers();
    if(users.find(u=>u.id===f.id)){ setErr("\uC774\uBBF8 \uC874\uC7AC\uD558\uB294 \uC544\uC774\uB514\uC785\uB2C8\uB2E4."); return; }
    users.push({ id:f.id, password:f.password, name:f.name, phone:f.phone, status:"pending" });
    saveUsers(users);
    setMsg("\uAC00\uC785 \uC2E0\uCCAD\uC774 \uC811\uC218\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uAD00\uB9AC\uC790 \uC2B9\uC778 \uB300\uAE30\uC911\uC785\uB2C8\uB2E4.");
  }

  return (
    <div className="screen">
      <div className="card">
        <div className="title">{'\uD68C\uC6D0\uAC00\uC785'}</div>
        <form className="form" onSubmit={onSubmit}>
          <div className="row"><label>{'\uC544\uC774\uB514'}</label><input value={f.id} onChange={e=>setF({...f,id:e.target.value})} required/></div>
          <div className="row"><label>{'\uBE44\uBC00\uBC88\uD638'}</label><input type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/></div>
          <div className="row"><label>{'\uBE44\uBC00\uBC88\uD638 \uD655\uC778'}</label><input type="password" value={f.confirm} onChange={e=>setF({...f,confirm:e.target.value})} required/></div>
          <div className="hint">{f.confirm ? (match ? <span className="ok">{'\uC77C\uCE58'}</span> : <span className="bad">{'\uBD88\uC77C\uCE58'}</span>) : null}</div>
          <div className="row"><label>{'\uC131\uD568'}</label><input value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/></div>
          <div className="row"><label>{'\uC5F0\uB77D\uCC98'}</label><input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} required/></div>
          {err && <div className="bad">{err}</div>}
          {msg && <div className="ok">{msg}</div>}
          <div className="btns">
            <button type="submit" className="btn primary">{'\uD68C\uC6D0\uAC00\uC785'}</button>
            <button type="button" className="btn ghost" onClick={()=>router.push("/sign-in")}>{'\uB85C\uADF8\uC778\uC73C\uB85C'}</button>
          </div>
        </form>
        <div className="note">{'\uAC00\uC785 \uD6C4 \uAD00\uB9AC\uC790 \uC2B9\uC778\uAE4C\uC9C0\uB294 \uB85C\uADF8\uC778\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'}</div>
      </div>
      <style jsx>{`
        .screen{min-height:100svh;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#fff,#f6f7f8);color:#111}
        .card{width:min(560px,92vw);border-radius:24px;padding:32px 28px 28px;background:#fff;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .title{font-size:22px;font-weight:800;margin-bottom:14px;color:#111}
        .form{display:grid;gap:12px}.row{display:grid;gap:6px}
        label{font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#555}
        input{width:100%;background:#fff;border:1px solid #d1d5db;border-radius:12px;color:#111;padding:12px 14px;outline:none;transition:.2s}
        input:focus{border-color:#111;box-shadow:0 0 0 3px rgba(0,0,0,.1)}
        .hint{font-size:12px;opacity:.9}.ok{color:#16a34a}.bad{color:#e11d48}
        .btns{display:flex;gap:10px;justify-content:space-between;margin-top:6px;flex-wrap:wrap}
        .btn{display:inline-flex;justify-content:center;align-items:center;padding:12px 14px;border-radius:12px;font-weight:800;letter-spacing:.2px;text-decoration:none;cursor:pointer}
        .btn.primary{flex:1 1 180px;border:1px solid #111;background:#111;color:#fff}
        .btn.primary:hover{filter:brightness(1.06)}
        .btn.ghost{flex:1 1 140px;border:1px dashed rgba(0,0,0,.5);background:transparent;color:#111;text-align:center}
        .btn.ghost:hover{border-style:solid}
        .note{margin-top:10px;font-size:13px;opacity:.9}
      `}</style>
    </div>
  );
}