import { NextResponse } from "next/server";
import { getMonthlyRankingStories } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stories = await getMonthlyRankingStories(30);

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching monthly ranking:", error);
    return NextResponse.json(
      { error: "月間ランキングの取得に失敗しました" },
      { status: 500 }
    );
  }
}
