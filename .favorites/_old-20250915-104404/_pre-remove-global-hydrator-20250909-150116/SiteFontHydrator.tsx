"use client";
import { useEffect } from "react";

/** 로그인 계정별 key 추출: cookie에 email/user/uid 등이 있으면 그 값으로 네임스페이스 */
function getUserKey() {
  try {
    const c = document.cookie || "";
    const m = c.match(/(?:user(email|id)|email|uid|userid)=([^;]+)/i);
    if (m) return decodeURIComponent(m[2]);
  } catch {}
  return "global";
}

export default function SiteFontHydrator() {
  useEffect(() => {
    const userKey = getUserKey();
    const storageKey = `siteFontPx:${userKey}`;

    const apply = (px: number) => {
      const v = `${px}px`;
      document.documentElement.style.setProperty("--site-font-px", v);
      const root = document.getElementById("site-font-root") as HTMLElement | null;
      if (root) root.style.setProperty("--site-font-px", v);
    };

    // 초기값: 14, 저장값 있으면 반영
    let px = 14;
    try {
      const raw = localStorage.getItem(storageKey) ?? localStorage.getItem("siteFontPx");
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 12 && n <= 22) px = n;
    } catch {}
    apply(px);

    // 탭 간 동기화
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const n = Number(e.newValue);
        if (Number.isFinite(n)) apply(n);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
