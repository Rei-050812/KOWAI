import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KOWAI - AI怪談生成",
  description: "単語1つからAIが本格的な怪談を自動生成。ゾクッとする恐怖体験をあなたに。",
  keywords: ["怪談", "ホラー", "AI", "自動生成", "恐怖"],
  openGraph: {
    title: "KOWAI - AI怪談生成",
    description: "単語1つからAIが本格的な怪談を自動生成",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen bg-horror-gradient">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-horror-red/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
              <a href="/" className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-horror-crimson tracking-wider">
                  KOWAI
                </h1>
                <span className="text-xs text-gray-500 hidden sm:inline">- AI怪談生成 -</span>
              </a>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-horror-red/20 bg-black/50 py-6">
            <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
              <p>&copy; 2024 KOWAI. All rights reserved.</p>
              <p className="mt-2 text-xs">Powered by Claude AI</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
