import { Metadata } from "next";
import { getWeeklyRankingStories } from "@/lib/supabase";
import { StoryWithScore } from "@/types";
import RankingNavigation from "@/components/RankingNavigation";
import RankingCard from "@/components/RankingCard";

export const metadata: Metadata = {
  title: "週間ランキング",
  description: "今週最も読まれた怪談TOP20。毎週更新される旬の怖い話をチェック。",
};

export const dynamic = "force-dynamic";

export default async function WeeklyRankingPage() {
  let stories: StoryWithScore[] = [];

  try {
    stories = await getWeeklyRankingStories(20);
  } catch (error) {
    console.error("Failed to fetch weekly ranking:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <RankingNavigation current="weekly" />

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
            <span className="text-horror-crimson">週間</span>ランキング
          </h1>
          <p className="text-gray-400">過去7日間で人気を集めた怪談</p>
        </div>

        {stories.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-6xl mb-4">📅</p>
            <p>今週の怪談はまだありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story, index) => (
              <RankingCard
                key={story.id}
                story={story}
                rank={index + 1}
                showScore
              />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <a
            href="/ranking"
            className="text-horror-crimson hover:text-white transition-colors"
          >
            ← ランキングトップに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
