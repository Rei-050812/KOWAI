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
    <div className="horror-card space-y-8">
      {/* タイトル */}
      <h3 className="text-2xl md:text-3xl font-bold text-horror-crimson tracking-wide leading-tight" style={{textShadow: '0 0 20px rgba(165, 42, 42, 0.3)'}}>
        {story.title}
      </h3>

      {/* メタ情報 */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="bg-horror-red/20 text-horror-crimson px-4 py-2 rounded-sm font-semibold border border-horror-crimson/40 tracking-wider">
          {story.word}
        </span>
        <span className="text-horror-text-secondary tracking-wide">{STYLE_LABELS[story.style]}</span>
      </div>

      {/* Hook部分のみ表示 */}
      <div className="story-text text-horror-text leading-loose text-base md:text-lg border-l-2 border-horror-crimson/70 pl-6 py-2">
        {story.hook}
      </div>

      {/* 続きは詳細ページへ */}
      <a
        href={`/story/${story.id}`}
        className="block w-full py-5 border border-horror-crimson/60 rounded-md text-horror-text hover:bg-horror-crimson/10 hover:border-horror-crimson transition-all duration-400 font-semibold text-center tracking-wider"
        style={{boxShadow: '0 0 20px rgba(165, 42, 42, 0.2)'}}
      >
        続きを読む →
      </a>

      {/* アクションボタン */}
      {showActions && (
        <div className="flex items-center gap-5 pt-6 border-t border-horror-blood/30">
          <button
            onClick={handleLike}
            disabled={hasLiked || isLiking}
            className={`flex items-center gap-2 px-5 py-3 rounded-md transition-all duration-400 tracking-wide ${
              hasLiked
                ? "bg-horror-red/20 text-horror-crimson border border-horror-crimson/60"
                : "bg-transparent border border-horror-blood/50 hover:bg-horror-red/10 text-horror-text-secondary hover:text-horror-text hover:border-horror-crimson/60"
            }`}
            style={{boxShadow: hasLiked ? '0 0 20px rgba(165, 42, 42, 0.3)' : 'none'}}
          >
            <span className="text-xl">{hasLiked ? "❤️" : "🤍"}</span>
            <span>{likes}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-3 rounded-md bg-transparent border border-horror-blood/50 hover:bg-horror-red/10 text-horror-text-secondary hover:text-horror-text hover:border-horror-crimson/60 transition-all duration-400 tracking-wide"
          >
            <span className="text-xl">𝕏</span>
            <span>シェア</span>
          </button>
        </div>
      )}
    </div>
  );
}
