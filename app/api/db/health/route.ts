import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await clientPromise;
    const admin = client.db().admin();
    const ping = await admin.ping();
    const serverStatus = await admin.serverStatus().catch(() => null); // 권한 없으면 무시
    return NextResponse.json({
      ok: true,
      ping,
      topology: serverStatus?.process || "unknown",
      now: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

