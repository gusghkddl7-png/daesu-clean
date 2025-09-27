import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "daesu-clean";

let client: MongoClient | null = null;

export async function getDb() {
  if (!uri) throw new Error("MONGODB_URI missing");
  if (!client) client = new MongoClient(uri, {});
  // @ts-ignore
  if (!client.topology?.isConnected?.()) {
    await client.connect();
  }
  return client.db(dbName);
}
