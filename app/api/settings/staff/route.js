// app/api/settings/staff/route.js
// 승인된 담당자 "설정" 조회용 (초기 하드코딩 버전)
// 추후 DB/설정 페이지 연동 시 여기만 바꾸면 됩니다.

export const dynamic = "force-dynamic"; // 개발 중 캐시 방지 (선택)

export async function GET(request) {
  // 초기 데이터 예시: name 3글자, approved 여부
  const STAFF = [
    { name: "김부장", approved: true },
    { name: "김과장", approved: true },
    { name: "강실장", approved: true },
    { name: "소장",   approved: false },
    // { name: "김미녀", approved: true },
  ];

  const { searchParams } = new URL(request.url);
  const onlyApproved = searchParams.get("approved");

  let list = STAFF;
  if (onlyApproved === "1" || onlyApproved === "true") {
    list = STAFF.filter(s => !!s.approved);
  }

  return new Response(JSON.stringify(list), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
