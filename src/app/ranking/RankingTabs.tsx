"use client";

import { useState } from "react";
import { Story, TrendWord, WordCount, STYLE_LABELS } from "@/types";
import TrendWordBadge from "@/components/TrendWordBadge";

interface RankingTabsProps {
  latestStories: Story[];
  popularStories: Story[];
  popularWords: WordCount[];
  trendWords: TrendWord[];
}

type TabType = "latest" | "popular" | "words" | "trending";

export default function RankingTabs({
  latestStories,
  popularStories,
  popularWords,
  trendWords,
}: RankingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("latest");

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "latest", label: "最新の怪談", icon: "🕐" },
    { id: "popular", label: "人気の怪談", icon: "🔥" },
    { id: "words", label: "人気の単語", icon: "💀" },
    { id: "trending", label: "トレンド", icon: "📈" },
  ];

  return (
    <div>
      {/* タブボタン */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
              activeTab === tab.id
                ? "bg-horror-red text-white"
                : "bg-horror-dark/50 text-gray-400 hover:bg-horror-dark hover:text-white border border-horror-red/30"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="min-h-[400px]">
        {activeTab === "latest" && (
          <StoryList stories={latestStories} showDate />
        )}
        {activeTab === "popular" && (
          <StoryList stories={popularStories} showLikes />
        )}
        {activeTab === "words" && <WordList words={popularWords} />}
        {activeTab === "trending" && <TrendList trendWords={trendWords} />}
      </div>
    </div>
  );
}

function StoryList({
  stories,
  showDate = false,
  showLikes = false,
}: {
  stories: Story[];
  showDate?: boolean;
  showLikes?: boolean;
}) {
  if (stories.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        まだ怪談がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stories.map((story, index) => (
        <a
          key={story.id}
          href={`/story/${story.id}`}
          className="block horror-card hover:border-horror-crimson/50 transition-all duration-300"
        >
          <div className="flex items-start gap-4">
            {/* ランキング番号 */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black ${
                index < 3
                  ? "bg-horror-crimson text-white"
                  : "bg-horror-dark text-gray-400"
              }`}
            >
              {index + 1}
            </div>

            {/* コンテンツ */}
            <div className="flex-1 min-w-0">
              {/* タイトル */}
              <h3 className="font-bold text-horror-crimson mb-2">
                {story.title}
              </h3>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-horror-red/30 text-horror-crimson px-2 py-1 rounded text-sm font-bold">
                  {story.word}
                </span>
                <span className="text-gray-500 text-xs">
                  {STYLE_LABELS[story.style]}
                </span>
              </div>

              <p className="text-gray-400 text-sm line-clamp-2">
                {story.hook}
              </p>

              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {showDate && (
                  <span>
                    {new Date(story.created_at).toLocaleDateString("ja-JP")}
                  </span>
                )}
                {showLikes && <span>❤️ {story.likes}</span>}
                <span>👁 {story.views}</span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function WordList({ words }: { words: WordCount[] }) {
  if (words.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        まだ単語データがありません
      </div>
    );
  }

  const maxCount = words[0]?.count || 1;

  return (
    <div className="space-y-3">
      {words.map((wordData, index) => (
        <div key={wordData.id} className="horror-card flex items-center gap-4">
          {/* ランキング番号 */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black ${
              index < 3
                ? "bg-horror-crimson text-white"
                : "bg-horror-dark text-gray-400"
            }`}
          >
            {index + 1}
          </div>

          {/* 単語とバー */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-lg">
                {wordData.word}
              </span>
              <span className="text-gray-400 text-sm">
                {wordData.count}回使用
              </span>
            </div>
            <div className="h-2 bg-horror-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-horror-red to-horror-crimson transition-all duration-500"
                style={{ width: `${(wordData.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendList({ trendWords }: { trendWords: TrendWord[] }) {
  if (trendWords.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <p className="text-4xl mb-4">📈</p>
        <p>まだトレンドデータがありません</p>
        <p className="text-sm mt-2">怪談が生成されるとトレンドが表示されます</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4 text-center">
        過去24時間で使用が増えた単語（前日比）
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {trendWords.map((trendWord) => (
          <TrendWordBadge key={trendWord.word} trendWord={trendWord} />
        ))}
      </div>
    </div>
  );
}
