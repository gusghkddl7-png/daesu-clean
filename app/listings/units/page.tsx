"use client";

import React, { useEffect, useMemo, useState } from "react";

/** =========================
 *  타입
 *  ========================= */
type JusoItem = {
  roadAddr: string; // 도로명주소
  jibunAddr: string; // 지번주소
  bdNm?: string; // 건물명(있을 때만)
  zipNo?: string;
  siNm?: string;
  sggNm?: string;
  emdNm?: string;
  liNm?: string;
};

type Tab = "통합" | "건축물" | "토지";
type SanType = "일반" | "산" | "특수";

/** 저장 키(상태 유지) */
const LS_KEY = "units.list.search.v2";

/** =========================
 *  페이지
 *  ========================= */
export default function Page() {
  /** 탭 / 상세 토글 */
  const [tab, setTab] = useState<Tab>("통합"); // 기본값: 통합
  const [detailOpen, setDetailOpen] = useState(false);

  /** 통합검색 */
  const [keyword, setKeyword] = useState("");

  /** 건축물/토지 한줄 필터 */
  const [sido, setSido] = useState("서울특별시");
  const [sgg, setSgg] = useState("강동구");
  const [emd, setEmd] = useState("천호동");
  const [ri, setRi] = useState("");
  const [san, setSan] = useState<SanType>("일반");
  const [mainNo, setMainNo] = useState("");
  const [subNo, setSubNo] = useState("");
  const [bldName, setBldName] = useState("");

  /** 결과/상태 */
  const [items, setItems] = useState<JusoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [pinned, setPinned] = useState<JusoItem[]>([]);

  /** ===== 상태 유지(로컬스토리지) ===== */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved) return;

      setTab(saved.tab ?? "통합");
      setDetailOpen(saved.detailOpen ?? false);
      setKeyword(saved.keyword ?? "");

      setSido(saved.sido ?? "서울특별시");
      setSgg(saved.sgg ?? "강동구");
      setEmd(saved.emd ?? "천호동");
      setRi(saved.ri ?? "");
      setSan(saved.san ?? "일반");
      setMainNo(saved.mainNo ?? "");
      setSubNo(saved.subNo ?? "");
      setBldName(saved.bldName ?? "");

      setItems(Array.isArray(saved.items) ? saved.items : []);
      setPinned(Array.isArray(saved.pinned) ? saved.pinned : []);
    } catch {}
  }, []);

  const saveLS = (next?: Partial<any>) => {
    try {
      const snapshot = {
        tab,
        detailOpen,
        keyword,
        sido,
        sgg,
        emd,
        ri,
        san,
        mainNo,
        subNo,
        bldName,
        items,
        pinned,
        ...next,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    } catch {}
  };

  useEffect(() => {
    // 주요 상태 변경 시 반영
    saveLS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, detailOpen, keyword, sido, sgg, emd, ri, san, mainNo, subNo, bldName, items, pinned]);

  /** 유틸 */
  const isPinned = (it: JusoItem) =>
    pinned.some((p) => p.roadAddr === it.roadAddr && p.jibunAddr === it.jibunAddr);

  const togglePin = (it: JusoItem) => {
    setPinned((prev) => {
      const next = isPinned(it)
        ? prev.filter((p) => !(p.roadAddr === it.roadAddr && p.jibunAddr === it.jibunAddr))
        : [it, ...prev];
      saveLS({ pinned: next });
      return next;
    });
  };

  const buildQuery = () => {
    if (tab === "통합") return keyword.trim();
    const addr = [sido, sgg, emd, ri].filter(Boolean).join(" ");
    const bunji = mainNo || subNo ? `${san !== "일반" ? san + " " : ""}${mainNo}${subNo ? "-" + subNo : ""}` : "";
    return [addr, bunji, bldName].filter(Boolean).join(" ").trim();
  };

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === "Enter") search();
  };

  /** 새로고침 버튼으로만 초기화 */
  const resetAll = () => {
    setTab("통합");
    setDetailOpen(false);
    setKeyword("");
    setItems([]);
    setPinned([]);
    setErr("");
    setSido("서울특별시");
    setSgg("강동구");
    setEmd("천호동");
    setRi("");
    setSan("일반");
    setMainNo("");
    setSubNo("");
    setBldName("");
    localStorage.removeItem(LS_KEY);
  };

  const search = async () => {
    setErr("");
    setLoading(true);
    try {
      const q = buildQuery();
      if (!q) {
        setItems([]);
        setLoading(false);
        return;
      }
      const base = process.env.NEXT_PUBLIC_BASE_URL || "";
      const url = `${base}/api/juso/search`.replace(/\/{2,}/g, "/").replace(":/", "://");
      const r = await fetch(`${url}?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const next = Array.isArray(data?.items) ? data.items : [];
      setItems(next);
      saveLS({ items: next });
    } catch (e: any) {
      console.error(e);
      setErr("검색 중 오류가 발생했습니다.");
      setItems([]);
      saveLS({ items: [] });
    } finally {
      setLoading(false);
    }
  };

  /** 연동 점검: 현재 검색어로 서울시 API 호출 테스트 */
  const checkIntegration = async () => {
    try {
      const sampleAddr = items[0]?.roadAddr || items[0]?.jibunAddr || (tab === "통합" ? keyword.trim() : buildQuery());
      if (!sampleAddr) return alert("테스트할 주소가 없습니다. 먼저 검색해 주세요.");
      const base = process.env.NEXT_PUBLIC_BASE_URL || "";
      const url = `${base}/api/seoul/building`.replace(/\/{2,}/g, "/").replace(":/", "://");
      const r = await fetch(`${url}?addr=${encodeURIComponent(sampleAddr)}`, { cache: "no-store" });
      const j = await r.json();
      if (j?.ok) alert("연동 OK (건축물대장 일반 응답 성공)");
      else alert(`연동 실패: ${j?.error || "응답 실패"}`);
    } catch (e: any) {
      alert(`연동 실패: ${String(e?.message || e)}`);
    }
  };

  /** 2줄 주소 표기 */
  const subtitleOf = (it: JusoItem) => [it.jibunAddr, it.bdNm].filter(Boolean).join(" · ");

  /** =========================
   *  뷰
   *  ========================= */
  return (
    <main className="w-full max-w-[1180px] mx-auto px-4 py-6">
      {/* 상단 타이틀/버튼 */}
      <div className="flex items-center justify-between mb-4">
        <button className="text-sm text-gray-500 hover:text-black" onClick={() => history.back()} title="뒤로가기">
          ← 뒤로가기
        </button>
        <div className="text-sm text-gray-500">
          홈 &gt; 부동산 원장 &gt; <b>부동산 원장 관리</b>
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-3 rounded-lg border bg-white hover:bg-gray-50 text-sm" onClick={checkIntegration}>
            연동 점검
          </button>
          <button className="h-9 px-3 rounded-lg border bg-white hover:bg-gray-50 text-sm">물건 찾기 <span className="ml-1">🔎</span></button>
        </div>
      </div>

      {/* ===== 검색 카드 ===== */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* 첫 줄 (전체 한 줄 묶음) */}
        <div className="px-4 py-3 flex items-start gap-3">
          {/* 부동산 유형 - 세그먼트 버튼 */}
          <div className="shrink-0">
            <div className="text-xs text-gray-500 mb-1">부동산 유형</div>
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              {(["통합", "건축물", "토지"] as Tab[]).map((t, idx) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    "h-9 px-3 text-sm transition " +
                    (tab === t ? "bg-black text-white" : "bg-white hover:bg-gray-50 text-gray-700") +
                    (idx !== 2 ? " border-r border-gray-200" : "")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 가운데: 입력 라인 */}
          <div className="flex-1 min-w-0">
            {tab === "통합" ? (
              <div className="w-full">
                <div className="text-xs text-gray-500 mb-1">통합검색</div>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={onEnter}
                  placeholder="예) 천호동 166-100 / 강동구 성내동 123-4 / 고덕 101"
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-2 items-end">
                {/* 시/군/구/동/리 */}
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">시/도</div>
                  <select className="h-10 w-full rounded-lg border border-gray-300 px-2 bg-white" value={sido} onChange={(e) => setSido(e.target.value)} onKeyDown={onEnter}>
                    <option>서울특별시</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">시/군/구</div>
                  <select className="h-10 w-full rounded-lg border border-gray-300 px-2 bg-white" value={sgg} onChange={(e) => setSgg(e.target.value)} onKeyDown={onEnter}>
                    <option>강동구</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">동</div>
                  <input className="h-10 w-full rounded-lg border border-gray-300 px-2" value={emd} onChange={(e) => setEmd(e.target.value)} onKeyDown={onEnter} placeholder="동" />
                </div>
                <div className="col-span-1">
                  <div className="text-xs text-gray-500 mb-1">리</div>
                  <input className="h-10 w-full rounded-lg border border-gray-300 px-2" value={ri} onChange={(e) => setRi(e.target.value)} onKeyDown={onEnter} placeholder="리" />
                </div>

                {/* 일반/산/특수 - 세그먼트 */}
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">구분</div>
                  <div className="inline-flex w-full rounded-lg border border-gray-200 overflow-hidden">
                    {(["일반", "산", "특수"] as SanType[]).map((s, i) => (
                      <button
                        key={s}
                        onClick={() => setSan(s)}
                        className={
                          "h-10 flex-1 text-sm " +
                          (san === s ? "bg-black text-white" : "bg-white hover:bg-gray-50 text-gray-700") +
                          (i !== 2 ? " border-r border-gray-200" : "")
                        }
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 본번 - 부번 */}
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">본번 / 부번</div>
                  <div className="flex items-center gap-2">
                    <input className="h-10 w-[90px] rounded-lg border border-gray-300 px-2" value={mainNo} onChange={(e) => setMainNo(e.target.value)} onKeyDown={onEnter} placeholder="본번" inputMode="numeric" />
                    <span className="text-gray-400">-</span>
                    <input className="h-10 w-[90px] rounded-lg border border-gray-300 px-2" value={subNo} onChange={(e) => setSubNo(e.target.value)} onKeyDown={onEnter} placeholder="부번" inputMode="numeric" />
                  </div>
                </div>

                {/* 건물명(별칭) */}
                <div className="col-span-3">
                  <div className="text-xs text-gray-500 mb-1">건물명(별칭)</div>
                  <input className="h-10 w-full rounded-lg border border-gray-300 px-3" value={bldName} onChange={(e) => setBldName(e.target.value)} onKeyDown={onEnter} placeholder="건물명(별칭)" />
                </div>
              </div>
            )}
          </div>

          {/* 우측: 새로고침 / 검색 (고정폭) */}
          <div className="shrink-0 flex gap-2 pt-6">
            <button className="h-10 w-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="새로고침(초기화)" onClick={resetAll}>
              ⟳
            </button>
            <button className="h-10 w-10 rounded-lg border border-gray-900 bg-black text-white hover:opacity-90" title="검색" onClick={search}>
              🔍
            </button>
          </div>
        </div>

        {/* 상세 열기 링크 (UI만, 아직 내용 없음) */}
        <div className="px-4 pb-3">
          <button className="text-sm text-gray-600 hover:text-black" onClick={() => setDetailOpen((v) => !v)}>
            상세 열기 {detailOpen ? "▴" : "▾"}
          </button>
        </div>
      </section>

      {/* 핀고정 영역 */}
      <section className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">
            핀고정 : <span className="text-blue-600">{pinned.length}</span>
          </div>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => { setPinned([]); saveLS({ pinned: [] }); }}>
            모두해제
          </button>
        </div>
        {pinned.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">부동산 원장을 검색하세요. (목록의 ⭐로 고정)</div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {pinned.map((it, i) => (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 flex items-start justify-between">
                <div>
                  <div className="font-medium">{it.roadAddr || it.jibunAddr}</div>
                  <div className="text-[11px] text-gray-600">
                    {subtitleOf(it)}
                    {it.zipNo ? ` · 우) ${it.zipNo}` : ""}
                  </div>
                </div>
                <button className="h-8 px-2 rounded border bg-white hover:bg-gray-50" onClick={() => togglePin(it)}>
                  해제
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 전체 목록 */}
      <section className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">
            전체 <span className="text-blue-600">{items.length}</span>건
          </div>
          {loading ? <div className="text-sm text-gray-500">불러오는 중…</div> : <div className="text-sm text-transparent">.</div>}
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[120px]" />
              <col />
              <col className="w-[160px]" />
              <col className="w-[190px]" />
              <col className="w-[80px]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-3 py-2">용도</th>
                <th className="px-3 py-2">주소</th>
                <th className="px-3 py-2">단지 / 동 / 호</th>
                <th className="px-3 py-2">매매 / 전세 / 월세</th>
                <th className="px-3 py-2 text-center">핀고정</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-gray-500">
                    검색 후 결과가 이곳에 표시됩니다.
                    {err ? <div className="mt-2 text-red-600">{err}</div> : null}
                  </td>
                </tr>
              ) : (
                items.map((it, i) => {
                  const pin = isPinned(it);
                  const road = it.roadAddr?.trim() || "";
                  const subtitle = subtitleOf(it);
                  // 상세는 도로명주소만 전달(지도의 혼합검색 이슈 방지)
                  const href = `/listings/units/detail?road=${encodeURIComponent(road || it.jibunAddr)}`;
                  return (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span className="text-[11px] border rounded-full px-2 py-0.5">—</span>
                      </td>
                      <td className="px-3 py-2">
                        {/* 2줄 표기: 위(도로명 메인), 아래(지번+건물명) */}
                        <a href={href} className="block group" title="상세로 이동">
                          <div className="truncate text-blue-700 group-hover:underline">{road || it.jibunAddr}</div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {subtitle}
                            {it.zipNo ? ` · 우) ${it.zipNo}` : ""}
                          </div>
                        </a>
                      </td>
                      <td className="px-3 py-2 text-gray-600">0 / 1 / 29</td>
                      <td className="px-3 py-2 text-gray-600">매매 0 / 전세 0 / 월세 0</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          className={"px-2 py-1 rounded border text-xs " + (pin ? "bg-yellow-300" : "bg-white hover:bg-gray-100")}
                          onClick={(e) => {
                            e.preventDefault();
                            togglePin(it);
                          }}
                          title={pin ? "핀 해제" : "핀 고정"}
                        >
                          ⭐
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
