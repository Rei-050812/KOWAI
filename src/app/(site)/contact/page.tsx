"use client";

import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "送信に失敗しました");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
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
            <div className="text-horror-crimson text-5xl mb-4">&#10003;</div>
            <h2 className="text-xl font-semibold text-horror-text">
              送信完了
            </h2>
            <p className="text-horror-text-secondary leading-relaxed">
              お問い合わせいただきありがとうございます。<br />
              内容を確認の上、ご返信いたします。
            </p>
            <a
              href="/"
              className="horror-button inline-block px-6 py-3 mt-4"
            >
              トップページに戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-3xl md:text-4xl font-bold text-horror-text mb-8 tracking-wide text-center"
          style={{ textShadow: "0 0 20px rgba(232, 230, 227, 0.1)" }}
        >
          お問い合わせ
        </h1>
        <div className="w-16 h-px bg-horror-crimson/60 mx-auto mb-10"></div>

        <div className="horror-card p-8">
          <p className="text-horror-text-secondary mb-8 text-center">
            KOWAIに関するご質問・ご意見・不具合報告等は、以下のフォームよりお気軽にご連絡ください。
          </p>

          {error && (
            <div className="mb-6 p-4 bg-horror-red/10 border border-horror-crimson/50 rounded-md text-horror-crimson text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-horror-text mb-2">
                お名前 <span className="text-horror-crimson">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="horror-input"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-horror-text mb-2">
                メールアドレス <span className="text-horror-crimson">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="horror-input"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-horror-text mb-2">
                件名 <span className="text-horror-crimson">*</span>
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="horror-input"
                placeholder="お問い合わせの件名"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-horror-text mb-2">
                お問い合わせ内容 <span className="text-horror-crimson">*</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                className="horror-input resize-none"
                placeholder="お問い合わせ内容をご記入ください"
              />
            </div>

            <div className="text-center pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="horror-button px-10 py-4 text-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="inline-block w-5 h-5 border-2 border-horror-text border-t-transparent rounded-full animate-spin" />
                    送信中...
                  </span>
                ) : (
                  "送信する"
                )}
              </button>
            </div>
          </form>

          <p className="text-sm text-horror-text-secondary/60 text-center mt-6">
            ※返信までにお時間をいただく場合がございます。
          </p>
        </div>
      </div>
    </div>
  );
}
