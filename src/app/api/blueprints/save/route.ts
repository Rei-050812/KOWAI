import { NextRequest, NextResponse } from "next/server";
import { SaveBlueprintRequest, KaidanBlueprintData, QualityScoreBreakdown } from "@/types";
import { saveBlueprint } from "@/lib/supabase";

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
 * 詳細バリデーション（内容の品質チェック）
 */
function validateBlueprintContent(blueprint: KaidanBlueprintData): string[] {
  const errors: string[] = [];

  // anomalyが空または短すぎる
  if (!blueprint.anomaly || blueprint.anomaly.trim().length < 5) {
    errors.push("anomaly（怪異の核）が未設定または短すぎます（5文字以上必要）");
  }

  // normal_ruleが空または短すぎる
  if (!blueprint.normal_rule || blueprint.normal_rule.trim().length < 5) {
    errors.push("normal_rule（通常時の前提）が未設定または短すぎます（5文字以上必要）");
  }

  // irreversible_pointが空または短すぎる
  if (!blueprint.irreversible_point || blueprint.irreversible_point.trim().length < 5) {
    errors.push("irreversible_point（不可逆の確定点）が未設定または短すぎます（5文字以上必要）");
  }

  // single_anomaly_onlyがfalse（これは必須）
  if (!blueprint.constraints.single_anomaly_only) {
    errors.push("constraints.single_anomaly_onlyはtrueである必要があります");
  }

  return errors;
}

/**
 * 内訳からスコアを算出
 */
function calculateScoreFromBreakdown(breakdown: QualityScoreBreakdown): number {
  // 各項目の上限を適用
  const single_anomaly = Math.min(30, Math.max(0, breakdown.single_anomaly || 0));
  const normal_rule_clarity = Math.min(20, Math.max(0, breakdown.normal_rule_clarity || 0));
  const irreversible_point_clarity = Math.min(25, Math.max(0, breakdown.irreversible_point_clarity || 0));
  const no_explanations = Math.min(15, Math.max(0, breakdown.no_explanations || 0));
  const reusability = Math.min(10, Math.max(0, breakdown.reusability || 0));

  return single_anomaly + normal_rule_clarity + irreversible_point_clarity + no_explanations + reusability;
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
    const { title, tags, quality_score, score_breakdown, blueprint } = body;

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

    // 詳細バリデーション
    const contentErrors = validateBlueprintContent(blueprint);
    if (contentErrors.length > 0) {
      return NextResponse.json(
        { error: contentErrors.join("; ") },
        { status: 400 }
      );
    }

    // スコア算出
    let finalScore: number;
    if (score_breakdown) {
      // 内訳から算出
      finalScore = calculateScoreFromBreakdown(score_breakdown);
    } else if (typeof quality_score === "number") {
      // 直接指定
      finalScore = quality_score;
    } else {
      // デフォルト
      finalScore = 50;
    }

    // 範囲チェック（0-100）
    finalScore = Math.min(100, Math.max(0, finalScore));

    // タグの正規化
    let normalizedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    // タグが空の場合は自動生成
    if (normalizedTags.length === 0) {
      normalizedTags = generateAutoTags(blueprint);
    }

    // 保存
    const result = await saveBlueprint(
      title.trim(),
      normalizedTags,
      blueprint,
      finalScore
    );

    return NextResponse.json({
      success: true,
      id: result.id,
      quality_score: finalScore,
      tags: normalizedTags,
      message: "Blueprintを保存しました",
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
