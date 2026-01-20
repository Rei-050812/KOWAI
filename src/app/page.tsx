"use client";

import { useState } from "react";
import StoryGenerator from "@/components/StoryGenerator";
import StoryDisplay from "@/components/StoryDisplay";
import RankingPreview from "@/components/RankingPreview";
import { Story, StoryStyle } from "@/types";

export default function Home() {
  const [generatedStory, setGeneratedStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (word: string, style: StoryStyle) => {
    setIsLoading(true);
    setError(null);
    setGeneratedStory(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word, style }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "怪談の生成に失敗しました");
      }

      const data = await response.json();
      setGeneratedStory(data.story);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* ヒーローセクション */}
      <section className="text-center mb-12 md:mb-16">
        <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-wider">
          <span className="text-horror-crimson">怪</span>談を
          <span className="text-horror-crimson">紡</span>ぐ
        </h2>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
          たった一つの単語から、AIが本格的な怪談を生成します。
          <br className="hidden md:block" />
          あなたの恐怖の種を、物語へと変えましょう。
        </p>
      </section>

      {/* 生成フォーム */}
      <section className="max-w-2xl mx-auto mb-12">
        <div className="horror-card">
          <StoryGenerator onGenerate={handleGenerate} isLoading={isLoading} />
        </div>
      </section>

      {/* エラー表示 */}
      {error && (
        <section className="max-w-2xl mx-auto mb-8">
          <div className="bg-horror-red/20 border border-horror-crimson rounded-lg p-4 text-center">
            <p className="text-horror-crimson">{error}</p>
          </div>
        </section>
      )}

      {/* 生成された怪談 */}
      {generatedStory && (
        <section className="max-w-3xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            <span className="text-horror-crimson">生成された怪談</span>
          </h3>
          <StoryDisplay story={generatedStory} />
        </section>
      )}

      {/* ランキングセクション */}
      <section className="max-w-6xl mx-auto">
        <h3 className="text-2xl font-bold text-white mb-8 text-center">
          <span className="text-horror-crimson">怪談</span>ランキング
        </h3>
        <RankingPreview />

        <div className="text-center mt-8">
          <a
            href="/ranking"
            className="inline-block text-horror-crimson hover:text-white border border-horror-crimson hover:bg-horror-crimson/20 px-6 py-3 rounded-lg transition-all duration-300"
          >
            すべてのランキングを見る →
          </a>
        </div>
      </section>
    </div>
  );
}
