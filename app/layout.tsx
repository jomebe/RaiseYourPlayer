import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const base = `${protocol}://${host}`;
  return {
    title: "Raise Your Player",
    description: "나만의 축구 선수를 키워 전설로 만드는 커리어 시뮬레이션",
    openGraph: {
      title: "Raise Your Player",
      description: "축구 선수 육성 시뮬레이션",
      images: [{ url: `${base}/og.png`, width: 1731, height: 909 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Raise Your Player",
      description: "축구 선수 육성 시뮬레이션",
      images: [`${base}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
