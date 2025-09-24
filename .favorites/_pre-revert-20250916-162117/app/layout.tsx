import TabRescue from "./_client/TabRescue";
import "./globals.css";
import NoScrollJank from "./_client/NoScrollJank";

export const metadata = { title: "daesu", description: "" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <NoScrollJank />
        {/* 윈도우 대신 이 컨테이너만 스크롤 */}
        <div id="app-scroll" className="min-h-screen max-h-screen">
          {children}
        </div>
        <TabRescue />
  </body>
    </html>
  );
}
