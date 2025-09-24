"use client";

export type UrgentRow = {
  id: string;        // 행 식별자(전화번호 우선)
  moveIn: string;    // YYYY-MM-DD
  days: number;      // D-값
  rowHTML: string;   // <tr> 내부 HTML (cells)
};

export type UrgentState = {
  [id: string]: { closed?: boolean }
};

const KEY_ROWS  = "urgent:rows";
const KEY_STATE = "urgent:state";
const KEY_THEAD = "urgent:thead"; // 필요시 헤더 보존용(지금은 사용 안함)

/** rows */
export function listRows(): UrgentRow[] {
  try { return JSON.parse(localStorage.getItem(KEY_ROWS) || "[]"); } catch { return []; }
}
export function saveRows(list: UrgentRow[]) {
  try {
    const val = JSON.stringify(list);
    localStorage.setItem(KEY_ROWS, val);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_ROWS, newValue: val } as any));
  } catch {}
}

/** state(closed) */
export function getState(): UrgentState {
  try { return JSON.parse(localStorage.getItem(KEY_STATE) || "{}"); } catch { return {}; }
}
export function setState(st: UrgentState) {
  try {
    const val = JSON.stringify(st);
    localStorage.setItem(KEY_STATE, val);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_STATE, newValue: val } as any));
  } catch {}
}
export function toggleClosed(id: string) {
  const st = getState();
  const cur = !!st[id]?.closed;
  st[id] = { ...(st[id] || {}), closed: !cur };
  setState(st);
}

/** D-값 계산 유틸 */
export function daysLeftFromISO(iso: string) {
  const d = new Date(iso); const now = new Date();
  d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}
