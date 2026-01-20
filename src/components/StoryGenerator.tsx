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

  const styles: StoryStyle[] = ["short", "medium", "long"];

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* 単語入力 */}
      <div className="space-y-4">
        <label htmlFor="word" className="block text-xl font-semibold text-horror-text tracking-wide">
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
        <p className="text-sm text-horror-text-secondary tracking-wide">
          ※ 1〜20文字の単語を入力してください
        </p>
      </div>

      {/* スタイル選択 */}
      <div className="space-y-5">
        <p className="text-xl font-semibold text-horror-text tracking-wide">怪談のスタイルを選択</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {styles.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setSelectedStyle(style)}
              disabled={isLoading}
              className={`p-5 rounded-md border text-left transition-all duration-400 ${
                selectedStyle === style
                  ? "border-horror-crimson bg-horror-red/15"
                  : "border-horror-blood/40 bg-horror-black/40 hover:border-horror-crimson/60 hover:bg-horror-red/5"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={selectedStyle === style ? {boxShadow: '0 0 25px rgba(165, 42, 42, 0.3)'} : {boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'}}
            >
              <p className="font-semibold text-horror-text mb-2 tracking-wide">{STYLE_LABELS[style]}</p>
              <p className="text-sm text-horror-text-secondary leading-relaxed tracking-wide">{STYLE_DESCRIPTIONS[style]}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 生成ボタン */}
      <button
        type="submit"
        disabled={!word.trim() || isLoading}
        className="horror-button w-full text-xl py-5 flex items-center justify-center gap-4"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-5 h-5 border-2 border-horror-text border-t-transparent rounded-full animate-spin" />
            <span className="tracking-wider">怪談を紡いでいます<span className="loading-dots" /></span>
          </>
        ) : (
          <>
            <span className="text-2xl">👻</span>
            <span className="tracking-wider">怪談を生成する</span>
          </>
        )}
      </button>
    </form>
  );
}
