import { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "KOWAIへのお問い合わせ",
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-6 py-12 md:py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1
          className="text-3xl md:text-4xl font-bold text-horror-text mb-8 tracking-wide"
          style={{ textShadow: "0 0 20px rgba(232, 230, 227, 0.1)" }}
        >
          お問い合わせ
        </h1>
        <div className="w-16 h-px bg-horror-crimson/60 mx-auto mb-10"></div>

        <div className="horror-card p-8 space-y-6">
          <p className="text-horror-text-secondary leading-relaxed">
            KOWAIに関するご質問・ご意見・不具合報告等は、以下のメールアドレスまでお気軽にご連絡ください。
          </p>

          <div className="py-6">
            <p className="text-sm text-horror-text-secondary mb-2">メールアドレス</p>
            <p className="text-xl text-horror-text tracking-wide">
              contact@kowai.jp
            </p>
          </div>

          <p className="text-sm text-horror-text-secondary/60">
            ※返信までにお時間をいただく場合がございます。あらかじめご了承ください。
          </p>
        </div>
      </div>
    </div>
  );
}
