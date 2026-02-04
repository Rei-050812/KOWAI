"use client";

import { useState, useCallback } from "react";
import { Story, STYLE_LABELS } from "@/types";

interface StoriesListClientProps {
  initialStories: Story[];
}

function StoryCard({ story }: { story: Story }) {
  return (
    <a
      href={`/story/${story.id}`}
      className="block horror-card hover:border-horror-crimson/50 transition-all duration-300"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-horror-crimson mb-2">{story.title}</h3>

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
          <span>{new Date(story.created_at).toLocaleDateString("ja-JP")}</span>
          <span>❤️ {story.likes}</span>
          <span>👁 {story.views}</span>
        </div>
      </div>
    </a>
  );
}

export default function StoriesListClient({ initialStories }: StoriesListClientProps) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialStories.length >= 20);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/stories?limit=20&offset=${stories.length}`);
      const data = await res.json();

      if (data.stories && data.stories.length > 0) {
        setStories((prev) => [...prev, ...data.stories]);
        if (data.stories.length < 20) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more stories:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, stories.length]);

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">
        {stories.length}件表示中
      </div>

      <div className="space-y-4">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-3 bg-horror-crimson hover:bg-horror-crimson/80 disabled:bg-gray-700 text-white font-bold rounded-lg transition-colors"
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}

      {!hasMore && stories.length > 0 && (
        <div className="mt-8 text-center text-gray-500 text-sm">
          すべての怪談を表示しました
        </div>
      )}
    </div>
  );
}
