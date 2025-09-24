"use client";

export type UrgentRow = {
  id: string;
  moveIn: string;    // YYYY-MM-DD
  days: number;      // D-값
  rowHTML: string;   // <tr> 내부 HTML (cells)
};

const KEY_ROWS  = "urgent:rows";
const KEY_THEAD = "urgent:thead";

/** 저장된 헤더/행 */
export function getThead(): string | null {
  try { return localStorage.getItem(KEY_THEAD); } catch { return null; }
}
export function setThead(html: string) {
  try {
    localStorage.setItem(KEY_THEAD, html);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_THEAD, newValue: html } as any));
  } catch {}
}
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

/** 유틸 */
export function daysLeftFromISO(iso: string) {
  const d = new Date(iso); const now = new Date();
  d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}
export function purgeExpiredRows() {
  const kept = listRows().filter(x => x.days >= 0);
  saveRows(kept);
}
