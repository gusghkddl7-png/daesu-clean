// app/api/db-test/route.ts
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

async function getClient() {
  if (client) return client;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client;
}

export async function GET() {
  try {
    const cli = await getClient();
    const db = cli.db(process.env.MONGODB_DB);
    const cols = await db.listCollections().toArray();
    return NextResponse.json({
      ok: true,
      db: db.databaseName,
      collections: cols.map(c => c.name),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
