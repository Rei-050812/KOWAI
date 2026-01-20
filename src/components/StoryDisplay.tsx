"use client";

import { Story, STYLE_LABELS } from "@/types";
import { useState } from "react";

interface StoryDisplayProps {
  story: Story;
  showActions?: boolean;
}

export default function StoryDisplay({
  story,
  showActions = true,
}: StoryDisplayProps) {
  const [likes, setLikes] = useState(story.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (hasLiked || isLiking) return;

    setIsLiking(true);
    try {
      const response = await fetch(`/api/stories/${story.id}/like`, {
        method: "POST",
      });

      if (response.ok) {
        setLikes((prev) => prev + 1);
        setHasLiked(true);
      }
    } catch (error) {
      console.error("Failed to like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = () => {
    const text = `「${story.word}」から生まれた怪談「${story.title}」を読んでみて...\n\n${story.hook}`;
    const url = `${window.location.origin}/story/${story.id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  return (
    <div className="horror-card space-y-6">
      {/* タイトル */}
      <h3 className="text-xl md:text-2xl font-bold text-horror-crimson">
        {story.title}
      </h3>

      {/* メタ情報 */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="bg-horror-red/30 text-horror-crimson px-3 py-1 rounded-full font-bold">
          {story.word}
        </span>
        <span className="text-gray-400">{STYLE_LABELS[story.style]}</span>
      </div>

      {/* Hook部分のみ表示 */}
      <div className="story-text text-gray-200 leading-relaxed text-base md:text-lg border-l-2 border-horror-crimson pl-4">
        {story.hook}
      </div>

      {/* 続きは詳細ページへ */}
      <a
        href={`/story/${story.id}`}
        className="block w-full py-4 border border-horror-crimson/50 rounded-lg text-horror-crimson hover:bg-horror-crimson/10 transition-all duration-300 font-bold text-center"
      >
        続きを読む →
      </a>

      {/* アクションボタン */}
      {showActions && (
        <div className="flex items-center gap-4 pt-4 border-t border-horror-red/20">
          <button
            onClick={handleLike}
            disabled={hasLiked || isLiking}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              hasLiked
                ? "bg-horror-red/30 text-horror-crimson"
                : "bg-horror-dark hover:bg-horror-red/20 text-gray-400 hover:text-white"
            }`}
          >
            <span className="text-xl">{hasLiked ? "❤️" : "🤍"}</span>
            <span>{likes}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-horror-dark hover:bg-horror-red/20 text-gray-400 hover:text-white transition-all duration-300"
          >
            <span className="text-xl">𝕏</span>
            <span>シェア</span>
          </button>
        </div>
      )}
    </div>
  );
}
