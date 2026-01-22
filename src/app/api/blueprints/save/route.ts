import { NextRequest, NextResponse } from "next/server";
import { SaveBlueprintRequest, KaidanBlueprintData } from "@/types";
import { saveBlueprint } from "@/lib/supabase";
import { scoreBlueprint } from "@/lib/blueprint-scoring";

/**
 * Blueprintの必須フィールドを検証
 */
function validateBlueprint(blueprint: unknown): blueprint is KaidanBlueprintData {
  if (!blueprint || typeof blueprint !== "object") return false;

  const b = blueprint as Record<string, unknown>;

  // 必須フィールドの存在確認
  const requiredFields = [
    "anomaly",
    "normal_rule",
    "irreversible_point",
    "reader_understands",
    "reader_cannot_understand",
    "constraints",
    "ending_style",
  ];

  for (const field of requiredFields) {
    if (!(field in b)) return false;
  }

  // constraintsの検証
  const constraints = b.constraints as Record<string, unknown>;
  if (!constraints || typeof constraints !== "object") return false;

  const requiredConstraints = [
    "no_explanations",
    "single_anomaly_only",
    "no_emotion_words",
    "no_clean_resolution",
    "daily_details_min",
  ];

  for (const field of requiredConstraints) {
    if (!(field in constraints)) return false;
  }

  return true;
}

/**
 * Blueprintからタグを自動生成（補助）
 */
function generateAutoTags(blueprint: KaidanBlueprintData): string[] {
  const tags: string[] = [];

  // anomalyからキーワード抽出
  if (blueprint.anomaly) {
    const words = blueprint.anomaly.slice(0, 30).split(/[、。\s]+/).filter(w => w.length >= 2);
    tags.push(...words.slice(0, 2));
  }

  // allowed_subgenresから
  if (blueprint.allowed_subgenres && Array.isArray(blueprint.allowed_subgenres)) {
    tags.push(...blueprint.allowed_subgenres);
  }

  return [...new Set(tags)];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveBlueprintRequest;
    // クライアントからのquality_scoreは無視（サーバーで再採点）
    const { title, tags, blueprint } = body;

    // タイトルバリデーション
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "タイトルは必須です" },
        { status: 400 }
      );
    }

    // Blueprint構造バリデーション
    if (!validateBlueprint(blueprint)) {
      return NextResponse.json(
        { error: "Blueprintの形式が不正です。必須フィールドを確認してください" },
        { status: 400 }
      );
    }

    // ===== サーバー側で再採点（これが正） =====
    const scoringResult = scoreBlueprint(blueprint);
    const finalScore = scoringResult.score;

    // 重大なエラーがある場合は警告（保存は許可）
    const errors = scoringResult.deductions.filter(d => d.severity === "error");
    if (errors.length > 0) {
      // エラーがあっても保存は可能（低スコアとして記録される）
    }

    // タグの正規化
    let normalizedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    // タグが空の場合は自動生成
    if (normalizedTags.length === 0) {
      normalizedTags = generateAutoTags(blueprint);
    }

    // 保存（サーバー採点したスコアを使用）
    const result = await saveBlueprint(
      title.trim(),
      normalizedTags,
      blueprint,
      finalScore
    );

    return NextResponse.json({
      success: true,
      id: result.id,
      quality_score: finalScore, // サーバーで算出した確定スコア
      tags: normalizedTags,
      deductions: scoringResult.deductions, // 減点理由も返す
      message: `Blueprintを保存しました（スコア: ${finalScore}点）`,
    });
  } catch (error) {
    console.error("Error saving blueprint:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Blueprintの保存に失敗しました" },
      { status: 500 }
    );
  }
}
