"use client";
import { useEffect } from "react";

/**
 * NoScrollJank - lite (Tab-safe)
 * - Tab/키보드/포커스에 전혀 손대지 않음
 * - 빈/해시 링크(#)만 무력화
 * - 브라우저 스크롤 복원만 수동
 */
export default function NoScrollJank() {
  useEffect(() => {
    // 브라우저 기본 스크롤 복원 끄기(라우팅/뒤로가기 시 점프 방지)
    try {
      if ("scrollRestoration" in history) {
        (history as any).scrollRestoration = "manual";
      }
    } catch {}

    // 빈/해시 링크 점프 방지
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.('a[href="#"], a[href=""]') as HTMLAnchorElement | null;
      if (a) e.preventDefault();
    };
    document.addEventListener("click", onClick, { capture: true });

    return () => {
      document.removeEventListener("click", onClick, { capture: true } as any);
    };
  }, []);

  return null;
}
