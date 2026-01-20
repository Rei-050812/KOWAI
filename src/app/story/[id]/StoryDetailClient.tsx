"use client";

import { useState } from "react";
import { Story } from "@/types";

interface StoryDetailClientProps {
  story: Story;
}

export default function StoryDetailClient({ story }: StoryDetailClientProps) {
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
    const text = `「${story.word}」から生まれた怪談を読んでみて...\n\n#KOWAI #AI怪談`;
    const url = `${window.location.origin}/story/${story.id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  const handleCopy = async () => {
    const url = `${window.location.origin}/story/${story.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("URLをコピーしました");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* いいねボタン */}
      <button
        onClick={handleLike}
        disabled={hasLiked || isLiking}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
          hasLiked
            ? "bg-horror-red/30 text-horror-crimson"
            : "bg-horror-dark hover:bg-horror-red/20 text-gray-400 hover:text-white border border-horror-red/30 hover:border-horror-red"
        }`}
      >
        <span className="text-xl">{hasLiked ? "❤️" : "🤍"}</span>
        <span className="font-bold">{likes}</span>
      </button>

      {/* シェアボタン */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-horror-dark hover:bg-horror-red/20 text-gray-400 hover:text-white border border-horror-red/30 hover:border-horror-red transition-all duration-300"
      >
        <span className="text-xl">𝕏</span>
        <span>シェア</span>
      </button>

      {/* URLコピーボタン */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-horror-dark hover:bg-horror-red/20 text-gray-400 hover:text-white border border-horror-red/30 hover:border-horror-red transition-all duration-300"
      >
        <span className="text-xl">🔗</span>
        <span>URLコピー</span>
      </button>

      {/* 統計情報 */}
      <div className="ml-auto text-gray-500 text-sm">
        <span>👁 {story.views + 1} views</span>
      </div>
    </div>
  );
}
