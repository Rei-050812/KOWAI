export default function NotFound() {
  return (
    <div className="container mx-auto px-6 py-20 text-center">
      <div className="max-w-lg mx-auto">
        <h2
          className="text-8xl md:text-9xl font-bold text-horror-crimson mb-6 tracking-wider"
          style={{ textShadow: '0 0 40px rgba(165, 42, 42, 0.5)' }}
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
        <a
          href="/"
          className="horror-button inline-block px-8 py-4 text-lg tracking-wider"
        >
          トップページに戻る
        </a>
      </div>
    </div>
  );
}
