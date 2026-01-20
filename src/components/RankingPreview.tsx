"use client";

import { useEffect, useState } from "react";
import { Story, WordCount } from "@/types";

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* 最新の怪談 */}
      <div className="horror-card">
        <h4 className="text-xl font-bold text-horror-crimson mb-6 flex items-center gap-3 tracking-wide">
          <span>🕐</span> 最新の怪談
        </h4>
        {data?.latest && data.latest.length > 0 ? (
          <div className="space-y-4">
            {data.latest.slice(0, 3).map((story) => (
              <a
                key={story.id}
                href={`/story/${story.id}`}
                className="block p-4 bg-horror-black/60 border border-horror-blood/30 rounded-md hover:bg-horror-red/10 hover:border-horror-crimson/50 transition-all duration-400"
                style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'}}
              >
                <p className="font-semibold text-horror-text text-sm mb-2 tracking-wide leading-relaxed">
                  {story.title}
                </p>
                <span className="text-horror-crimson text-xs tracking-wider">
                  {story.word}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-horror-text-secondary text-sm tracking-wide">怪談を生成すると表示されます</p>
        )}
      </div>

      {/* 人気の怪談 */}
      <div className="horror-card">
        <h4 className="text-xl font-bold text-horror-crimson mb-6 flex items-center gap-3 tracking-wide">
          <span>🔥</span> 人気の怪談
        </h4>
        {data?.popular && data.popular.length > 0 ? (
          <div className="space-y-4">
            {data.popular.slice(0, 3).map((story) => (
              <a
                key={story.id}
                href={`/story/${story.id}`}
                className="block p-4 bg-horror-black/60 border border-horror-blood/30 rounded-md hover:bg-horror-red/10 hover:border-horror-crimson/50 transition-all duration-400"
                style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'}}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-horror-text text-sm tracking-wide leading-relaxed">{story.title}</p>
                  <span className="text-horror-text-secondary text-xs">❤️ {story.likes}</span>
                </div>
                <span className="text-horror-crimson text-xs tracking-wider">
                  {story.word}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-horror-text-secondary text-sm tracking-wide">いいねが多い怪談が表示されます</p>
        )}
      </div>

      {/* 人気の単語 */}
      <div className="horror-card">
        <h4 className="text-xl font-bold text-horror-crimson mb-6 flex items-center gap-3 tracking-wide">
          <span>💀</span> 人気の単語
        </h4>
        {data?.words && data.words.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {data.words.slice(0, 10).map((word, index) => (
              <span
                key={word.id}
                className={`px-4 py-2 rounded-sm text-sm tracking-wider ${
                  index < 3
                    ? "bg-horror-red/20 text-horror-crimson font-semibold border border-horror-crimson/40"
                    : "bg-horror-black/60 text-horror-text-secondary border border-horror-blood/20"
                }`}
              >
                {word.word}
                <span className="text-xs ml-1.5 opacity-60">({word.count})</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-horror-text-secondary text-sm tracking-wide">よく使われる単語が表示されます</p>
        )}
      </div>
    </div>
  );
}
