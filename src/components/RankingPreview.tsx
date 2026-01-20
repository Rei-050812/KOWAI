"use client";

import { useEffect, useState } from "react";
import { Story, WordCount, STYLE_LABELS } from "@/types";

interface RankingData {
  latest: Story[];
  popular: Story[];
  words: WordCount[];
}

export default function RankingPreview() {
  const [data, setData] = useState<RankingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await fetch("/api/ranking");
        if (response.ok) {
          const rankingData = await response.json();
          setData(rankingData);
        }
      } catch (error) {
        console.error("Failed to fetch ranking:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRanking();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="horror-card animate-pulse">
            <div className="h-6 bg-horror-dark rounded w-1/2 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 bg-horror-dark rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 最新の怪談 */}
      <div className="horror-card">
        <h4 className="text-lg font-bold text-horror-crimson mb-4 flex items-center gap-2">
          <span>🕐</span> 最新の怪談
        </h4>
        {data?.latest && data.latest.length > 0 ? (
          <div className="space-y-3">
            {data.latest.slice(0, 3).map((story) => (
              <a
                key={story.id}
                href={`/story/${story.id}`}
                className="block p-3 bg-horror-dark/50 rounded hover:bg-horror-red/10 transition-colors"
              >
                <span className="text-horror-crimson font-bold text-sm">
                  {story.word}
                </span>
                <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                  {story.content.slice(0, 40)}...
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">怪談を生成すると表示されます</p>
        )}
      </div>

      {/* 人気の怪談 */}
      <div className="horror-card">
        <h4 className="text-lg font-bold text-horror-crimson mb-4 flex items-center gap-2">
          <span>🔥</span> 人気の怪談
        </h4>
        {data?.popular && data.popular.length > 0 ? (
          <div className="space-y-3">
            {data.popular.slice(0, 3).map((story) => (
              <a
                key={story.id}
                href={`/story/${story.id}`}
                className="block p-3 bg-horror-dark/50 rounded hover:bg-horror-red/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-horror-crimson font-bold text-sm">
                    {story.word}
                  </span>
                  <span className="text-gray-500 text-xs">❤️ {story.likes}</span>
                </div>
                <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                  {story.content.slice(0, 40)}...
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">いいねが多い怪談が表示されます</p>
        )}
      </div>

      {/* 人気の単語 */}
      <div className="horror-card">
        <h4 className="text-lg font-bold text-horror-crimson mb-4 flex items-center gap-2">
          <span>💀</span> 人気の単語
        </h4>
        {data?.words && data.words.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.words.slice(0, 10).map((word, index) => (
              <span
                key={word.id}
                className={`px-3 py-1 rounded-full text-sm ${
                  index < 3
                    ? "bg-horror-red/30 text-horror-crimson font-bold"
                    : "bg-horror-dark text-gray-400"
                }`}
              >
                {word.word}
                <span className="text-xs ml-1 opacity-60">({word.count})</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">よく使われる単語が表示されます</p>
        )}
      </div>
    </div>
  );
}
