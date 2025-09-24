"use client";

export default function ListingsPage() {
  return (
    <main className="w-full max-w-none px-4 md:px-6 py-6 space-y-4">
      <h1 className="text-xl font-semibold text-center">매물관리</h1>

      <div className="flex items-center gap-3">
        <button
          className="border px-3 py-2 rounded-lg"
          onClick={() => history.back()}
        >
          ← 뒤로가기
        </button>
      </div>

      {/* TODO: 기존 리스트/필터/테이블 섹션을 여기 아래에 복원 */}
    </main>
  );
}
