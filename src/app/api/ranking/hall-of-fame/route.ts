import { NextResponse } from "next/server";
import { getHallOfFameStories } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stories = await getHallOfFameStories(50);

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching hall of fame:", error);
    return NextResponse.json(
      { error: "殿堂入りの取得に失敗しました" },
      { status: 500 }
    );
  }
}
