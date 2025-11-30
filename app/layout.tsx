import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LazyCoach",
  description: "Ultra fast, human-friendly workout logging for coaches.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        {/* iOS PWA 相關設定 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="LazyCoach" />

        {/* Apple 主畫面 icon（建議 180x180，但你現在用 192 也可以先用） */}
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* 額外指定 manifest（其實上面的 metadata.manifest 已經會幫你處理一次了，保險起見也OK） */}
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
