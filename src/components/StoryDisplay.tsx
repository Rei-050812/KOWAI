"use client";

import { Story, STYLE_LABELS } from "@/types";
import { useState } from "react";

interface StoryDisplayProps {
  story: Story;
  showActions?: boolean;
}

export default function StoryDisplay({ story, showActions = true }: StoryDisplayProps) {
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
        setLikes(prev => prev + 1);
        setHasLiked(true);
      }
    } catch (error) {
      console.error("Failed to like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = () => {
    const text = `「${story.word}」から生まれた怪談を読んでみて...`;
    const url = `${window.location.origin}/story/${story.id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  return (
    <div className="horror-card space-y-6">
      {/* メタ情報 */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="bg-horror-red/30 text-horror-crimson px-3 py-1 rounded-full font-bold">
          {story.word}
        </span>
        <span className="text-gray-400">
          {STYLE_LABELS[story.style]}
        </span>
      </div>

      {/* 怪談本文 */}
      <div className="story-text text-gray-200 whitespace-pre-wrap leading-relaxed text-base md:text-lg">
        {story.content}
      </div>

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

          <a
            href={`/story/${story.id}`}
            className="ml-auto text-horror-crimson hover:text-white transition-colors duration-300"
          >
            詳細を見る →
          </a>
        </div>
      )}
    </div>
  );
}
