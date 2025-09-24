import "./globals.css";
import Script from "next/script";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  const preload = `
  (function(){
    try {
      var c = document.cookie || "";
      var m = c.match(/(?:user(email|id)|email|uid|userid)=([^;]+)/i);
      var key = m ? decodeURIComponent(m[2] || m[1] || "") : "global";
      var raw = localStorage.getItem("siteFontPx:"+key) || localStorage.getItem("siteFontPx");
      var n = Number(raw);
      var px = (isFinite(n) && n >= 12 && n <= 22) ? n : 14;
      var v = px + "px";
      document.documentElement.style.setProperty("--site-font-px", v);
    } catch(e) {}
  })();`;

  return (
    <html lang="ko">
      <head>
        {/* 페이지가 그려지기 전에 폰트 크기를 미리 적용 → 깜빡임 방지 */}
        <Script id="site-font-preload" strategy="beforeInteractive">{preload}</Script>
      </head>
      <body>
        {/* 사이트 전체에 폰트 크기 적용 */}
        <div id="site-font-root" className="site-font">{children}</div>
      </body>
    </html>
  );
}
