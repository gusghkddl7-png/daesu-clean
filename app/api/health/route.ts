// app/api/health/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, ts: new Date().toISOString() }),
    { headers: { "content-type": "application/json" } }
  );
}
