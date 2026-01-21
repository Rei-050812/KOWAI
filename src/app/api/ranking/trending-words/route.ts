import { NextResponse } from "next/server";
import { getTrendingWords } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const words = await getTrendingWords(10);

    return NextResponse.json({ words });
  } catch (error) {
    console.error("Error fetching trending words:", error);
    return NextResponse.json(
      { error: "トレンド単語の取得に失敗しました" },
      { status: 500 }
    );
  }
}
