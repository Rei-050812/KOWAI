export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-4xl font-black text-horror-crimson mb-4">404</h2>
      <p className="text-gray-400 mb-8">
        お探しの怪談は闇の中に消えてしまいました...
      </p>
      <a href="/" className="horror-button inline-block">
        トップページに戻る
      </a>
    </div>
  );
}
