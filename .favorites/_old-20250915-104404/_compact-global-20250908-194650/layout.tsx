import "./globals.css";
import GlobalUiHelpers from "./components/GlobalUiHelpers";
import { Inter } from "next/font/google";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "대수부동산",
  description: "매물관리",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className + " min-h-screen bg-white text-gray-900"}>
        {children}
        <GlobalUiHelpers />
  
  
</body>
    </html>
  );
}





