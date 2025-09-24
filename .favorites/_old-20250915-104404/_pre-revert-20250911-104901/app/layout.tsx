import "./globals.css";
import Script from "next/script";
import type { ReactNode } from "react";
import UrgentBridgeGlobal from "./_shared/UrgentBridgeGlobal";
import ClientsUrgentOnlyGlobal from "./_shared/ClientsUrgentOnlyGlobal";

/**
 * no-flash: 초기 페인트 전에 화면을 숨겼다가 즉시 표시해서
 * 새로고침 시 "잠깐 뜨는 이상한 페이지"를 차단합니다.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const css = `html{opacity:0}html[data-noflash]{opacity:1;transition:opacity .01s linear}`;
  const run = `(function(){try{document.documentElement.setAttribute("data-noflash","1");}catch(e){}})();`;

  return (
    <html lang="ko">
      <head>
        <style id="noflash-css">{css}</style>
        <Script id="noflash-run" strategy="beforeInteractive">{run}</Script>
      </head>
      <body>{children}  <UrgentBridgeGlobal />
  <ClientsUrgentOnlyGlobal />
</body>
    </html>
  );
}




