"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** ===============================
 *  UI 스켈레톤 + 카드형(건물 그림) 보기
 *  - 좌측: 동 필터 + 검색 + (목록/카드) 보기 토글
 *  - 카드 보기: 층별 호실 수를 막대로 보여주는 “미니 층도”
 *  - 우측: 선택한 건물의 층/호실 테이블 + 임시 입력폼
 *  =============================== */

const DONGS = [
  "강일동", "고덕동", "길동", "둔촌동",
  "명일동", "상일동", "성내동", "암사동", "천호동",
];

const MOCK_BUILDINGS = [
  { id: "B001", dong: "성내동", name: "성내동 한빛아파트", address: "서울 강동구 성내동 123-4" },
  { id: "B002", dong: "천호동", name: "천호 더리버오피스텔", address: "서울 강동구 천호동 55-1" },
  { id: "B003", dong: "암사동", name: "암사 중앙빌라", address: "서울 강동구 암사동 777-3" },
  { id: "B004", dong: "길동",   name: "길동 롯데캐슬", address: "서울 강동구 길동 88-12" },
];

const MOCK_UNITS: Record<string, Array<{ floor: number; ho: string }>> = {
  B001: [
    { floor: 5, ho: "502" }, { floor: 5, ho: "503" },
    { floor: 4, ho: "401" }, { floor: 3, ho: "301" },
  ],
  B002: [
    { floor: 12, ho: "1201" }, { floor: 12, ho: "1202" }, { floor: 11, ho: "1103" },
  ],
  B003: [
    { floor: 2, ho: "201" }, { floor: 2, ho: "202" }, { floor: 1, ho: "101" },
  ],
  B004: [
    { floor: 20, ho: "2004" }, { floor: 18, ho: "1801" },
  ],
};

type UnitForm = {
  rent?: string;
  tenant?: string;
  expireAt?: string; // YYYY-MM-DD
};

type ViewMode = "list" | "card";

export default function Page() {
  const router = useRouter();

  // 좌측 필터 상태
  const [dong, setDong] = useState<string>("");
  const [q, setQ] = useState<string>("");

  // 보기 모드 토글
  const [view, setView] = useState<ViewMode>("card"); // 기본: 카드 보기

  // 선택 상태
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedUnitKey, setSelectedUnitKey] = useState<string>(""); // `${buildingId}:${floor}-${ho}`

  // 임시 입력 상태
  const [unitForms, setUnitForms] = useState<Record<string, UnitForm>>({});

  // 필터 적용
  const filteredBuildings = useMemo(() => {
    let list = MOCK_BUILDINGS;
    if (dong) list = list.filter((b) => b.dong === dong);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(needle) ||
          b.address.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [dong, q]);

  // 선택된 건물 & 호실
  const selectedBuilding = useMemo(
    () => MOCK_BUILDINGS.find((b) => b.id === selectedBuildingId),
    [selectedBuildingId]
  );
  const selectedUnits = useMemo(
    () => (selectedBuildingId ? MOCK_UNITS[selectedBuildingId] ?? [] : []),
    [selectedBuildingId]
  );

  // 층도용 데이터 (층 -> 개수)  ✅ ES5 호환 버전
  const floorsOf = (bid: string): Array<[number, number]> => {
    const arr = MOCK_UNITS[bid] ?? [];
    const counts: Record<number, number> = {};
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i].floor;
      counts[f] = (counts[f] ?? 0) + 1;
    }
    const out: Array<[number, number]> = [];
    for (const k in counts) {
      if (Object.prototype.hasOwnProperty.call(counts, k)) {
        out.push([Number(k), counts[k]]);
      }
    }
    out.sort((a, b) => b[0] - a[0]); // 높은 층부터
    return out;
  };

  const handleUnitChange = (key: string, field: keyof UnitForm, value: string) => {
    setUnitForms((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleMockSave = () => {
    if (!selectedUnitKey) {
      alert("호실을 먼저 선택하세요.");
      return;
    }
    const data = unitForms[selectedUnitKey];
    alert(
      `임시 저장됨(목업)\n\n호실키: ${selectedUnitKey}\n임대료: ${data?.rent || ""}\n임차인: ${data?.tenant || ""}\n만기일: ${data?.expireAt || ""}`
    );
  };

  return (
    <main className="w-full max-w-none px-2 md:px-4 py-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/listings")}
          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
        >
          ← 매물관리로
        </button>
        <h1 className="text-2xl font-bold">주소 및 호실 상태</h1>
        <div />
      </div>

      {/* 상단 검색바 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="건물명·주소 검색"
          className="border rounded-lg px-3 py-2 w-[320px]"
        />
        <button onClick={() => setQ("")} className="px-3 py-2 rounded-lg border hover:bg-gray-50">
          초기화
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
        {/* 좌측 패널 */}
        <aside className="md:col-span-4">
          {/* 동 필터 */}
          <div className="rounded-xl border bg-white">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">강동구 행정동</div>
              <div className="flex gap-1">
                <button
                  className={
                    "px-2 py-1 text-xs rounded border " +
                    (view === "list" ? "bg-black text-white" : "bg-white hover:bg-gray-50")
                  }
                  onClick={() => setView("list")}
                  title="목록 보기"
                >
                  목록
                </button>
                <button
                  className={
                    "px-2 py-1 text-xs rounded border " +
                    (view === "card" ? "bg-black text-white" : "bg-white hover:bg-gray-50")
                  }
                  onClick={() => setView("card")}
                  title="카드 보기"
                >
                  카드
                </button>
              </div>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              <button
                onClick={() => setDong("")}
                className={
                  "px-3 py-1.5 rounded-full border " +
                  (dong === "" ? "bg-black text-white" : "bg-white hover:bg-gray-50")
                }
              >
                전체
              </button>
              {DONGS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDong(d)}
                  className={
                    "px-3 py-1.5 rounded-full border " +
                    (dong === d ? "bg-black text-white" : "bg-white hover:bg-gray-50")
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 검색 결과: 목록/카드 */}
          <div className="mt-4 rounded-xl border bg-white">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">검색 결과</div>
              <div className="text-xs text-gray-500">{filteredBuildings.length}건</div>
            </div>

            {view === "list" ? (
              // ===== 목록 보기 =====
              <div className="max-h-[420px] overflow-auto">
                {filteredBuildings.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">결과 없음</div>
                ) : (
                  <ul className="divide-y">
                    {filteredBuildings.map((b) => {
                      const active = b.id === selectedBuildingId;
                      return (
                        <li
                          key={b.id}
                          className={
                            "px-4 py-3 cursor-pointer hover:bg-gray-50 " +
                            (active ? "bg-blue-50" : "")
                          }
                          onClick={() => {
                            setSelectedBuildingId(b.id);
                            setSelectedUnitKey("");
                          }}
                        >
                          <div className="font-medium">{b.name}</div>
                          <div className="text-xs text-gray-600">{b.address}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{b.dong}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              // ===== 카드(건물 그림) 보기 =====
              <div className="p-3">
                {filteredBuildings.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">결과 없음</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-auto pr-1">
                    {filteredBuildings.map((b) => {
                      const floors = floorsOf(b.id); // [ [층, 개수], ... ] 높은층→낮은층
                      const maxCount = Math.max(1, ...floors.map(function (x){return x[1];}));
                      const active = b.id === selectedBuildingId;
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelectedBuildingId(b.id);
                            setSelectedUnitKey("");
                          }}
                          className={
                            "text-left rounded-xl border p-3 hover:shadow-sm transition " +
                            (active ? "ring-2 ring-blue-400 bg-blue-50" : "bg-white")
                          }
                          title="클릭하여 선택"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🏢</span>
                            <div>
                              <div className="font-semibold leading-tight">{b.name}</div>
                              <div className="text-xs text-gray-600 leading-tight">
                                {b.address} · {b.dong}
                              </div>
                            </div>
                          </div>

                          {/* 미니 층도: 층(텍스트) + 막대(호실 수 비율) */}
                          <div className="space-y-1.5">
                            {floors.map(([floor, count]) => {
                              const ratio = count / maxCount; // 0~1
                              return (
                                <div key={floor} className="flex items-center gap-2">
                                  <div className="text-[11px] text-gray-600 w-8 text-right">
                                    {floor}F
                                  </div>
                                  <div className="flex-1 h-4 bg-gray-100 rounded">
                                    <div
                                      className="h-4 rounded bg-gray-400"
                                      style={{ width: (Math.max(18, ratio * 100)) + "%" }}
                                      title={floor + "층 " + count + "호"}
                                    />
                                  </div>
                                  <div className="text-[11px] text-gray-700 w-6">{count}호</div>
                                </div>
                              );
                            })}
                            {floors.length === 0 && (
                              <div className="text-xs text-gray-500">등록된 호실이 없습니다.</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* 우측 패널 */}
        <section className="md:col-span-6">
          {/* 선택된 건물 정보 */}
          <div className="rounded-xl border bg-white">
            <div className="px-4 py-3 border-b">
              <div className="text-sm font-semibold text-gray-700">건물 정보</div>
            </div>
            <div className="p-4">
              {selectedBuilding ? (
                <div>
                  <div className="text-base font-semibold">{selectedBuilding.name}</div>
                  <div className="text-sm text-gray-600">
                    {selectedBuilding.address} · {selectedBuilding.dong}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">좌측에서 건물을 선택하세요.</div>
              )}
            </div>
          </div>

          {/* 층/호실 테이블 */}
          <div className="mt-4 rounded-xl border bg-white">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">층/호실</div>
              {selectedBuilding && (
                <div className="text-xs text-gray-500">{selectedUnits.length}개 호실</div>
              )}
            </div>

            {selectedBuilding ? (
              <div className="p-0 overflow-auto">
                <table className="w-full text-sm">
                  <colgroup>
                    <col className="w-[90px]" />
                    <col className="w-[120px]" />
                    <col />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr className="text-left">
                      <th className="px-3 py-2">층</th>
                      <th className="px-3 py-2">호실</th>
                      <th className="px-3 py-2">선택</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUnits.map((u) => {
                      const key = `${selectedBuilding!.id}:${u.floor}-${u.ho}`;
                      const active = key === selectedUnitKey;
                      return (
                        <tr
                          key={key}
                          className={"border-t " + (active ? "bg-blue-50" : "hover:bg-gray-50")}
                        >
                          <td className="px-3 py-2">{u.floor}층</td>
                          <td className="px-3 py-2">{u.ho}</td>
                          <td className="px-3 py-2">
                            <button
                              className={
                                "px-2 py-1 border rounded " +
                                (active ? "bg-black text-white" : "bg-white hover:bg-gray-100")
                              }
                              onClick={() => setSelectedUnitKey(key)}
                            >
                              {active ? "선택됨" : "선택"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {selectedUnits.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                          등록된 호실이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-500">
                좌측에서 건물을 선택하면 호실 목록이 표시됩니다.
              </div>
            )}
          </div>

          {/* 임시 입력 폼 */}
          <div className="mt-4 rounded-xl border bg-white">
            <div className="px-4 py-3 border-b">
              <div className="text-sm font-semibold text-gray-700">호실 상세 (임시 입력)</div>
            </div>

            {selectedUnitKey ? (
              <div className="p-4 space-y-3">
                <div className="text-xs text-gray-500">
                  선택 호실키: <b>{selectedUnitKey}</b>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">임대료 메모</div>
                    <input
                      value={unitForms[selectedUnitKey]?.rent ?? ""}
                      onChange={(e) => handleUnitChange(selectedUnitKey, "rent", e.target.value)}
                      placeholder="예: 보/월/관 등 메모"
                      className="border rounded px-3 h-9 w-full"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">임차인 메모</div>
                    <input
                      value={unitForms[selectedUnitKey]?.tenant ?? ""}
                      onChange={(e) => handleUnitChange(selectedUnitKey, "tenant", e.target.value)}
                      placeholder="예: 홍길동 010-1234-5678"
                      className="border rounded px-3 h-9 w-full"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">계약만기일</div>
                    <input
                      type="date"
                      value={unitForms[selectedUnitKey]?.expireAt ?? ""}
                      onChange={(e) => handleUnitChange(selectedUnitKey, "expireAt", e.target.value)}
                      className="border rounded px-3 h-9 w-full"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    className="px-3 py-1.5 border rounded-lg"
                    onClick={() =>
                      setUnitForms((prev) => {
                        const cp = { ...prev };
                        delete cp[selectedUnitKey];
                        return cp;
                      })
                    }
                  >
                    입력 초기화
                  </button>
                  <button
                    className="px-3 py-1.5 border rounded-lg bg-blue-600 text-white"
                    onClick={handleMockSave}
                  >
                    임시 저장(목업)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-500">상단 표에서 호실을 선택하세요.</div>
            )}
          </div>

          {/* 안내 배너 */}
          <div className="mt-4 rounded-lg border bg-amber-50 text-amber-900 px-3 py-2 text-sm">
            현재는 <b>카드형 UI + 목데이터</b> 입니다. 다음 단계에서 실제 주소/호실/계약을 API로 연동합니다.
          </div>
        </section>
      </div>
    </main>
  );
}
