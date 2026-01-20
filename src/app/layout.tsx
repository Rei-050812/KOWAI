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
      <body className="antialiased min-h-screen">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-horror-blood/40 bg-horror-dark/80 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-6 py-5">
              <a href="/" className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-horror-crimson tracking-wide" style={{textShadow: '0 0 20px rgba(165, 42, 42, 0.4)'}}>
                  KOWAI
                </h1>
                <span className="text-xs text-horror-text-secondary hidden sm:inline tracking-wider">- AI怪談生成 -</span>
              </a>
            </div>
          </header>
          <main className="flex-1 py-12">
            {children}
          </main>
          <footer className="border-t border-horror-blood/40 bg-horror-dark/60 py-8 mt-16">
            <div className="container mx-auto px-6 text-center text-horror-text-secondary text-sm">
              <p className="tracking-wider">&copy; 2026 KOWAI. All rights reserved.</p>
              <p className="mt-3 text-xs opacity-70">Powered by Claude AI</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
