"use client";
import React from "react";

function genCode() {
  const d = new Date();
  const pad = (n:number)=> n.toString().padStart(2,"0");
  const code = `L${(d.getFullYear()%100).toString().padStart(2,"0")}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return code;
}

export default function CodeNumberField(){
  const [code, setCode] = React.useState<string>(genCode());
  const inputRef = React.useRef<HTMLInputElement|null>(null);

  const make = () => setCode(genCode());
  const copy = async () => {
    try{
      await navigator.clipboard.writeText(code);
      (inputRef.current as any)?.select?.();
    }catch{}
  };

  return (
    <div className="mb-3">
      <label className="block text-sm text-gray-700 mb-1">코드번호</label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          name="code"
          value={code}
          onChange={(e)=>setCode(e.target.value)}
          className="input input-bordered w-[220px] max-w-full"
        />
        <button type="button" onClick={make} className="btn btn-sm">생성</button>
        <button type="button" onClick={copy} className="btn btn-sm">복사</button>
      </div>
    </div>
  );
}