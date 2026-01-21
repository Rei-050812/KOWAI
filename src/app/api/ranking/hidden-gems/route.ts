import { NextResponse } from "next/server";
import { getHiddenGems } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stories = await getHiddenGems(20);

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching hidden gems:", error);
    return NextResponse.json(
      { error: "隠れた名作の取得に失敗しました" },
      { status: 500 }
    );
  }
}
