import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Rank & Quiz | 전 국민 지식 배틀",
  description: "매일 새로운 퀴즈로 랭킹 경쟁! 친구를 도발하고 가장 높은 순위를 차지하세요.",
  openGraph: {
    title: "Rank & Quiz | 전 국민 지식 배틀",
    description: "오늘의 퀴즈, 당신의 순위는?",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${outfit.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
          integrity="sha384-l68m7Z3oK1cM0Xizv8xGvX74Y6G7W7xY8G7W7xY8G7W7xY8G7W7xY8G7W7xY8G7"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
