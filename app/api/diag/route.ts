import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";
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
  const role = req.headers.get("x-role");
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const cli = await getClient();
    const db  = cli.db(process.env.MONGODB_DB);
    const usersCol = db.collection("users");

    const approvedCount = await usersCol.countDocuments({ status: "approved" });
    const pendingCount  = await usersCol.countDocuments({ status: "pending" });

    const payload = {
      ok: true,
      route: "/api/diag",
      env: {
        node: process.version,
        vercel: Boolean(process.env.VERCEL),
        vercelEnv: process.env.VERCEL_ENV || null,
        vercelGitRepo: process.env.VERCEL_GIT_REPO_SLUG || null,
        vercelGitBranch: process.env.VERCEL_GIT_COMMIT_REF || null,
        vercelGitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      },
      mongo: {
        dbName: db.databaseName,
        uriHost: (() => {
          try {
            const u = new URL(process.env.MONGODB_URI!);
            // PowerShell 간섭 방지를 위해 템플릿 리터럴 대신 문자열 연결 사용
            return u.protocol + '//' + u.hostname + (u.port ? (':' + u.port) : '');
          } catch { return 'hidden'; }
        })(),
      },
      counts: { approved: approvedCount, pending: pendingCount },
      sample: {
        approved: await usersCol.find(
          { status: "approved" },
          { projection: { _id: 0, id: 1, email: 1, displayName: 1, status: 1, createdAt: 1 } }
        ).sort({ createdAt: -1 }).limit(3).toArray(),
        pending: await usersCol.find(
          { status: "pending" },
          { projection: { _id: 0, id: 1, email: 1, displayName: 1, status: 1, createdAt: 1 } }
        ).sort({ createdAt: -1 }).limit(3).toArray(),
      },
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}
