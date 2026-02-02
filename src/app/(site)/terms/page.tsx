import { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description: "KOWAIの利用規約について",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-6 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-3xl md:text-4xl font-bold text-horror-text mb-8 tracking-wide"
          style={{ textShadow: "0 0 20px rgba(232, 230, 227, 0.1)" }}
        >
          利用規約
        </h1>
        <div className="w-16 h-px bg-horror-crimson/60 mb-10"></div>

        <div className="prose prose-invert prose-horror max-w-none space-y-8 text-horror-text-secondary leading-relaxed">
          <p className="text-sm text-horror-text-secondary/60">
            最終更新日：2026年2月2日
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第1条（適用）</h2>
            <p>
              本規約は、KOWAI（以下「本サービス」）の利用に関する条件を定めます。ユーザーは本規約に同意した上で本サービスを利用するものとします。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第2条（サービス概要）</h2>
            <p>本サービスは、AIを活用した怪談生成サービスです。</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第3条（利用資格）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>本サービスは13歳以上の方を対象としています</li>
              <li>18歳未満の方は、保護者の同意を得た上でご利用ください</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第4条（AI生成コンテンツについて）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>本サービスで生成される怪談は、すべてAI（Claude）によって自動生成されます</li>
              <li>生成されたコンテンツはフィクションであり、実在の人物・団体・事件とは一切関係ありません</li>
              <li>生成結果の正確性・適切性について、運営者は保証しません</li>
              <li>不適切なコンテンツが生成される可能性があることをご了承ください</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第5条（禁止事項）</h2>
            <p>以下の行為を禁止します：</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>本サービスへの不正アクセス</li>
              <li>サーバーに過度の負荷をかける行為</li>
              <li>自動化ツール・ボットによる大量生成</li>
              <li>生成コンテンツを自作として偽る行為</li>
              <li>法令または公序良俗に反する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第6条（生成コンテンツの利用）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>個人での利用・SNSでのシェアは自由です</li>
              <li>商用利用を希望する場合は、事前にお問い合わせください</li>
              <li>利用の際は「KOWAI」で生成した旨の記載を推奨します</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第7条（知的財産権）</h2>
            <p>
              本サービスのロゴ、デザイン、プログラム等の知的財産権は運営者に帰属します。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第8条（免責事項）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>本サービスは「現状有姿」で提供されます</li>
              <li>生成コンテンツによって生じた損害について、運営者は責任を負いません</li>
              <li>サービスの中断・変更・終了によって生じた損害について、運営者は責任を負いません</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第9条（サービスの変更・終了）</h2>
            <p>運営者は、予告なくサービス内容を変更または終了できます。</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第10条（規約の変更）</h2>
            <p>
              運営者は本規約を変更できます。変更後に本サービスを利用した場合、変更に同意したものとみなします。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第11条（準拠法）</h2>
            <p>本規約は日本法に準拠します。</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-horror-text">第12条（お問い合わせ）</h2>
            <p>
              ご質問・ご意見は、
              <a href="/contact" className="text-horror-crimson hover:underline">
                お問い合わせページ
              </a>
              よりご連絡ください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
