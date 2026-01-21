import { NextRequest, NextResponse } from "next/server";
import { getStoriesByStyle } from "@/lib/supabase";
import { StoryStyle } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ style: string }> }
) {
  try {
    const { style } = await params;

    const validStyles: StoryStyle[] = ["short", "medium", "long"];
    if (!validStyles.includes(style as StoryStyle)) {
      return NextResponse.json(
        { error: "無効なスタイルです" },
        { status: 400 }
      );
    }

    const stories = await getStoriesByStyle(style as StoryStyle, 20);

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching stories by style:", error);
    return NextResponse.json(
      { error: "スタイル別怪談の取得に失敗しました" },
      { status: 500 }
    );
  }
}
