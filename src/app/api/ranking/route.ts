import { NextResponse } from "next/server";
import { getLatestStories, getPopularStories, getPopularWords } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [latestStories, popularStories, popularWords] = await Promise.all([
      getLatestStories(5),
      getPopularStories(5),
      getPopularWords(10),
    ]);

    return NextResponse.json({
      latest: latestStories,
      popular: popularStories,
      words: popularWords,
    });
  } catch (error) {
    console.error("Error fetching ranking:", error);
    return NextResponse.json(
      { error: "ランキングの取得に失敗しました" },
      { status: 500 }
    );
  }
}
