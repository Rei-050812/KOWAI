import { Metadata } from "next";
import { getLatestStories } from "@/lib/supabase";
import StoriesListClient from "./StoriesListClient";

export const metadata: Metadata = {
  title: "怪談一覧",
  description: "AIが生成した怪談・ホラー短編小説の全一覧。新着順で全ての怖い話をお楽しみいただけます。",
};

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const initialStories = await getLatestStories(20);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 text-center">
          <span className="text-horror-crimson">怪談</span>一覧
        </h1>
        <p className="text-gray-400 text-center mb-8">
          新着順にすべての怪談を表示
        </p>

        <StoriesListClient initialStories={initialStories} />

        <div className="mt-12 text-center">
          <a href="/" className="text-horror-crimson hover:text-white transition-colors">
            ← トップページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
