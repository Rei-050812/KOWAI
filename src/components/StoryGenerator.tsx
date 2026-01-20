"use client";

import { useState } from "react";
import { StoryStyle, STYLE_LABELS, STYLE_DESCRIPTIONS } from "@/types";

interface StoryGeneratorProps {
  onGenerate: (word: string, style: StoryStyle) => Promise<void>;
  isLoading: boolean;
}

export default function StoryGenerator({ onGenerate, isLoading }: StoryGeneratorProps) {
  const [word, setWord] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<StoryStyle>("short");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || isLoading) return;
    await onGenerate(word.trim(), selectedStyle);
  };

  const styles: StoryStyle[] = ["short", "medium", "real", "urban"];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 単語入力 */}
      <div className="space-y-3">
        <label htmlFor="word" className="block text-lg font-bold text-gray-300">
          恐怖の種となる単語を入力
        </label>
        <input
          type="text"
          id="word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="例: 鏡、階段、電話..."
          className="horror-input text-xl"
          maxLength={20}
          disabled={isLoading}
        />
        <p className="text-sm text-gray-500">
          ※ 1〜20文字の単語を入力してください
        </p>
      </div>

      {/* スタイル選択 */}
      <div className="space-y-4">
        <p className="text-lg font-bold text-gray-300">怪談のスタイルを選択</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {styles.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setSelectedStyle(style)}
              disabled={isLoading}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                selectedStyle === style
                  ? "border-horror-crimson bg-horror-red/20 shadow-lg"
                  : "border-horror-red/30 bg-horror-dark/50 hover:border-horror-red/60"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <p className="font-bold text-white mb-1">{STYLE_LABELS[style]}</p>
              <p className="text-sm text-gray-400">{STYLE_DESCRIPTIONS[style]}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 生成ボタン */}
      <button
        type="submit"
        disabled={!word.trim() || isLoading}
        className="horror-button w-full text-xl py-4 flex items-center justify-center gap-3"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>怪談を紡いでいます<span className="loading-dots" /></span>
          </>
        ) : (
          <>
            <span className="text-2xl">👻</span>
            <span>怪談を生成する</span>
          </>
        )}
      </button>
    </form>
  );
}
