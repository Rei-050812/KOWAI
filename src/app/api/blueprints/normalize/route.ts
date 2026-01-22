import { NextResponse } from "next/server";
import { KaidanBlueprintData } from "@/types";
import { getAllBlueprintsFull, updateBlueprint } from "@/lib/supabase";
import { scoreBlueprint } from "@/lib/blueprint-scoring";

// =============================================
// detail_bank 正規化ルール
// =============================================

// 削除対象パターン（食べ物/飲み物、天候評価、味、雰囲気、情緒語、行動誘発語）
const REMOVE_PATTERNS = [
  // 食べ物・飲み物
  /おにぎり|弁当|ラーメン|カレー|パン|米|ご飯|飯|酒|ビール|焼酎|日本酒|コーヒー|お茶|茶|水|ジュース|料理|食事|朝食|昼食|夕食|夜食|おやつ|菓子|スナック/,
  // 天候・気象評価
  /春の|夏の|秋の|冬の|陽気|蒸し暑|暖か|涼し|寒|暑|心地よ|快適|爽やか|うだる|凍える/,
  // 味・嗅覚評価
  /味|美味|うま|甘|辛|苦|酸|塩|香|匂い|臭|芳|におい/,
  // 雰囲気・情緒語
  /雰囲気|ムード|静か|穏やか|和やか|賑やか|寂し|悲し|嬉し|楽し|怖|恐|不気味|薄気味|気味悪|気持ち|感じ|印象/,
  // 行動誘発・リラックス
  /酒盛り|宴|パーティ|祭|祝|くつろ|リラックス|休憩|一息|ほっと|安心|安らぎ|癒し/,
  // 音楽・娯楽
  /歌|唄|音楽|カラオケ|島唄|民謡|テレビ|ラジオ|ゲーム/,
  // 身体感覚（恐怖反応）
  /冷や汗|汗|鳥肌|震え|動悸|息苦し|吐き気|めまい|ふらつ/,
  // 泣き・叫び
  /泣き声|泣|叫び|悲鳴|うめき|すすり/,
  // 抽象的すぎる
  /時間帯|生活音|日常|非日常|異常|普通|変|おかし/,
];

// 残してよい例（無機質な短い名詞）
const KEEP_EXAMPLES = [
  "軽トラック", "トラック", "車", "バイク", "自転車",
  "山道", "道", "道路", "階段", "廊下", "通路",
  "鏡台", "鏡", "引き出し", "タンス", "机", "椅子", "ベッド", "布団",
  "トンネル", "橋", "駅", "バス停", "踏切",
  "双眼鏡", "カメラ", "時計", "電話", "携帯",
  "窓", "ドア", "扉", "壁", "床", "天井",
  "電柱", "街灯", "信号", "看板",
  "木", "森", "林", "川", "池", "海", "山",
  "建物", "家", "アパート", "マンション", "ビル", "小屋", "倉庫",
  "神社", "寺", "墓", "墓地", "病院", "学校",
];

/**
 * detail_bankアイテムが削除対象かチェック
 */
function shouldRemoveDetailItem(item: string): boolean {
  const trimmed = item.trim();

  // 空文字は削除
  if (!trimmed) return true;

  // 長すぎる（10文字超）は削除（文章の可能性）
  if (trimmed.length > 10) return true;

  // 削除パターンにマッチ
  for (const pattern of REMOVE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}

/**
 * detail_bankを正規化
 */
function normalizeDetailBank(detailBank: string[]): {
  normalized: string[];
  removed: string[];
} {
  if (!Array.isArray(detailBank)) {
    return { normalized: [], removed: [] };
  }

  const removed: string[] = [];
  const normalized = detailBank.filter(item => {
    if (shouldRemoveDetailItem(item)) {
      removed.push(item);
      return false;
    }
    return true;
  });

  return { normalized, removed };
}

/**
 * single_anomaly_only違反をチェック
 */
function checkAnomalyViolation(blueprint: KaidanBlueprintData): string[] {
  const violations: string[] = [];
  const anomaly = blueprint.anomaly || "";
  const irreversiblePoint = blueprint.irreversible_point || "";

  // 複数を示す表現
  const multiplePatterns = [
    /複数の/,
    /いくつもの/,
    /何人もの/,
    /次々と/,
    /それぞれの/,
    /各々の/,
    /多くの/,
    /様々な/,
    /色々な/,
    /2つ以上/,
    /\d+体/,
    /\d+人/,
  ];

  for (const pattern of multiplePatterns) {
    if (pattern.test(anomaly)) {
      violations.push(`anomalyに複数表現: "${anomaly.match(pattern)?.[0]}"`);
    }
    if (pattern.test(irreversiblePoint)) {
      violations.push(`irreversible_pointに複数表現: "${irreversiblePoint.match(pattern)?.[0]}"`);
    }
  }

  return violations;
}

// =============================================
// APIハンドラ
// =============================================

export async function POST() {
  try {
    // 全Blueprint取得
    const blueprints = await getAllBlueprintsFull();

    if (blueprints.length === 0) {
      return NextResponse.json({
        message: "Blueprintが0件です",
        total: 0,
        updated: 0,
        diffs: [],
      });
    }

    const diffs: Array<{
      id: number;
      title: string;
      changes: {
        daily_details_min?: { before: number; after: number };
        detail_bank?: { before: string[]; after: string[]; removed: string[] };
        quality_score?: { before: number; after: number };
      };
      violations: string[];
    }> = [];

    let updatedCount = 0;

    for (const bp of blueprints) {
      const blueprint = bp.blueprint;
      const changes: typeof diffs[0]["changes"] = {};
      let needsUpdate = false;

      // 1. daily_details_min を 0 or 1 に
      const currentMin = blueprint.constraints?.daily_details_min ?? 3;
      if (currentMin > 1) {
        changes.daily_details_min = {
          before: currentMin,
          after: 1,
        };
        blueprint.constraints.daily_details_min = 1;
        needsUpdate = true;
      }

      // 2. detail_bank を正規化
      const { normalized, removed } = normalizeDetailBank(blueprint.detail_bank || []);
      if (removed.length > 0) {
        changes.detail_bank = {
          before: blueprint.detail_bank || [],
          after: normalized,
          removed,
        };
        blueprint.detail_bank = normalized;
        needsUpdate = true;
      }

      // 3. anomaly違反チェック
      const violations = checkAnomalyViolation(blueprint);

      // 4. 再採点
      const scoringResult = scoreBlueprint(blueprint);
      const newScore = scoringResult.score;
      if (newScore !== bp.quality_score) {
        changes.quality_score = {
          before: bp.quality_score,
          after: newScore,
        };
        needsUpdate = true;
      }

      // 変更があれば更新
      if (needsUpdate) {
        await updateBlueprint(bp.id, blueprint, newScore);
        updatedCount++;
      }

      // 差分記録（変更があるか違反があれば）
      if (needsUpdate || violations.length > 0) {
        diffs.push({
          id: bp.id,
          title: bp.title,
          changes,
          violations,
        });
      }
    }

    return NextResponse.json({
      message: `${updatedCount}件のBlueprintを更新しました`,
      total: blueprints.length,
      updated: updatedCount,
      diffs,
    });
  } catch (error) {
    console.error("Error normalizing blueprints:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "正規化に失敗しました" },
      { status: 500 }
    );
  }
}

// GET: 現在の状態を確認（更新なし）
export async function GET() {
  try {
    const blueprints = await getAllBlueprintsFull();

    const report = blueprints.map(bp => {
      const blueprint = bp.blueprint;
      const { removed } = normalizeDetailBank(blueprint.detail_bank || []);
      const violations = checkAnomalyViolation(blueprint);
      const scoringResult = scoreBlueprint(blueprint);

      return {
        id: bp.id,
        title: bp.title,
        current: {
          daily_details_min: blueprint.constraints?.daily_details_min ?? 0,
          detail_bank: blueprint.detail_bank || [],
          quality_score: bp.quality_score,
        },
        issues: {
          daily_details_min_too_high: (blueprint.constraints?.daily_details_min ?? 0) > 1,
          detail_bank_to_remove: removed,
          violations,
          score_mismatch: scoringResult.score !== bp.quality_score,
          calculated_score: scoringResult.score,
        },
      };
    });

    // 問題があるBlueprintのみ抽出
    const problematic = report.filter(r =>
      r.issues.daily_details_min_too_high ||
      r.issues.detail_bank_to_remove.length > 0 ||
      r.issues.violations.length > 0 ||
      r.issues.score_mismatch
    );

    return NextResponse.json({
      total: blueprints.length,
      problematic_count: problematic.length,
      problematic,
      all: report,
    });
  } catch (error) {
    console.error("Error checking blueprints:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "確認に失敗しました" },
      { status: 500 }
    );
  }
}
