"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Story } from "@/types";
import { useTypingEffect } from "@/hooks/useTypingEffect";
import ShareButtons from "@/components/ShareButtons";

interface StoryDetailClientProps {
  story: Story;
  shareCount?: number;
}

// タイピング速度（ミリ秒/文字）
const TYPING_SPEED = 40;

// フェーズ区切り位置を検出（改行2つで区切る）
function detectPhaseBreaks(text: string): { phaseB: number; phaseC: number } {
  const parts = text.split(/\n\n+/);
  if (parts.length < 3) {
    return { phaseB: Math.floor(text.length * 0.33), phaseC: Math.floor(text.length * 0.66) };
  }

  // Phase A終了位置
  const phaseB = parts[0].length + 2;
  // Phase B終了位置
  const phaseC = parts[0].length + 2 + parts[1].length + 2;

  return { phaseB, phaseC };
}

export default function StoryDetailClient({ story, shareCount = 0 }: StoryDetailClientProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(story.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // hook + story を結合してタイピング
  const fullText = `${story.hook}\n\n${story.story}`;
  const { displayedText, isComplete, isTyping, skip, progress } = useTypingEffect(fullText, {
    speed: TYPING_SPEED,
    startDelay: 800,
  });

  // フェーズ区切り位置（メモ化）- 将来の段階スキップ用
  const _phaseBreaks = useMemo(() => detectPhaseBreaks(fullText), [fullText]);
  void _phaseBreaks; // unused for now

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

  const handleNavigateHome = () => {
    router.push("/");
  };

  return (
    <div className="story-detail min-h-screen">
      {/* 怪談本文 */}
      <div className="max-w-3xl mx-auto px-8 py-16 md:py-24">
        {/* タイトル */}
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-horror-crimson tracking-wide leading-tight" style={{textShadow: '0 0 30px rgba(165, 42, 42, 0.4)'}}>
          {story.title}
        </h1>
        <div className="w-20 h-px bg-horror-crimson/60 mx-auto mb-16"></div>

        {/* 本文（タイピング演出） */}
        <div className="story-detail-text whitespace-pre-wrap mb-20">
          {displayedText}
          {isTyping && <span className="typing-cursor" />}
        </div>

        {/* スキップボタン - 固定位置（タイピング中のみ表示） */}
        {isTyping && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {/* 進捗バー */}
            <div className="w-24 h-1 bg-horror-blood/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-horror-crimson/70 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* スキップボタン */}
            <button
              onClick={skip}
              className="px-5 py-3 bg-horror-bg/90 backdrop-blur-sm border border-horror-blood/50 rounded-md text-horror-text-secondary hover:text-horror-text hover:border-horror-crimson text-sm transition-all duration-300 tracking-wider shadow-lg"
              style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)' }}
            >
              スキップ →
            </button>
          </div>
        )}

        {/* タイピング完了後に表示 */}
        {isComplete && (
          <div className="animate-fade-in-up">
            {/* 区切り線 */}
            <div className="w-24 h-px bg-horror-crimson/60 mx-auto mb-16" />

            {/* メタ情報 */}
            <div className="text-center mb-16 text-horror-text-secondary text-sm">
              <span className="inline-block px-5 py-2 border border-horror-crimson/40 rounded-sm tracking-wider">
                {story.word}
              </span>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col items-center gap-8">
              {/* いいねボタン */}
              <button
                onClick={handleLike}
                disabled={hasLiked || isLiking}
                className={`flex items-center gap-3 px-8 py-4 rounded-md transition-all duration-400 tracking-wide ${
                  hasLiked
                    ? "bg-horror-red/20 text-horror-crimson border border-horror-crimson/60"
                    : "bg-transparent border border-horror-blood/60 text-horror-text-secondary hover:border-horror-crimson hover:text-horror-text hover:bg-horror-crimson/5"
                }`}
                style={{boxShadow: hasLiked ? '0 0 25px rgba(165, 42, 42, 0.3)' : '0 0 15px rgba(74, 0, 0, 0.2)'}}
              >
                <span>{hasLiked ? "❤️" : "🤍"}</span>
                <span>{likes}</span>
              </button>

              {/* シェアボタン群 */}
              <ShareButtons
                storyId={story.id}
                word={story.word}
                title={story.title}
                hook={story.hook}
                initialShareCount={shareCount}
              />

              {/* 別の怖い話を見るボタン */}
              <button
                onClick={handleNavigateHome}
                className="mt-6 px-10 py-5 bg-horror-red hover:bg-horror-crimson text-horror-text font-semibold rounded-md transition-all duration-400 tracking-wider"
                style={{boxShadow: '0 0 30px rgba(139, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.5)'}}
              >
                別の怖い話を見る
              </button>
            </div>

            {/* 閲覧数 */}
            <div className="text-center mt-16 text-horror-text-secondary text-xs tracking-wider opacity-70">
              👁 {story.views + 1} views
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
