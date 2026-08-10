import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "记录",
  description: "需求 · 笔记 · 待办",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
