// app/api/schedule/route.js
// 개발용 인메모리 일정 API (GET 목록 / POST 저장·수정)
// 배포/영구저장 전까지 임시로 사용합니다.

export const dynamic = "force-dynamic"; // 캐시 방지

// 서버 프로세스 살아있는 동안 메모리에 유지됨(개발에 적합)
if (!globalThis.__SCHEDULE_STORE__) {
  globalThis.__SCHEDULE_STORE__ = [];
}
const store = globalThis.__SCHEDULE_STORE__;

/** GET /api/schedule
 * 전체 일정 목록 반환 (숨김(__deleted) 포함해서 통째로 내려줌; UI에서 숨김 필터링)
 */
export async function GET() {
  return new Response(JSON.stringify(store), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** POST /api/schedule
 * body: { id, date, type, staff, time, phone4, nickname, memo, canceled, pinned, __deleted }
 * 동일 id 있으면 교체, 없으면 추가
 */
export async function POST(request) {
  try {
    const item = await request.json();

    // 최소 유효성 (프론트에서도 검증하지만 서버에서도 가볍게)
    if (!item || !item.id) {
      return new Response(JSON.stringify({ error: "id가 필요합니다." }), {
        status: 400, headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const idx = store.findIndex(e => String(e.id) === String(item.id));
    if (idx >= 0) store[idx] = { ...store[idx], ...item };
    else store.push(item);

    return new Response(JSON.stringify({ ok: true, item }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("schedule POST error", e);
    return new Response(JSON.stringify({ error: "서버 오류" }), {
      status: 500, headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
