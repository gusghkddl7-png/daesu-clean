"use client";

export type UrgentRow = {
  id: string;        // 전화번호 우선
  anchorId: string;  // /clients 해시 이동용
  moveIn: string;    // YYYY-MM-DD
  days: number;      // 남은 일수
  rowHTML: string;   // <tr> innerHTML
};

const KEY_ROWS  = "urgent:rows";
const KEY_THEAD = "urgent:thead";

export function listRows(): UrgentRow[] {
  try { return JSON.parse(localStorage.getItem(KEY_ROWS) || "[]"); } catch { return []; }
}
export function saveRows(rows: UrgentRow[]) {
  try {
    const v = JSON.stringify(rows);
    localStorage.setItem(KEY_ROWS, v);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_ROWS, newValue: v } as any));
  } catch {}
}

export function getThead(): string | null {
  try { return localStorage.getItem(KEY_THEAD); } catch { return null; }
}
export function setThead(html: string) {
  try {
    localStorage.setItem(KEY_THEAD, html);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_THEAD, newValue: html } as any));
  } catch {}
}
