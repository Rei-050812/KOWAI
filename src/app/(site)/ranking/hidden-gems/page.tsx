import { Metadata } from "next";
import { getHiddenGems } from "@/lib/supabase";
import { StoryWithScore } from "@/types";
import RankingNavigation from "@/components/RankingNavigation";
import RankingCard from "@/components/RankingCard";

export const metadata: Metadata = {
  title: "隠れた名作",
  description: "まだ多くの人に読まれていないけど、いいね率が高い隠れた名作怪談。掘り出し物の怖い話を発見しよう。",
};

export const dynamic = "force-dynamic";

export default async function HiddenGemsPage() {
  let stories: StoryWithScore[] = [];

  try {
    stories = await getHiddenGems(20);
  } catch (error) {
    console.error("Failed to fetch hidden gems:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <RankingNavigation current="hidden_gems" />

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
            <span className="text-2xl mr-2">💎</span>
            <span className="text-horror-crimson">隠れた名作</span>
          </h1>
          <p className="text-gray-400">
            まだ多くの人に発見されていない、高評価の隠れた名作
          </p>
          <p className="text-gray-500 text-sm mt-1">
            閲覧10-100回 / いいね3以上 / いいね率10%以上
          </p>
        </div>

        {stories.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-6xl mb-4">💎</p>
            <p>条件に合う隠れた名作はまだありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story, index) => (
              <RankingCard
                key={story.id}
                story={story}
                rank={index + 1}
                showLikeRate
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
