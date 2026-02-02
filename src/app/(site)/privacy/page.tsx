import { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "KOWAIのプライバシーポリシーについて",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-6 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-3xl md:text-4xl font-bold text-horror-text mb-8 tracking-wide"
          style={{ textShadow: "0 0 20px rgba(232, 230, 227, 0.1)" }}
        >
          プライバシーポリシー
        </h1>
        <div className="w-16 h-px bg-horror-crimson/60 mb-10"></div>

        <div className="prose prose-invert prose-horror max-w-none space-y-8 text-horror-text-secondary leading-relaxed">
          <p className="text-sm text-horror-text-secondary/60">
            最終更新日：2026年2月2日
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">1. はじめに</h2>
            <p>
              KOWAI（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">2. 収集する情報</h2>
            <p>本サービスでは以下の情報を収集する場合があります：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>利用状況データ（閲覧数、いいね数等の匿名統計情報）</li>
              <li>アクセスログ（IPアドレス、ブラウザ情報、アクセス日時等）</li>
              <li>Cookieによる設定情報</li>
            </ul>
            <p className="text-sm">
              ※本サービスはアカウント登録を必要としないため、氏名・メールアドレス等の個人情報は収集しません。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">3. 情報の利用目的</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>サービスの提供・改善</li>
              <li>利用状況の分析</li>
              <li>不正利用の防止</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">4. 第三者提供</h2>
            <p>
              法令に基づく場合を除き、収集した情報を第三者に提供することはありません。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">5. 第三者サービス</h2>
            <p>本サービスは以下の第三者サービスを利用しています：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Anthropic（AI生成）</li>
              <li>Supabase（データベース）</li>
              <li>Vercel（ホスティング）</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">6. Cookieの使用</h2>
            <p>
              本サービスでは、ユーザー体験向上のためCookieを使用する場合があります。ブラウザの設定でCookieを無効にすることが可能です。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">7. お問い合わせ</h2>
            <p>
              プライバシーに関するお問い合わせは、
              <a href="/contact" className="text-horror-crimson hover:underline">
                お問い合わせページ
              </a>
              よりご連絡ください。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">8. 改定</h2>
            <p>
              本ポリシーは予告なく改定される場合があります。改定後のポリシーは本ページに掲載した時点で効力を生じます。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
