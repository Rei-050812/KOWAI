"use client";

import { useEffect, useState } from "react";
import { Story, STYLE_LABELS } from "@/types";

export default function LatestStoriesPreview() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await fetch("/api/stories?limit=6");
        if (response.ok) {
          const data = await response.json();
          setStories(data.stories || []);
        }
      } catch (error) {
        console.error("Failed to fetch latest stories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatest();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="horror-card animate-pulse">
            <div className="h-5 bg-horror-dark rounded w-2/3 mb-3" />
            <div className="h-4 bg-horror-dark rounded w-1/3 mb-2" />
            <div className="h-12 bg-horror-dark rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <p className="text-horror-text-secondary text-center">
        まだ怪談がありません
      </p>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {stories.slice(0, 5).map((story) => (
        <a
          key={story.id}
          href={`/story/${story.id}`}
          className="block horror-card hover:border-horror-crimson/50 transition-all duration-300"
        >
          <h4 className="font-bold text-horror-crimson mb-2">{story.title}</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-horror-red/30 text-horror-crimson px-2 py-0.5 rounded text-xs font-bold">
              {story.word}
            </span>
            <span className="text-gray-500 text-xs">
              {STYLE_LABELS[story.style]}
            </span>
          </div>
          <p className="text-gray-400 text-sm line-clamp-2">{story.hook}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{new Date(story.created_at).toLocaleDateString("ja-JP")}</span>
            <span>❤️ {story.likes}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
