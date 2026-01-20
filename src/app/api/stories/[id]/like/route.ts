import { NextRequest, NextResponse } from "next/server";
import { incrementLikes } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "IDが必要です" },
        { status: 400 }
      );
    }

    const newLikes = await incrementLikes(id);

    return NextResponse.json({ likes: newLikes });
  } catch (error) {
    console.error("Error liking story:", error);
    return NextResponse.json(
      { error: "いいねに失敗しました" },
      { status: 500 }
    );
  }
}
