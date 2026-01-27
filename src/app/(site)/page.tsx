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
    <div className="container mx-auto px-6 py-12 md:py-16">
      {/* ヒーローセクション */}
      <section className="text-center mb-16 md:mb-20">
        <h2 className="text-5xl md:text-7xl font-bold text-horror-text mb-6 tracking-wide leading-tight" style={{textShadow: '0 0 30px rgba(232, 230, 227, 0.2)'}}>
          <span className="text-horror-crimson">怪</span>談を
          <span className="text-horror-crimson">紡</span>ぐ
        </h2>
        <div className="w-24 h-px bg-horror-crimson/60 mx-auto mb-8"></div>
        <p className="text-horror-text-secondary text-lg md:text-xl max-w-2xl mx-auto leading-loose tracking-wide">
          たった一つの単語から、AIが本格的な怪談を生成します。
          <br className="hidden md:block" />
          あなたの恐怖の種を、物語へと変えましょう。
        </p>
      </section>

      {/* 生成フォーム */}
      <section className="max-w-2xl mx-auto mb-16">
        <div className="horror-card">
          <StoryGenerator onGenerate={handleGenerate} isLoading={isLoading} />
        </div>
      </section>

      {/* エラー表示 */}
      {error && (
        <section className="max-w-2xl mx-auto mb-12">
          <div className="bg-horror-red/10 border border-horror-crimson/50 rounded-md p-6 text-center">
            <p className="text-horror-crimson tracking-wide">{error}</p>
          </div>
        </section>
      )}

      {/* 生成された怪談 */}
      {generatedStory && (
        <section className="max-w-3xl mx-auto mb-20">
          <h3 className="text-3xl font-bold text-horror-text mb-8 text-center tracking-wide">
            <span className="text-horror-crimson">生成された怪談</span>
          </h3>
          <div className="w-16 h-px bg-horror-crimson/50 mx-auto mb-10"></div>
          <StoryDisplay story={generatedStory} />
        </section>
      )}

      {/* ランキングセクション */}
      <section className="max-w-6xl mx-auto pt-8">
        <h3 className="text-3xl font-bold text-horror-text mb-10 text-center tracking-wide">
          <span className="text-horror-crimson">怪談</span>ランキング
        </h3>
        <div className="w-16 h-px bg-horror-crimson/50 mx-auto mb-12"></div>
        <RankingPreview />

        <div className="text-center mt-12">
          <a
            href="/ranking"
            className="inline-block text-horror-text border border-horror-crimson/60 hover:border-horror-crimson hover:bg-horror-crimson/10 px-8 py-4 rounded-md transition-all duration-400 tracking-wider"
            style={{boxShadow: '0 0 20px rgba(165, 42, 42, 0.2)'}}
          >
            すべてのランキングを見る →
          </a>
        </div>
      </section>
    </div>
  );
}
