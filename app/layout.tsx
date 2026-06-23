import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "블로그 글 작성기",
  description: "Claude 기반 정보/하우투 블로그 글 자동 생성기",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
