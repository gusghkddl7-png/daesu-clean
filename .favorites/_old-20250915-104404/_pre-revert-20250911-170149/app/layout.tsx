import "./globals.css";
import type { Metadata } from "next";
import ToolbarArrange from "./listings/_assist/ToolbarArrange";

export const metadata: Metadata = {
  title: "대수 부동산 내부",
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ToolbarArrange />
        {children}
      </body>
    </html>
  );
}
