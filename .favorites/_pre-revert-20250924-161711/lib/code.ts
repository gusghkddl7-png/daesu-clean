import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const COUNTER_FILE = path.join(DATA_DIR, "code-counter.json");

function todayKey() {
  const d = new Date();
  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`; // YYMMDD
}

// ✅ 여기서 포맷만 바꾸면 형식 변경 가능 (예: "A-" + YYMMDD + "-" + #### 등)
function formatCode(key: string, seq: number) {
  return `${key}-${String(seq).padStart(4, "0")}`; // YYMMDD-#### 
}

type Counter = Record<string, number>;

function readCounter(): Counter {
  try {
    const json = fs.readFileSync(COUNTER_FILE, "utf8");
    return JSON.parse(json);
  } catch { return {}; }
}

function writeCounter(c: Counter) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(c), "utf8");
}

export function peekNextCode() {
  const c = readCounter();
  const key = todayKey();
  const next = (c[key] ?? 0) + 1;
  return { code: formatCode(key, next), key, seq: next };
}

export function takeNextCode() {
  const c = readCounter();
  const key = todayKey();
  const next = (c[key] ?? 0) + 1;
  c[key] = next;
  writeCounter(c);
  return { code: formatCode(key, next), key, seq: next };
}