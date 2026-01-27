import { Metadata } from "next";
import { getHallOfFameStories } from "@/lib/supabase";
import { StoryWithScore } from "@/types";
import RankingNavigation from "@/components/RankingNavigation";
import RankingCard from "@/components/RankingCard";
import HallOfFameBadge from "@/components/HallOfFameBadge";

export const metadata: Metadata = {
  title: "殿堂入り",
  description: "100回以上読まれ、高評価を獲得した殿堂入り怪談。読者に選ばれた本当に怖い話だけを厳選。",
};

export const dynamic = "force-dynamic";

export default async function HallOfFamePage() {
  let stories: StoryWithScore[] = [];

  try {
    stories = await getHallOfFameStories(50);
  } catch (error) {
    console.error("Failed to fetch hall of fame stories:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <RankingNavigation current="hall_of_fame" />

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
            <HallOfFameBadge size="lg" />
            <span className="text-horror-crimson ml-2">殿堂入り</span>
          </h1>
          <p className="text-gray-400">
            7日以上経過し、100回以上閲覧された伝説の怪談たち
          </p>
        </div>

        {stories.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-6xl mb-4">👑</p>
            <p>まだ殿堂入りした怪談はありません</p>
            <p className="text-sm mt-2">条件: 7日経過 & 100閲覧以上</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story, index) => (
              <RankingCard
                key={story.id}
                story={story}
                rank={index + 1}
                showScore
                badge={<HallOfFameBadge />}
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
