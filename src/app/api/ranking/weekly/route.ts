import { NextResponse } from "next/server";
import { getWeeklyRankingStories } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stories = await getWeeklyRankingStories(20);

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching weekly ranking:", error);
    return NextResponse.json(
      { error: "週間ランキングの取得に失敗しました" },
      { status: 500 }
    );
  }
}
