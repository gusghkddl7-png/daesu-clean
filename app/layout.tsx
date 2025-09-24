import { Suspense } from "react";
import "./globals.css";
import NoScrollJank from "./_client/NoScrollJank";
import Script from "next/script";

export const metadata = { title: "daesu", description: "" };

// ✅ 전역 캐시 비활성
export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 앱이 실행되기 전에 Tab 막는 스크립트를 무력화 */}
        <Script id="global-tab-guard" strategy="beforeInteractive">{`
(function () {
  function isFocusable(el) {
    if (!el) return false;
    if (el.closest && el.closest('[data-tabtrap="true"]')) return false;
    var tag = (el.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return true;
    if (el.isContentEditable) return true;
    var ti = el.getAttribute && el.getAttribute("tabindex");
    return ti !== null && ti !== undefined && parseInt(ti, 10) >= 0;
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    if (!isFocusable(e.target)) return;
    try { e.preventDefault = function(){}; } catch (_) {}
    e.stopImmediatePropagation();
  }, true);
  try {
    if (document.body && document.body.getAttribute("tabindex") === "-1") {
      document.body.removeAttribute("tabindex");
    }
  } catch (_) {}
})();
        `}</Script>
      </head>
      <body>
        <NoScrollJank />
        {/* 윈도우 대신 이 컨테이너만 스크롤 */}
        <div id="app-scroll" className="min-h-screen max-h-screen">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </body>
    </html>
  );
}
