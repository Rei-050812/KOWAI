import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-horror-dark flex flex-col">
      <header className="border-b border-horror-blood/40 bg-horror-dark/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <h1
              className="text-3xl md:text-4xl font-bold text-horror-crimson tracking-wide"
              style={{ textShadow: "0 0 20px rgba(165, 42, 42, 0.4)" }}
            >
              KOWAI
            </h1>
            <span className="text-xs text-horror-text-secondary hidden sm:inline tracking-wider">
              - AI怪談生成 -
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-6 py-20 text-center">
          <div className="max-w-lg mx-auto">
            <h2
              className="text-8xl md:text-9xl font-bold text-horror-crimson mb-6 tracking-wider"
              style={{ textShadow: "0 0 40px rgba(165, 42, 42, 0.5)" }}
            >
              404
            </h2>
            <div className="w-24 h-px bg-horror-crimson/60 mx-auto mb-8"></div>
            <p className="text-horror-text-secondary text-lg mb-4 tracking-wide leading-relaxed">
              お探しのページは見つかりませんでした
            </p>
            <p className="text-horror-text-secondary/60 text-sm mb-10 tracking-wide">
              URLが間違っているか、ページが削除された可能性があります
            </p>
            <Link
              href="/"
              className="horror-button inline-block px-8 py-4 text-lg tracking-wider"
            >
              トップページに戻る
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-horror-blood/40 bg-horror-dark/60 py-8">
        <div className="container mx-auto px-6 text-center text-horror-text-secondary text-sm">
          <p className="tracking-wider">&copy; 2026 KOWAI. All rights reserved.</p>
          <p className="mt-3 text-xs opacity-70">Powered by Claude AI</p>
        </div>
      </footer>
    </div>
  );
}
