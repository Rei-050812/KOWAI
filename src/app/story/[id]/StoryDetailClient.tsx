"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Story } from "@/types";
import { useTypingEffect } from "@/hooks/useTypingEffect";

interface StoryDetailClientProps {
  story: Story;
}

// タイピング速度（ミリ秒/文字）
const TYPING_SPEED = 40;

export default function StoryDetailClient({ story }: StoryDetailClientProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(story.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // hook + story を結合してタイピング
  const fullText = `${story.hook}\n\n${story.story}`;
  const { displayedText, isComplete, isTyping, skip } = useTypingEffect(fullText, {
    speed: TYPING_SPEED,
    startDelay: 800,
  });

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
    const text = `「${story.word}」から生まれた怪談「${story.title}」\n\n${story.hook}\n\n#KOWAI #AI怪談`;
    const url = `${window.location.origin}/story/${story.id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  const handleNavigateHome = () => {
    router.push("/");
  };

  return (
    <div className="story-detail min-h-screen">
      {/* 怪談本文 */}
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        {/* タイトル */}
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-12 text-horror-crimson">
          {story.title}
        </h1>

        {/* 本文（タイピング演出） */}
        <div className="story-detail-text whitespace-pre-wrap mb-16">
          {displayedText}
          {isTyping && <span className="typing-cursor" />}
        </div>

        {/* スキップボタン（タイピング中のみ表示） */}
        {isTyping && (
          <div className="text-center mb-8">
            <button
              onClick={skip}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              スキップ →
            </button>
          </div>
        )}

        {/* タイピング完了後に表示 */}
        {isComplete && (
          <div className="animate-fade-in-up">
            {/* 区切り線 */}
            <div className="w-16 h-px bg-horror-crimson/50 mx-auto mb-12" />

            {/* メタ情報 */}
            <div className="text-center mb-12 text-gray-500 text-sm">
              <span className="inline-block px-3 py-1 border border-horror-crimson/30 rounded">
                {story.word}
              </span>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col items-center gap-6">
              {/* いいね・シェアボタン */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  disabled={hasLiked || isLiking}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
                    hasLiked
                      ? "bg-horror-red/30 text-horror-crimson"
                      : "bg-transparent border border-gray-700 text-gray-400 hover:border-horror-crimson hover:text-white"
                  }`}
                >
                  <span>{hasLiked ? "❤️" : "🤍"}</span>
                  <span>{likes}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-transparent border border-gray-700 text-gray-400 hover:border-horror-crimson hover:text-white transition-all duration-300"
                >
                  <span>𝕏</span>
                  <span>シェア</span>
                </button>
              </div>

              {/* 別の怖い話を見るボタン */}
              <button
                onClick={handleNavigateHome}
                className="mt-8 px-8 py-4 bg-horror-crimson hover:bg-horror-red text-white font-bold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-horror-crimson/30"
              >
                別の怖い話を見る
              </button>
            </div>

            {/* 閲覧数 */}
            <div className="text-center mt-12 text-gray-600 text-xs">
              👁 {story.views + 1} views
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
