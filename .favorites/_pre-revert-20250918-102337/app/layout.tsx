import "./globals.css";
import NoScrollJank from "./_client/NoScrollJank";
import Script from "next/script";

export const metadata = { title: "daesu", description: "" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* ✅ 전역 Tab 허용: 캡처 단계에서 다른 핸들러로 전파만 막고 기본 동작(포커스 이동)은 그대로 놔둠 */}
        <Script id="allow-tab" strategy="afterInteractive">
          {`
            (function () {
              // 중복 등록 방지
              if (window.__ALLOW_TAB_INSTALLED__) return;
              window.__ALLOW_TAB_INSTALLED__ = true;

              const handler = function (e) {
                if (e.key === 'Tab') {
                  // Tab은 절대 막지 않음
                  if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
                  e.stopPropagation();
                  // e.preventDefault()는 절대 호출하지 않음
                }
              };

              // 가장 먼저 가로채서 다른 곳에 못 가게 (하지만 기본동작은 허용)
              document.addEventListener('keydown', handler, { capture: true });
            })();
          `}
        </Script>

        {/* 윈도우 대신 이 컨테이너만 스크롤 (tabindex 없음! 포커스 대상 아님) */}
        <div id="app-scroll" className="min-h-screen max-h-screen">
          {children}
        </div>

        {/* 기존 기능 유지 */}
        <NoScrollJank />
      </body>
    </html>
  );
}
