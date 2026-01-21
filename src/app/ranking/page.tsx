import { Metadata } from "next";
import { getLatestStories, getPopularStories, getPopularWords, getTrendingWords } from "@/lib/supabase";
import RankingTabs from "./RankingTabs";
import { Story, TrendWord, WordCount } from "@/types";

export const metadata: Metadata = {
  title: "ランキング",
  description: "いいね数や閲覧数で選ばれた人気の怪談ランキング。最新作から殿堂入りまで、今読むべき怖い話が見つかる。",
};

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  let latestStories: Story[] = [];
  let popularStories: Story[] = [];
  let popularWords: WordCount[] = [];
  let trendWords: TrendWord[] = [];

  try {
    [latestStories, popularStories, popularWords, trendWords] = await Promise.all([
      getLatestStories(20),
      getPopularStories(20),
      getPopularWords(20),
      getTrendingWords(10),
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

        {/* カテゴリナビゲーション */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <a
            href="/ranking/hall-of-fame"
            className="flex items-center gap-1 px-4 py-2 rounded-lg font-bold bg-horror-dark/50 text-gray-400 hover:bg-horror-dark hover:text-white border border-horror-red/30 transition-all duration-300"
          >
            👑 殿堂入り
          </a>
          <a
            href="/ranking/weekly"
            className="flex items-center gap-1 px-4 py-2 rounded-lg font-bold bg-horror-dark/50 text-gray-400 hover:bg-horror-dark hover:text-white border border-horror-red/30 transition-all duration-300"
          >
            📅 週間
          </a>
          <a
            href="/ranking/monthly"
            className="flex items-center gap-1 px-4 py-2 rounded-lg font-bold bg-horror-dark/50 text-gray-400 hover:bg-horror-dark hover:text-white border border-horror-red/30 transition-all duration-300"
          >
            📆 月間
          </a>
          <a
            href="/ranking/hidden-gems"
            className="flex items-center gap-1 px-4 py-2 rounded-lg font-bold bg-horror-dark/50 text-gray-400 hover:bg-horror-dark hover:text-white border border-horror-red/30 transition-all duration-300"
          >
            💎 隠れた名作
          </a>
        </div>

        {/* スタイル別リンク */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="text-gray-500 mr-2">スタイル別:</span>
          <a
            href="/style/short"
            className="px-3 py-1 rounded text-sm bg-horror-dark/30 text-gray-400 hover:text-white border border-horror-red/20 transition-colors"
          >
            短編
          </a>
          <a
            href="/style/medium"
            className="px-3 py-1 rounded text-sm bg-horror-dark/30 text-gray-400 hover:text-white border border-horror-red/20 transition-colors"
          >
            中編
          </a>
          <a
            href="/style/long"
            className="px-3 py-1 rounded text-sm bg-horror-dark/30 text-gray-400 hover:text-white border border-horror-red/20 transition-colors"
          >
            長編
          </a>
        </div>

        {/* タブ切り替え */}
        <RankingTabs
          latestStories={latestStories}
          popularStories={popularStories}
          popularWords={popularWords}
          trendWords={trendWords}
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
