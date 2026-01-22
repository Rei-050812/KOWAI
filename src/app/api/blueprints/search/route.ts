import { NextRequest, NextResponse } from "next/server";
import { SearchBlueprintRequest } from "@/types";
import { matchBlueprintsByKeyword } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchBlueprintRequest;
    const { query, match_count = 3, min_quality = 0 } = body;

    // バリデーション
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "検索クエリは必須です" },
        { status: 400 }
      );
    }

    // タグベースでBlueprint検索
    const results = await matchBlueprintsByKeyword(
      query.trim(),
      Math.min(10, Math.max(1, match_count)),
      Math.min(100, Math.max(0, min_quality))
    );

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error searching blueprints:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Blueprintの検索に失敗しました" },
      { status: 500 }
    );
  }
}
