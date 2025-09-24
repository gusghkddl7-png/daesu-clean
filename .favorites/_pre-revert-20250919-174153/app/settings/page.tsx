// app/settings/page.tsx
"use client";
import { useState } from "react";

type Tab = "people" | "notice" | "theme" | "keyboard" | "notify";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("people");

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">설정</h1>

      <div className="flex gap-2 mb-6">
        {([
          ["people", "직원 승인/담당자"],
          ["notice", "공지 관리"],
          ["theme", "테마 & UI밀도"],
          ["keyboard", "키보드/입력동작"],
          ["notify", "알림"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              "px-3 py-2 rounded-lg border " +
              (tab === k ? "bg-black text-white" : "bg-white hover:bg-gray-50")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "people" && <Stub text="직원 승인/담당자: 다음 단계에서 API 연결" />}
      {tab === "notice" && <Stub text="공지 관리: 다음 단계에서 /api/notices 연동" />}
      {tab === "theme" && <Stub text="테마/밀도: 전역 상태와 연결 예정" />}
      {tab === "keyboard" && <Stub text="키보드/입력 동작 옵션: 전역 모듈 연결 예정" />}
      {tab === "notify" && <Stub text="알림(웹/이메일/슬랙): 후속 단계" />}
    </main>
  );
}

function Stub({ text }: { text: string }) {
  return (
    <div className="rounded-xl border p-5 bg-white text-sm text-gray-600">
      {text}
    </div>
  );
}
