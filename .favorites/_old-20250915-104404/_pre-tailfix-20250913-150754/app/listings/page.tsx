"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Deal = "월세" | "전세" | "매매";

export default function EditListingPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get("id") || "";

  const [form, setForm] = useState<any>({
    id, createdAt: "", agent: "", code: "",
    dealType: "월세" as Deal, buildingType: "",
    deposit: "", rent: "", mgmt: "",
    tenantInfo: "", address: "", addressSub: "",
    areaM2: "", rooms: "", baths: "",
    elevator: "Y", parking: "가능", pets: "가능",
    landlord: "", tenant: "", contact1: "", contact2: "",
    isBiz: "N", memo: "", vacant: false, completed: false,
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("editRecord");
      if (raw) {
        const rec = JSON.parse(raw);
        setForm((f:any) => ({ ...f, ...rec, id: rec.id ?? id }));
      }
    } catch {}
  }, [id]);

  function onChange(e: any) {
    const { name, value, type, checked } = e.target;
    setForm((f:any) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function onSubmit(e: any) {
    e.preventDefault();
    alert("수정 저장 로직은 추후 연결 예정입니다.");
    console.log("EDIT SUBMIT", form);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <button className="border px-3 py-1.5 rounded" onClick={()=>history.back()}>← 뒤로가기</button>
        <h1 className="text-2xl font-bold">매물수정</h1>
        <div />
      </div>

      <div className="text-sm text-gray-500">ID: {form.id || "(알 수 없음)"} </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input name="address" value={form.address||""} onChange={onChange} placeholder="주소*" className="border rounded px-3 py-2" />
        <input name="addressSub" value={form.addressSub||""} onChange={onChange} placeholder="상세주소" className="border rounded px-3 py-2" />
        <input name="deposit" value={form.deposit||""} onChange={onChange} placeholder="보증금(만원)" className="border rounded px-3 py-2" />
        <input name="rent" value={form.rent||""} onChange={onChange} placeholder="월세(만원)" className="border rounded px-3 py-2" />
        <input name="mgmt" value={form.mgmt||""} onChange={onChange} placeholder="관리비(만원)" className="border rounded px-3 py-2" />
        <input name="areaM2" value={form.areaM2||""} onChange={onChange} placeholder="면적(㎡)" className="border rounded px-3 py-2" />
        <input name="rooms" value={form.rooms||""} onChange={onChange} placeholder="방" className="border rounded px-3 py-2" />
        <input name="baths" value={form.baths||""} onChange={onChange} placeholder="욕실" className="border rounded px-3 py-2" />
        <input name="contact1" value={form.contact1||""} onChange={onChange} placeholder="연락처1" className="border rounded px-3 py-2" />
        <input name="contact2" value={form.contact2||""} onChange={onChange} placeholder="연락처2" className="border rounded px-3 py-2" />
        <input name="memo" value={form.memo||""} onChange={onChange} placeholder="비고" className="border rounded px-3 py-2 md:col-span-2" />

        <label className="inline-flex items-center gap-2 col-span-full">
          <input type="checkbox" name="completed" checked={!!form.completed} onChange={onChange} />
          <span>거래완료</span>
        </label>

        <div className="col-span-full flex gap-3 justify-end">
          <button type="button" className="border px-4 py-2 rounded" onClick={()=>history.back()}>취소</button>
          <button className="border px-4 py-2 rounded bg-blue-600 text-white">저장</button>
        </div>
      </form>
    </div>
  );
}

