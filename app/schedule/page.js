import dynamic from "next/dynamic";

// SSR을 끄고(=서버에서는 렌더 안 함) 클라이언트에서만 로드
const ScheduleClient = dynamic(() => import("./ScheduleClient"), {
  ssr: false,
  // 로딩 중엔 심플한 스켈레톤만 보여서 "깜빡임" 체감 최소화
  loading: () => (
    <main className="wrap pre" suppressHydrationWarning>
      <div className="bar">
        <div className="left"><span className="back" style={{opacity:.25}}>← 뒤로가기</span></div>
        <div className="center"><div className="title" style={{opacity:.25}}>로딩중…</div></div>
        <div className="right"><button className="today" style={{opacity:.25}}>오늘</button></div>
      </div>
      <div className="head" style={{opacity:.25}}></div>
      <div className="grid" style={{opacity:.25}}></div>
    </main>
  ),
});

export default function Page() {
  return <ScheduleClient />;
}
