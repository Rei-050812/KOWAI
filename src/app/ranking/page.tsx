import { Metadata } from "next";
import { getLatestStories, getPopularStories, getPopularWords } from "@/lib/supabase";
import RankingTabs from "./RankingTabs";
import { Story, WordCount } from "@/types";

export const metadata: Metadata = {
  title: "ランキング | KOWAI",
  description: "人気の怪談、最新の怪談、よく使われる単語のランキング",
};

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  let latestStories: Story[] = [];
  let popularStories: Story[] = [];
  let popularWords: WordCount[] = [];

  try {
    [latestStories, popularStories, popularWords] = await Promise.all([
      getLatestStories(20),
      getPopularStories(20),
      getPopularWords(20),
    ]);
  } catch (error) {
    console.error("Failed to fetch ranking data:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* ページタイトル */}
        <h1 className="text-3xl md:text-4xl font-black text-white mb-8 text-center">
          <span className="text-horror-crimson">怪談</span>ランキング
        </h1>

        {/* タブ切り替え */}
        <RankingTabs
          latestStories={latestStories}
          popularStories={popularStories}
          popularWords={popularWords}
        />

        {/* 戻るリンク */}
        <div className="mt-12 text-center">
          <a href="/" className="text-horror-crimson hover:text-white transition-colors">
            ← トップページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
