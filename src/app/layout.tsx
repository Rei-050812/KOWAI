import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KOWAI - AIが紡ぐ本格ホラーストーリー",
    template: "%s | KOWAI",
  },
  description:
    "単語1つ入力するだけで、AIが本格的な怪談を生成。短編から長編まで、あなただけの怖い話を今すぐ体験。毎日更新されるランキングも。",
  keywords: [
    "怪談",
    "ホラー",
    "怖い話",
    "AI",
    "心霊",
    "都市伝説",
    "自動生成",
    "恐怖",
  ],
  authors: [{ name: "KOWAI" }],
  creator: "KOWAI",
  publisher: "KOWAI",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "KOWAI",
    title: "KOWAI - AIが紡ぐ本格ホラーストーリー",
    description:
      "単語1つ入力するだけで、AIが本格的な怪談を生成。短編から長編まで、あなただけの怖い話を今すぐ体験。",
  },
  twitter: {
    card: "summary_large_image",
    title: "KOWAI - AIが紡ぐ本格ホラーストーリー",
    description:
      "単語1つ入力するだけで、AIが本格的な怪談を生成。短編から長編まで、あなただけの怖い話を今すぐ体験。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
