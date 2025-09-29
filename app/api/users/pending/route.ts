// app/api/users/pending/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic"; // Vercel 캐시 방지
export const revalidate = 0;

let client: MongoClient | null = null;
async function getClient() {
  if (client) return client;
  const uri = process.env.MONGODB_URI!;
  client = new MongoClient(uri);
  await client.connect();
  return client;
}

export async function GET(req: Request) {
  // 간단한 헤더 체크(관리자 전용)
  const role = req.headers.get("x-role");
  if (role !== "admin") {
    // 관리자 아니면 빈 리스트(권한 오류 대신 UX 위해 빈배열) + 캐시 완전 차단
    return new NextResponse("[]", {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }

  try {
    const cli = await getClient();
    const db = cli.db(process.env.MONGODB_DB);
    const rows = await db
      .collection("users")
      .find({ status: "pending" })
      .project({
        _id: 0,
        id: 1,
        email: 1,
        displayName: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // id 필드가 없을 수 있으니 안전하게 email을 id로 매핑
    const list = rows.map((r: any) => ({
      id: r.id || r.email,
      email: r.email,
      displayName: r.displayName || "",
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return new NextResponse(JSON.stringify(list), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
