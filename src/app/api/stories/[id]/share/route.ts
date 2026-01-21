import { NextRequest, NextResponse } from "next/server";
import { incrementShareCount } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newShareCount = await incrementShareCount(id);

    return NextResponse.json({ share_count: newShareCount });
  } catch (error) {
    console.error("Error incrementing share count:", error);
    return NextResponse.json(
      { error: "シェア数の更新に失敗しました" },
      { status: 500 }
    );
  }
}
