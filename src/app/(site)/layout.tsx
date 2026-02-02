export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-horror-blood/40 bg-horror-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-5">
          <a href="/" className="flex items-center gap-3">
            <h1
              className="text-3xl md:text-4xl font-bold text-horror-crimson tracking-wide"
              style={{ textShadow: "0 0 20px rgba(165, 42, 42, 0.4)" }}
            >
              KOWAI
            </h1>
            <span className="text-xs text-horror-text-secondary hidden sm:inline tracking-wider">
              - AI怪談生成 -
            </span>
          </a>
        </div>
      </header>
      <main className="flex-1 py-12">{children}</main>
      <footer className="border-t border-horror-blood/40 bg-horror-dark/60 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-horror-text-secondary text-sm">
          <div className="flex justify-center gap-6 mb-4">
            <a href="/terms" className="hover:text-horror-text transition-colors">
              利用規約
            </a>
            <a href="/privacy" className="hover:text-horror-text transition-colors">
              プライバシーポリシー
            </a>
            <a href="/contact" className="hover:text-horror-text transition-colors">
              お問い合わせ
            </a>
          </div>
          <p className="tracking-wider">
            &copy; 2026 KOWAI. All rights reserved.
          </p>
          <p className="mt-3 text-xs opacity-70">Powered by Claude AI</p>
        </div>
      </footer>
    </div>
  );
}
