import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** ---- 초간단 5초 메모리 캐시 ---- */
let cache: { t: number; payload: any } = { t: 0, payload: null };

/** ---- Mongo 클라이언트 (함수 바깥 캐시로 콜드스타트 완화) ---- */
let client: MongoClient | null = null;
async function getClient() {
  if (client) return client;
  const uri = process.env.MONGODB_URI!;
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  return client;
}

/** ---- 집계 규칙 ----
 * Listings: 다음 조건 중 하나라도 "참"이면 완료/종료로 간주
 *  - closed / dealDone / sold / completed 가 true-계열 (true, "true", 1, "1", "yes", "y")
 *  - status 가 ["closed","거래완료","done","완료","종료"]
 *
 * Clients: closed 가 true-계열이면 비활성, 아니면 활성
 */
const TRUEISH = [true, "true", 1, "1", "yes", "y"];
const DONE_STATUSES = ["closed", "거래완료", "done", "완료", "종료"];

export async function GET() {
  const started = Date.now();

  try {
    // 5초 캐시 (대시보드 새로고침 연타 방지)
    if (cache.payload && Date.now() - cache.t < 5000) {
      return NextResponse.json({ ...cache.payload, cached: true });
    }

    const cli = await getClient();
    const dbName = process.env.MONGODB_DB || "daesu";
    const db = cli.db(dbName);

    const listingsCol = db.collection("listings");
    const clientsCol  = db.collection("clients");

    // -------- Listings 집계(단일 aggregate) --------
    const listingsAgg = await listingsCol
      .aggregate<{ total: number; active: number }>([
        { $match: {} },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  {
                    $not: [
                      {
                        $or: [
                          { $in: ["$status", DONE_STATUSES] },
                          { $in: ["$closed", TRUEISH] },
                          { $in: ["$dealDone", TRUEISH] },
                          { $in: ["$sold", TRUEISH] },
                          { $in: ["$completed", TRUEISH] },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $project: { _id: 0, total: 1, active: 1 } },
      ])
      .toArray();

    const listings =
      listingsAgg[0] ?? { total: 0, active: 0 };

    // -------- Clients 집계(단일 aggregate) --------
    const clientsAgg = await clientsCol
      .aggregate<{ total: number; active: number }>([
        { $match: {} },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $not: [{ $in: ["$closed", TRUEISH] }] }, // closed 가 true-계열이 아니면 active
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $project: { _id: 0, total: 1, active: 1 } },
      ])
      .toArray();

    const clients =
      clientsAgg[0] ?? { total: 0, active: 0 };

    const payload = {
      ok: true,
      route: "/api/stats",
      ts: new Date().toISOString(),
      listings,
      clients,
      tookMs: Date.now() - started,
    };

    cache = { t: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, route: "/api/stats", error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
