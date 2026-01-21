"use client";

import { StoryWithScore, STYLE_LABELS } from "@/types";
import { ReactNode } from "react";

interface RankingCardProps {
  story: StoryWithScore;
  rank: number;
  showScore?: boolean;
  showLikeRate?: boolean;
  badge?: ReactNode;
}

export default function RankingCard({
  story,
  rank,
  showScore = false,
  showLikeRate = false,
  badge,
}: RankingCardProps) {
  const likeRate = story.views > 0 ? (story.likes / story.views) * 100 : 0;

  return (
    <a
      href={`/story/${story.id}`}
      className="block horror-card hover:border-horror-crimson/50 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        {/* ランキング番号 */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black ${
            rank <= 3
              ? "bg-horror-crimson text-white"
              : "bg-horror-dark text-gray-400"
          }`}
        >
          {rank}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          {/* タイトル + バッジ */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-horror-crimson">{story.title}</h3>
            {badge}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-horror-red/30 text-horror-crimson px-2 py-1 rounded text-sm font-bold">
              {story.word}
            </span>
            <span className="text-gray-500 text-xs">
              {STYLE_LABELS[story.style]}
            </span>
          </div>

          <p className="text-gray-400 text-sm line-clamp-2">{story.hook}</p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>
              {new Date(story.created_at).toLocaleDateString("ja-JP")}
            </span>
            <span>❤️ {story.likes}</span>
            <span>👁 {story.views}</span>
            {story.share_count > 0 && <span>🔗 {story.share_count}</span>}
            {showScore && (
              <span className="text-horror-crimson font-bold">
                ⭐ {story.score.toFixed(1)}
              </span>
            )}
            {showLikeRate && (
              <span className="text-horror-crimson font-bold">
                💖 {likeRate.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
