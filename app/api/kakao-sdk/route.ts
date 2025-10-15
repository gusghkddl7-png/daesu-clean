// app/api/kakao-sdk/route.ts
// 카카오 JS SDK를 서버에서 받아 동일 도메인으로 전달 (차단 회피용)

export async function GET(req: Request) {
  const url = new URL(req.url);
  // 클라이언트의 쿼리스트링(예: appkey, autoload 등)을 그대로 전달
  const qs = url.searchParams.toString();

  const upstream = await fetch(`https://dapi.kakao.com/v2/maps/sdk.js?${qs}`, {
    // 확장/보안프로그램 영향 최소화
    cache: "no-store",
  });

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // 개발 중에는 캐시 안 함 (필요시 적절히 변경)
      "Cache-Control": "no-store",
    },
  });
}
