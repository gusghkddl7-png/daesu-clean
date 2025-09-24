export default function Probe() {
  return (
    <main style={{padding:16}}>
      <h1>__probe OK</h1>
      <p>라우팅/레이아웃이 정상이라면 이 페이지가 떠야 합니다.</p>
      <p><a href="/dashboard">/dashboard</a> · <a href="/api/health">/api/health</a></p>
    </main>
  );
}
