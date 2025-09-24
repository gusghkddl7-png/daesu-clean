import "./globals.css";
import NoScrollJank from "./_client/NoScrollJank";
import Script from "next/script";

export const metadata = { title: "daesu", description: "" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/* 앱이 실행되기 전에 Tab 막는 스크립트를 무력화 */}
      <head>
        <Script id="global-tab-guard" strategy="beforeInteractive">{`
(function () {
  // 포커스 가능한지 간단 판별
  function isFocusable(el) {
    if (!el) return false;
    // 모달 등에서 의도적으로 탭 트랩을 쓰고 싶으면 data-tabtrap="true"를 컨테이너에 달면 이 가드를 무시
    if (el.closest && el.closest('[data-tabtrap="true"]')) return false;
    var tag = (el.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return true;
    if (el.isContentEditable) return true;
    var ti = el.getAttribute && el.getAttribute("tabindex");
    return ti !== null && ti !== undefined && parseInt(ti, 10) >= 0;
  }

  // Tab 키가 기본 동작(다음 요소로 포커스 이동) 하도록 보장
  // - 기본동작은 막지 않음
  // - 뒤에서 preventDefault 하는 리스너가 있어도 못 하게 방지
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    if (!isFocusable(e.target)) return;

    try { e.preventDefault = function(){}; } catch (_) {}
    // 다른 리스너들이 개입 못 하게 캡처 단계에서 바로 차단
    e.stopImmediatePropagation();
    // 기본동작은 그대로(포커스 이동)
  }, true);

  // body에 tabindex="-1" 같은 게 있으면 제거 (포커스 먹통 방지)
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
          {children}
        </div>
      </body>
    </html>
  );
}
