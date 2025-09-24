import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  // .env.local 에 MONGODB_URI 가 없으면 API 호출 시 여기서 바로 원인 알 수 있게 에러
  throw new Error("Missing MONGODB_URI in .env.local");
}

/**
 * 개발 모드에서 HMR로 파일이 리로드될 때도 커넥션을 재활용하기 위한 전역 캐시
 */
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  const g = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };
  if (!g._mongoClientPromise) {
    g._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = g._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export default clientPromise;
