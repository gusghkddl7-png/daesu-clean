"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ===== 상수/유틸 ===== */
const STORE_KEY = "daesu:contracts:docs";
const VIEW_KEY  = "daesu:contracts:view";
const CATS = ["전체문서","계약문서","허그/HF문서","LH/SH문서","보증보험문서","회사문서","기타문서"];

const fmtBytes = (n) => {
  n = Number(n || 0);
  if (!n) return "0 B";
  const u = ["B","KB","MB","GB"], i = Math.min(Math.floor(Math.log(n)/Math.log(1024)), u.length-1);
  return `${(n/Math.pow(1024,i)).toFixed(1)} ${u[i]}`;
};
const ymd = (iso) => (iso||"").slice(0,10);
function loadJSON(k, fb){ try{ return JSON.parse(localStorage.getItem(k)||"null") ?? fb; }catch{ return fb; } }
function saveJSON(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

/* url/mime 추출 */
function getUrlAndMime(row){
  let url = row?.url || row?.dataUrl || "";
  let mime = row?.mime || "";
  if (url && url.startsWith("data:")){
    const head = (url.split(",")[0]||"");
    const m = head.match(/^data:([^;]+)/);
    if (m) mime = m[1];
  }
  return { url, mime: mime || "application/octet-stream" };
}

/* Blob 다운로드 (data:도 지원) */
function downloadRow(row){
  const { url, mime } = getUrlAndMime(row);
  if(!url){ alert("파일 URL이 없습니다."); return; }
  const fileName = row.fileName || (row.title ? `${row.title}.bin` : "document");
  if (url.startsWith("data:")){
    try{
      const b64 = url.split(",")[1] || "";
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
      const blob = new Blob([u8], { type: mime });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 0);
      return;
    }catch{}
  }
  const a=document.createElement("a"); a.href=url; a.download=fileName; document.body.appendChild(a); a.click(); a.remove();
}

/* ===== API (있으면 사용, 없으면 로컬) ===== */
async function tryFetchList(){
  try{
    const r=await fetch("/api/contracts",{cache:"no-store",credentials:"include"});
    if(!r.ok) return null;
    const j=await r.json(); return Array.isArray(j)?j:null;
  }catch{ return null; }
}
async function tryUploadToServer(payload){
  try{
    const r=await fetch("/api/contracts",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"include",
      body:JSON.stringify(payload)
    });
    if(!r.ok) return null; return await r.json();
  }catch{ return null; }
}
async function tryUpdateOnServer(id, body){
  try{ const r=await fetch(`/api/contracts/${encodeURIComponent(id)}`,{
    method:"PUT",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(body)
  }); return r.ok; }catch{ return false; }
}
async function tryDeleteOnServer(id){
  try{ const r=await fetch(`/api/contracts/${encodeURIComponent(id)}`,{method:"DELETE",credentials:"include"}); return r.ok; }catch{ return false; }
}

/* ===== 미리보기(새 창) ===== */
function openPreviewWindow(row){
  const { url, mime } = getUrlAndMime(row);
  if(!url){ alert("미리보기할 파일이 없습니다."); return; }

  const w = 860, h = 640;
  const left = window.screenX + Math.max(0, (window.outerWidth - w)/2);
  const top  = window.screenY + Math.max(0, (window.outerHeight - h)/2);

  const win = window.open("", "daesu_doc_preview",
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,noopener`);
  if(!win){ alert("팝업이 차단되었습니다. 허용 후 다시 시도해주세요."); return; }

  const title = (row.title || row.fileName || "미리보기")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8">
<title>${title}</title>
<style>
  html,body{height:100%;margin:0}
  body{background:#0b0b0c;display:grid;grid-template-rows:auto 1fr;font:14px system-ui,Segoe UI,Arial}
  .bar{background:#111214;color:#f2f3f4;border-bottom:1px solid #2a2c2f;padding:8px 10px;display:flex;gap:8px;align-items:center}
  .bar .ttl{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%}
  .bar .sp{flex:1}
  .btn{background:#374151;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer}
  .wrap{width:100%;height:100%;background:#0b0b0c}
  iframe,img{width:100%;height:100%;border:0;object-fit:contain;background:#0b0b0c}
</style>
</head>
<body>
  <div class="bar">
    <div class="ttl">${title}</div>
    <div class="sp"></div>
    <button class="btn" onclick="window.close()">닫기</button>
  </div>
  <div class="wrap">
    ${/^image\//.test(mime) ? `<img src="${url}" alt="preview">` : `<iframe src="${url}"></iframe>`}
  </div>
</body></html>`);
  win.document.close();
}

/* ===== 메인 ===== */
export default function ContractsPage(){
  const router = useRouter();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 필터/검색/페이지
  const viewInit = loadJSON(VIEW_KEY, { cat:"전체문서", q:"", pageSize:50, page:1 });
  const [cat, setCat] = useState(viewInit.cat);
  const [q, setQ] = useState(viewInit.q);
  const [pageSize, setPageSize] = useState(viewInit.pageSize);
  const [page, setPage] = useState(viewInit.page);

  // 선택(다중)
  const [checked, setChecked] = useState(new Set());

  // 업로드 모달
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("계약문서");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  // 수정 모달
  const [edit, setEdit] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("계약문서");

  // 드롭존 하이라이트
  const [dragOver, setDragOver] = useState(false);
  const searchRef = useRef(null);

  /* 초기 로드 */
  useEffect(()=>{ (async()=>{
    let remote = await tryFetchList();
    if(remote){ setList(remote); setLoading(false); return; }
    setList(loadJSON(STORE_KEY, []));
    setLoading(false);
  })(); },[]);

  // 뷰 상태 저장
  useEffect(()=>{ saveJSON(VIEW_KEY, { cat, q, pageSize, page }); }, [cat,q,pageSize,page]);

  // 단축키
  useEffect(()=>{
    const onKey = (e) => {
      if (e.key === "/"){ e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key.toLowerCase() === "n"){ setOpen(true); }
      else if (e.key === "Escape"){ setOpen(false); setEdit(null); }
    };
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  },[]);

  function saveLocal(next){ setList(next); saveJSON(STORE_KEY, next); }

  /* 정렬/필터/검색 */
  const filtered = useMemo(()=>{
    let rows = [...list].sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (cat !== "전체문서") rows = rows.filter(r=>r.category===cat);
    const needle = q.trim().toLowerCase();
    if (needle){
      rows = rows.filter(r =>
        (r.title||"").toLowerCase().includes(needle) ||
        (r.fileName||"").toLowerCase().includes(needle)
      );
    }
    return rows;
  }, [list, cat, q]);

  // 페이지네이션
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(()=>{ if (page>totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageRows = useMemo(()=>{
    const start = (page-1)*pageSize;
    return filtered.slice(start, start+pageSize);
  }, [filtered, page, pageSize]);

  /* 업로드 공통 처리 */
  async function doUpload(selectedFile, forcedTitle, forcedCategory){
    if(!selectedFile){ alert("파일을 선택하세요."); return; }
    const t = (forcedTitle ?? title).trim();
    const c = forcedCategory ?? category;
    if(!t){ alert("문서명을 입력하세요."); return; }

    setBusy(true);
    try{
      const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      const dataUrl = await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(String(fr.result||"")); fr.onerror=()=>rej(new Error("파일 읽기 실패")); fr.readAsDataURL(selectedFile); });
      const payload = {
        id, title:t, category:c, createdAt:new Date().toISOString(),
        fileName:selectedFile.name, fileSize:selectedFile.size, mime:selectedFile.type||"application/octet-stream",
        dataUrl, uploader:"system"
      };
      const savedRemote = await tryUploadToServer(payload);
      saveLocal([savedRemote||payload, ...list]);
      if (!forcedTitle){ // 모달에서 올린 경우만 초기화
        setTitle(""); setCategory("계약문서"); setFile(null); if(fileRef.current) fileRef.current.value="";
        setOpen(false);
      }
    }catch(e){ alert("업로드 실패: "+(e?.message||String(e))); }
    finally{ setBusy(false); }
  }

  /* 업로드(모달) */
  async function handleSubmit(){ await doUpload(file); }

  /* 드래그&드롭 업로드 */
  const onDrop = async (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const f = e.dataTransfer?.files?.[0]; if(!f) return;
    const guessTitle = (f.name||"").replace(/\.[^.]+$/,"");
    await doUpload(f, guessTitle, "계약문서");
  };

  /* 붙여넣기 업로드 (이미지/PDF) */
  useEffect(()=>{
    const onPaste = async (e) => {
      const item = Array.from(e.clipboardData?.items||[]).find(x=>/^image\/|pdf$/.test(x.type));
      if (!item) return;
      const f = item.getAsFile(); if(!f) return;
      const guessTitle = `붙여넣기_${ymd(new Date().toISOString())}`;
      await doUpload(f, guessTitle, "기타문서");
    };
    window.addEventListener("paste", onPaste);
    return ()=> window.removeEventListener("paste", onPaste);
  }, [list]); // uses doUpload closure

  /* 다운로드/삭제/수정 */
  function handleDownload(row){ downloadRow(row); }
  async function handleDelete(row){
    if(!confirm(`삭제할까요?\n- ${row.title}\n- ${row.fileName}`)) return;
    await tryDeleteOnServer(row.id);
    saveLocal(list.filter(x=>x.id!==row.id));
    setChecked((s)=>{ const n=new Set(s); n.delete(row.id); return n; });
  }
  function openEdit(row){
    setEdit(row); setEditTitle(row.title||""); setEditCategory(row.category||"계약문서");
  }
  async function applyEdit(){
    if(!edit) return;
    const body = { ...edit, title:editTitle.trim()||edit.title, category:editCategory };
    await tryUpdateOnServer(edit.id, body);
    saveLocal(list.map(x=> x.id===edit.id ? body : x));
    setEdit(null);
  }

  /* 다중 선택 */
  const allInPageChecked = pageRows.length>0 && pageRows.every(r=>checked.has(r.id));
  const toggleAllInPage = () => {
    setChecked(prev=>{
      const next = new Set(prev);
      if (allInPageChecked){ pageRows.forEach(r=>next.delete(r.id)); }
      else { pageRows.forEach(r=>next.add(r.id)); }
      return next;
    });
  };
  async function deleteSelected(){
    if(checked.size===0){ alert("선택된 항목이 없습니다."); return; }
    if(!confirm(`${checked.size}건 삭제할까요?`)) return;
    const ids=[...checked];
    for(const id of ids){ await tryDeleteOnServer(id); }
    saveLocal(list.filter(x=>!checked.has(x.id)));
    setChecked(new Set());
  }

  /* 번호(내림차순) */
  const numberAt = (idxGlobal) => (filtered.length ? (filtered.length - idxGlobal) : 0);

  return (
    <main className="wrap"
      onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={onDrop}
    >
      {/* 헤더 */}
      <div className="topbar">
        <button className="back" onClick={()=>router.push("/dashboard")}><span className="arrow">←</span> 뒤로가기</button>
        <div className="title">계약/문서</div>
        <div className="rightOps">
          {checked.size>0 && <button className="danger mini" onClick={deleteSelected}>선택삭제({checked.size})</button>}
          <button className="primary" onClick={()=>setOpen(true)}>+ 추가 (n)</button>
        </div>
      </div>

      {/* 툴바 */}
      <section className="toolbar">
        <input ref={searchRef} className="search" placeholder="문서명/파일명 검색 (/ 로 포커스)" value={q} onChange={e=>{setQ(e.target.value); setPage(1);}} />
        <div className="pillbar">
          {CATS.map(c=>(
            <button key={c} className={`pill ${cat===c?"on":""}`} onClick={()=>{setCat(c); setPage(1);}}>{c}</button>
          ))}
        </div>
        <div className="sp"></div>
        <div className="pager">
          <select className="search" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value)||50); setPage(1);}}>
            <option value={50}>50개</option>
            <option value={100}>100개</option>
            <option value={200}>200개</option>
          </select>
          <div className="pgbtns">
            <button className="mini" onClick={()=>setPage(p=>Math.max(1,p-1))}>◀</button>
            <span className="muted">{page} / {totalPages}</span>
            <button className="mini" onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>▶</button>
          </div>
        </div>
      </section>

      {/* 드롭존 안내 */}
      {dragOver && (
        <div className="dropzone">여기에 파일을 놓아 업로드</div>
      )}

      {/* 카운트 */}
      <div className="countbar"><span className="icon">📄</span> <b>{cat}</b> <span className="muted">{filtered.length}건</span></div>

      {/* 표 목록 */}
      <section className="card">
        <div className="table-wrap">
          <table className="tbl">
            <colgroup>
              <col style={{width:"50px"}}/>{/* 체크 */}
              <col style={{width:"80px"}}/>{/* 번호 */}
              <col />{/* 제목 */}
              <col style={{width:"160px"}}/>{/* 분류 */}
              <col style={{width:"130px"}}/>{/* 등록일 */}
              <col style={{width:"280px"}}/>{/* 작업 */}
            </colgroup>
            <thead>
              <tr>
                <th className="center"><input type="checkbox" checked={allInPageChecked} onChange={toggleAllInPage}/></th>
                <th>번호</th>
                <th>제목</th>
                <th>분류</th>
                <th>등록일자</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={6} className="empty">불러오는 중…</td></tr>)}
              {!loading && pageRows.length===0 && (<tr><td colSpan={6} className="empty">데이터가 없습니다.</td></tr>)}
              {!loading && pageRows.map((row, i)=>(
                <tr key={row.id}>
                  <td className="center">
                    <input
                      type="checkbox"
                      checked={checked.has(row.id)}
                      onChange={(e)=>{
                        setChecked(prev=>{ const next=new Set(prev); e.target.checked?next.add(row.id):next.delete(row.id); return next; });
                      }}
                    />
                  </td>
                  <td className="center">{numberAt(((page-1)*pageSize)+i)}</td>
                  <td>
                    <div className="titlecell" title={`${row.title} (${row.fileName})`}>
                      <div className="t">
                        {row.title}
                        <button className="peek-btn" onClick={()=>openPreviewWindow(row)} title="미리보기">미리보기</button>
                      </div>
                      <div className="s">{row.fileName} · {fmtBytes(row.fileSize)}</div>
                    </div>
                  </td>
                  <td>{row.category || "-"}</td>
                  <td>{ymd(row.createdAt)}</td>
                  <td>
                    <div className="ops">
                      <button onClick={()=>handleDownload(row)}>다운로드</button>
                      <button onClick={()=>openEdit(row)}>수정</button>
                      <button className="danger" onClick={()=>handleDelete(row)}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 업로드 모달 */}
      {open && (
        <div className="modal" onClick={()=>!busy && setOpen(false)}>
          <div className="panel" onClick={(e)=>e.stopPropagation()}>
            <div className="panel-head">
              <div className="panel-title">문서 업로드</div>
              <button className="mini" onClick={()=>!busy && setOpen(false)}>닫기</button>
            </div>
            <div className="panel-body">
              <label className="lab">문서명</label>
              <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="예: 위임장(공용양식)"/>
              <label className="lab" style={{marginTop:10}}>분류</label>
              <div className="pillbar">
                {CATS.filter(x=>x!=="전체문서").map(c=>(
                  <button key={c} className={`pill ${category===c?"on":""}`} onClick={()=>setCategory(c)}>{c}</button>
                ))}
              </div>
              <label className="lab" style={{marginTop:10}}>파일</label>
              <input ref={fileRef} type="file" className="input" onChange={e=>setFile(e.target.files?.[0]||null)}/>
              {file && <div className="muted" style={{marginTop:6}}>{file.name} · {fmtBytes(file.size)} · {file.type||"unknown"}</div>}
              <div className="hint">💡 파일을 창에 <b>드래그&드롭</b>하거나 <b>붙여넣기(Ctrl+V)</b>로도 업로드할 수 있어요.</div>
            </div>
            <div className="panel-foot">
              <button className="mini" onClick={()=>{ setTitle(""); setCategory("계약문서"); setFile(null); if(fileRef.current) fileRef.current.value=""; }}>초기화</button>
              <div style={{flex:1}}/>
              <button className="primary" disabled={busy} onClick={handleSubmit}>{busy?"업로드 중…":"업로드"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {edit && (
        <div className="modal" onClick={()=>setEdit(null)}>
          <div className="panel" onClick={(e)=>e.stopPropagation()}>
            <div className="panel-head">
              <div className="panel-title">문서 수정</div>
              <button className="mini" onClick={()=>setEdit(null)}>닫기</button>
            </div>
            <div className="panel-body">
              <div className="muted" style={{marginBottom:8}}>{edit.fileName} · {fmtBytes(edit.fileSize)}</div>
              <label className="lab">문서명</label>
              <input className="input" value={editTitle} onChange={e=>setEditTitle(e.target.value)}/>
              <label className="lab" style={{marginTop:10}}>분류</label>
              <div className="pillbar">
                {CATS.filter(x=>x!=="전체문서").map(c=>(
                  <button key={c} className={`pill ${editCategory===c?"on":""}`} onClick={()=>setEditCategory(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className="panel-foot">
              <div style={{flex:1}}/>
              <button className="primary" onClick={applyEdit}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 스타일 */}
      <style jsx>{`
        .wrap{min-height:100svh;background:var(--bg);color:var(--fg);padding:12px;position:relative}
        .dropzone{position:fixed;inset:0;border:3px dashed #60a5fa;background:rgba(96,165,250,.12);display:flex;align-items:center;justify-content:center;color:#2563eb;font-weight:800;z-index:60}

        .topbar{max-width:1080px;margin:0 auto 10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
        .title{font-weight:900}
        .back{border:1px solid var(--border);background:var(--card);border-radius:10px;padding:8px 12px}
        .primary{border:1px solid var(--border);background:#2563eb;color:#fff;border-radius:10px;padding:8px 12px}
        .danger{border:1px solid #fecaca;background:#fee2e2;color:#b91c1c;border-radius:10px;padding:8px 12px}
        .mini{border:1px solid var(--border);background:var(--card);border-radius:8px;padding:6px 8px;cursor:pointer}
        .rightOps{display:flex;gap:8px;align-items:center}

        .toolbar{max-width:1080px;margin:0 auto 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .search{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card);color:var(--fg);min-width:260px}
        .sp{flex:1}
        .pager{display:flex;gap:8px;align-items:center}
        .pgbtns{display:flex;gap:6px;align-items:center}
        .pgbtns .muted{color:var(--muted)}

        .pillbar{display:flex;gap:6px;flex-wrap:wrap}
        .pill{border:1px solid var(--border);background:var(--card);border-radius:999px;padding:6px 12px;font-size:13px}
        .pill.on{background:#111;color:#fff;border-color:#111}
        [data-theme="dark"] .pill.on{background:#fff;color:#111;border-color:#fff}

        .countbar{max-width:1080px;margin:0 auto 6px;color:var(--fg)}
        .countbar .muted{color:var(--muted);margin-left:6px}
        .countbar .icon{margin-right:6px}

        .card{max-width:1080px;margin:0 auto;border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
        .table-wrap{overflow:auto}
        .tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:14px}
        .tbl thead tr{background:var(--card-contrast)}
        .tbl th,.tbl td{padding:10px;border-bottom:1px solid var(--border);text-align:left}
        .tbl .center{text-align:center}
        .empty{text-align:center;color:var(--muted);padding:18px 0}

        .titlecell .t{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}
        .peek-btn{border:1px solid var(--border);background:var(--card);border-radius:999px;padding:2px 8px;font-size:12px;line-height:18px}
        .titlecell .s{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

        .ops{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
        .ops button{border:1px solid var(--border);background:var(--card);border-radius:8px;padding:6px 8px}
        .ops .danger{border:1px solid #fecaca;background:#fee2e2;color:#b91c1c}

        /* 모달 */
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:12px;z-index:50}
        .panel{width:560px;max-width:100%;background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.18)}
        .panel-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--card-contrast)}
        .panel-title{font-weight:800}
        .panel-body{padding:12px}
        .panel-foot{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:10px 12px;border-top:1px dashed var(--border)}
        .lab{font-size:12px;color:var(--muted);margin-bottom:6px;display:block}
        .input{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card);color:var(--fg);width:100%}
        .hint{margin-top:8px;font-size:12px;color:var(--muted)}
      `}</style>

      <style jsx global>{`
        :root{ --bg:#fff; --fg:#111; --muted:#666; --card:#fff; --card-contrast:#fafafa; --border:#e5e7eb; }
        [data-theme="dark"]{ --bg:#0b0b0c; --fg:#f2f3f4; --muted:#a3a3a3; --card:#111214; --card-contrast:#191a1c; --border:#2a2c2f; }
      `}</style>
    </main>
  );
}
