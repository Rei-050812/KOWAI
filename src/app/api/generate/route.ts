import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  StoryStyle,
  BlueprintSearchResult,
  Story,
  GenerationConfig,
  BlueprintSelectionResult,
} from "@/types";
import { buildPhaseAPrompt, buildPhaseBPrompt, buildPhaseCPrompt } from "@/lib/prompts";
import {
  createStory,
  incrementWordCount,
  logWordUsage,
  matchBlueprintsByKeyword,
  matchBlueprintsLoose,
  getRandomBlueprint,
  saveGenerationLog,
  getRecentStoryMetas,
} from "@/lib/supabase";
import { getGenericBlueprint, isGenericBlueprint } from "@/lib/generic-blueprint";
import { validatePhaseText, containsKeyword, validatePhaseCClimax, validateKeywordFocus, validatePhaseBOverlap } from "@/lib/validators";
import { deduplicatePhases, DedupeLog } from "@/lib/dedupe";
import { extractStoryMeta, StoryMeta, shouldTriggerDiversityGuard, buildDiversityAvoidanceHint } from "@/lib/diversity";

// =============================================
// 定数
// =============================================

const MODEL = "claude-sonnet-4-20250514";
const MIN_QUALITY_HIT = 70;
const MIN_QUALITY_NEAR = 30;
const TOP_K = 1;
const MAX_RETRY = 2;

const GENERATION_CONFIG: GenerationConfig = {
  topK: TOP_K,
  minQuality: MIN_QUALITY_HIT,
  model: MODEL,
};

// =============================================
// 初期化
// =============================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================
// 型定義
// =============================================

interface PhaseOutput {
  prompt: string;
  text: string;
}

interface ThreePhaseResult {
  phaseA: PhaseOutput;
  phaseB: PhaseOutput;
  phaseC: PhaseOutput;
  finalStory: string;
  title: string;
  hook: string;
}

interface ValidationStats {
  retryCountPhaseA: number;
  retryCountPhaseB: number;
  retryCountPhaseC: number;
  keywordMissDetected: boolean;
  incompleteQuoteDetected: boolean;
  // 重複除去ログ
  dedupeApplied: boolean;
  dedupeTarget: 'A-B' | 'B-C' | null;
  dedupeMethod: 'trim_head' | null;
  // 多様性ガードログ
  diversityGuardTriggered: boolean;
  diversityGuardReason: string | null;
  diversityRetryCount: number;
  // Phase C クライマックスチェック
  endingPeakOk: boolean;
  endingRetryCount: number;
  // キーワード主役化チェック
  keywordFocusOk: boolean;
  keywordFocusCount: number;
  keywordFocusRetryCount: number;
  // Phase B 導入文被りチェック（内部ログ用）
  phaseBOverlapDetected: boolean;
  phaseBOverlapRetryCount: number;
  phaseBOverlapReason: 'similar_to_phaseA' | 'intro_pattern' | null;
}

// =============================================
// Blueprint選択（フォールバック対応）
// =============================================

/**
 * Blueprint選択（フォールバック対応）
 */
async function selectBlueprintWithFallback(
  word: string
): Promise<BlueprintSelectionResult> {
  // A. hit: 厳格な条件でマッチ
  try {
    const hitResults = await matchBlueprintsByKeyword(word, TOP_K, MIN_QUALITY_HIT);
    if (hitResults.length > 0) {
      const blueprint = hitResults[0];
      console.log(
        `[Blueprint] HIT: "${blueprint.title}" (id=${blueprint.id}, quality=${blueprint.quality_score})`
      );
      return { blueprint, fallbackUsed: false, fallbackReason: "hit" };
    }
  } catch (error) {
    console.warn("[Blueprint] HIT search failed:", error);
  }

  // B. near: 緩い条件でマッチ
  try {
    const nearResults = await matchBlueprintsLoose(word, MIN_QUALITY_NEAR);
    if (nearResults.length > 0) {
      const blueprint = nearResults[0];
      console.log(
        `[Blueprint] NEAR: "${blueprint.title}" (id=${blueprint.id}, quality=${blueprint.quality_score})`
      );
      return { blueprint, fallbackUsed: true, fallbackReason: "near" };
    }
  } catch (error) {
    console.warn("[Blueprint] NEAR search failed:", error);
  }

  // B-2. ランダムに高品質Blueprintを取得
  try {
    const randomBlueprint = await getRandomBlueprint(50);
    if (randomBlueprint) {
      console.log(
        `[Blueprint] NEAR(random): "${randomBlueprint.title}" (id=${randomBlueprint.id}, quality=${randomBlueprint.quality_score})`
      );
      return { blueprint: randomBlueprint, fallbackUsed: true, fallbackReason: "near" };
    }
  } catch (error) {
    console.warn("[Blueprint] Random fallback failed:", error);
  }

  // C. generic: 汎用Blueprint
  const genericBlueprint = getGenericBlueprint();
  console.log(`[Blueprint] GENERIC: using fallback blueprint`);
  return { blueprint: genericBlueprint, fallbackUsed: true, fallbackReason: "generic" };
}

// =============================================
// LLM呼び出し
// =============================================

async function callLLM(prompt: string, maxTokens: number = 1000): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from LLM");
  }

  return content.text.trim();
}

// =============================================
// リトライ付き生成
// =============================================

/**
 * Phase A生成（キーワード必須＋未完セリフチェック）
 */
async function generatePhaseAWithRetry(
  prompt: string,
  keyword: string
): Promise<{ text: string; retryCount: number; keywordMiss: boolean }> {
  let retryCount = 0;
  let keywordMiss = false;

  for (let i = 0; i <= MAX_RETRY; i++) {
    const text = await callLLM(prompt);

    // バリデーション
    const validation = validatePhaseText(text);
    const hasKeyword = containsKeyword(text, keyword);

    if (validation.isValid && hasKeyword) {
      return { text, retryCount, keywordMiss: false };
    }

    // 問題を検出
    if (!hasKeyword) {
      keywordMiss = true;
      console.log(`[Phase A] keyword "${keyword}" not found, retry ${i + 1}/${MAX_RETRY + 1}`);
    }
    if (validation.hasIncompleteQuotes) {
      console.log(`[Phase A] incomplete quotes detected: ${validation.incompleteQuotes.join(", ")}, retry ${i + 1}/${MAX_RETRY + 1}`);
    }

    retryCount++;
    if (i === MAX_RETRY) {
      // 最大リトライ到達、最後の結果を使用
      return { text, retryCount, keywordMiss: !hasKeyword };
    }
  }

  // ここには到達しないが型のため
  throw new Error("Unexpected state in generatePhaseAWithRetry");
}

/**
 * Phase B/C生成（未完セリフチェック）
 */
async function generatePhaseWithRetry(
  prompt: string,
  phaseName: string
): Promise<{ text: string; retryCount: number; incompleteQuoteDetected: boolean }> {
  let retryCount = 0;
  let incompleteQuoteDetected = false;

  for (let i = 0; i <= MAX_RETRY; i++) {
    const text = await callLLM(prompt);

    const validation = validatePhaseText(text);

    if (validation.isValid) {
      return { text, retryCount, incompleteQuoteDetected: false };
    }

    incompleteQuoteDetected = true;
    console.log(
      `[${phaseName}] incomplete quotes detected: ${validation.incompleteQuotes.join(", ")}, retry ${i + 1}/${MAX_RETRY + 1}`
    );

    retryCount++;
    if (i === MAX_RETRY) {
      return { text, retryCount, incompleteQuoteDetected: true };
    }
  }

  throw new Error(`Unexpected state in generatePhaseWithRetry (${phaseName})`);
}

// =============================================
// 3フェーズ生成
// =============================================

async function executeThreePhaseGeneration(
  word: string,
  style: StoryStyle,
  blueprint: BlueprintSearchResult,
  recentMetas: StoryMeta[]
): Promise<{ result: ThreePhaseResult; stats: ValidationStats; storyMeta: StoryMeta }> {
  const bp = blueprint.blueprint;
  const endingMode = bp.ending_mode || "open";

  const stats: ValidationStats = {
    retryCountPhaseA: 0,
    retryCountPhaseB: 0,
    retryCountPhaseC: 0,
    keywordMissDetected: false,
    incompleteQuoteDetected: false,
    // 重複除去ログ
    dedupeApplied: false,
    dedupeTarget: null,
    dedupeMethod: null,
    // 多様性ガードログ
    diversityGuardTriggered: false,
    diversityGuardReason: null,
    diversityRetryCount: 0,
    // Phase C クライマックスチェック
    endingPeakOk: true,
    endingRetryCount: 0,
    // キーワード主役化チェック
    keywordFocusOk: true,
    keywordFocusCount: 0,
    keywordFocusRetryCount: 0,
    // Phase B 導入文被りチェック（内部ログ用）
    phaseBOverlapDetected: false,
    phaseBOverlapRetryCount: 0,
    phaseBOverlapReason: null,
  };

  // 多様性ヒントを構築
  const diversityHint = buildDiversityAvoidanceHint(recentMetas);

  // Phase A: opening（キーワード必須）+ 多様性ガード
  // 対策1: Phase A は必ず「上書き」する（append/push/concat 禁止）
  let phaseAText = '';
  let phaseAPrompt = '';

  for (let diversityAttempt = 0; diversityAttempt <= 1; diversityAttempt++) {
    phaseAPrompt = buildPhaseAPrompt(bp.normal_rule, style, word, bp.detail_bank, diversityAttempt > 0 ? diversityHint : '');
    console.log(`[Phase A] generating opening... (diversity attempt ${diversityAttempt + 1})`);
    const phaseAResult = await generatePhaseAWithRetry(phaseAPrompt, word);
    stats.retryCountPhaseA = phaseAResult.retryCount;
    stats.keywordMissDetected = phaseAResult.keywordMiss;
    // 対策1: 常に上書き（phaseAText = newText）
    phaseAText = phaseAResult.text;

    // 多様性チェック（初回のみ）
    if (diversityAttempt === 0 && recentMetas.length > 0) {
      const currentMeta = extractStoryMeta(phaseAText);
      const diversityCheck = shouldTriggerDiversityGuard(currentMeta, recentMetas);

      if (diversityCheck.shouldRetry) {
        console.log(`[Diversity] guard triggered: ${diversityCheck.reason}, retrying Phase A`);
        stats.diversityGuardTriggered = true;
        stats.diversityGuardReason = diversityCheck.reason;
        stats.diversityRetryCount = 1;
        continue; // 再生成
      }
    }
    break; // 多様性OK or 再生成完了
  }

  // Phase B: disturbance（続き書き専用 + 導入文被りチェック）
  const phaseBPrompt = buildPhaseBPrompt(bp.anomaly, style, phaseAText, word);
  let phaseBText = '';
  const MAX_PHASE_B_OVERLAP_RETRY = 2;

  for (let overlapAttempt = 0; overlapAttempt <= MAX_PHASE_B_OVERLAP_RETRY; overlapAttempt++) {
    console.log(`[Phase B] generating disturbance... (overlap check attempt ${overlapAttempt + 1})`);
    const phaseBResult = await generatePhaseWithRetry(phaseBPrompt, "Phase B");
    stats.retryCountPhaseB += phaseBResult.retryCount;
    if (phaseBResult.incompleteQuoteDetected) {
      stats.incompleteQuoteDetected = true;
    }
    phaseBText = phaseBResult.text;

    // 導入文被りチェック
    const overlapCheck = validatePhaseBOverlap(phaseAText, phaseBText);

    if (overlapCheck.isValid) {
      // OK: 被りなし
      break;
    }

    // NG: 被り検出 → 再生成
    stats.phaseBOverlapDetected = true;
    stats.phaseBOverlapReason = overlapCheck.reason;
    stats.phaseBOverlapRetryCount = overlapAttempt + 1;

    console.log(`[Phase B Overlap] ${overlapCheck.details}`);
    console.log(`[Phase B Overlap Internal] phaseB_overlap_detected: true, phaseB_overlap_reason: ${overlapCheck.reason}, phaseB_overlap_retry_count: ${overlapAttempt + 1}`);

    if (overlapAttempt === MAX_PHASE_B_OVERLAP_RETRY) {
      // 最大リトライ到達、最後の結果を使用（後続のdedupeで救済）
      console.log(`[Phase B Overlap] max retry reached, proceeding with current result`);
    }
  }

  // Phase C: irreversible_point + climax チェック + キーワード主役化チェック
  const combinedAB = `${phaseAText}\n\n${phaseBText}`;
  let phaseCText = '';
  let phaseCPrompt = '';

  for (let climaxAttempt = 0; climaxAttempt <= 1; climaxAttempt++) {
    phaseCPrompt = buildPhaseCPrompt(bp.irreversible_point, style, combinedAB, endingMode, word);
    console.log(`[Phase C] generating irreversible_point+climax (mode=${endingMode}, attempt ${climaxAttempt + 1})...`);
    const phaseCResult = await generatePhaseWithRetry(phaseCPrompt, "Phase C");
    stats.retryCountPhaseC += phaseCResult.retryCount;
    if (phaseCResult.incompleteQuoteDetected) {
      stats.incompleteQuoteDetected = true;
    }
    phaseCText = phaseCResult.text;

    // クライマックスチェック（初回のみ）
    if (climaxAttempt === 0) {
      const climaxValidation = validatePhaseCClimax(phaseCText);
      if (!climaxValidation.isValid) {
        console.log(`[Phase C] climax validation failed: ${climaxValidation.issues.join(', ')}, retrying`);
        stats.endingPeakOk = false;
        stats.endingRetryCount = 1;
        continue; // 再生成
      }
    }
    stats.endingPeakOk = true;
    break;
  }

  // キーワード主役化チェック（Phase B + C を結合して検証）
  const combinedBC = `${phaseBText}\n\n${phaseCText}`;
  const keywordFocusResult = validateKeywordFocus(combinedBC, word, 2);
  stats.keywordFocusOk = keywordFocusResult.isValid;
  stats.keywordFocusCount = keywordFocusResult.keywordCount;

  if (!keywordFocusResult.isValid) {
    console.log(
      `[KeywordFocus] validation: count=${keywordFocusResult.keywordCount}, ` +
      `anomalyConnection=${keywordFocusResult.hasAnomalyConnection}, ` +
      `issues=${keywordFocusResult.issues.join(', ')}`
    );
    // Note: 現時点ではリトライしない（プロンプトで誘導、ログで監視）
    // 将来的にリトライが必要な場合はここに追加
  }

  // 対策3: 結合前に冒頭重複ガードを入れる（保険）
  // - phaseA と phaseB の先頭1文が実質同一なら phaseB の冒頭文を削除
  // - 同様に phaseB / phaseC もチェック
  const { a: dedupeA, b: dedupeB, c: dedupeC, log: dedupeLog } = deduplicatePhases(
    phaseAText,
    phaseBText,
    phaseCText
  );

  // 重複除去ログを記録
  stats.dedupeApplied = dedupeLog.dedupeApplied;
  stats.dedupeTarget = dedupeLog.dedupeTarget;
  stats.dedupeMethod = dedupeLog.dedupeMethod;

  if (dedupeLog.dedupeApplied) {
    console.log(`[Dedupe] applied: target=${dedupeLog.dedupeTarget}, method=${dedupeLog.dedupeMethod}`);
  }

  // 対策2: 最終結合は固定形式のみ許可（配列結合・ループ結合は禁止）
  // final = A + "\n\n" + B + "\n\n" + C
  const finalStory = `${dedupeA.trim()}\n\n${dedupeB.trim()}\n\n${dedupeC.trim()}`;

  // ストーリーメタを抽出（多様性ガード用に保存）
  const storyMeta = extractStoryMeta(finalStory);

  // タイトルと冒頭を生成
  const { title, hook } = await generateTitleAndHook(finalStory, word);

  return {
    result: {
      phaseA: { prompt: phaseAPrompt, text: dedupeA },
      phaseB: { prompt: phaseBPrompt, text: dedupeB },
      phaseC: { prompt: phaseCPrompt, text: dedupeC },
      finalStory,
      title,
      hook,
    },
    stats,
    storyMeta,
  };
}

/**
 * タイトルと冒頭（hook）を生成
 */
async function generateTitleAndHook(
  story: string,
  word: string
): Promise<{ title: string; hook: string }> {
  const prompt = `以下の怪談にタイトルと冒頭（hook）をつけてください。

怪談本文:
${story}

制約:
- タイトルは10文字以内、短く不穏に
- hookは本文の最初の1-2文を使うか、導入として1文を作成
- キーワード「${word}」を意識

出力形式（JSONのみ）:
{"title": "タイトル", "hook": "冒頭文"}`;

  const response = await callLLM(prompt, 200);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || "無題",
        hook: parsed.hook || story.slice(0, 100),
      };
    }
  } catch {
    console.warn("[TitleHook] JSON parse failed, using fallback");
  }

  return { title: "無題", hook: story.slice(0, 100) };
}

// =============================================
// DB保存
// =============================================

async function saveStoryWithLogs(
  word: string,
  style: StoryStyle,
  result: ThreePhaseResult,
  selection: BlueprintSelectionResult,
  stats: ValidationStats,
  storyMeta: StoryMeta
): Promise<Story> {
  const { blueprint, fallbackUsed, fallbackReason } = selection;
  const blueprintIdForDb = isGenericBlueprint(blueprint.id) ? null : blueprint.id;

  const story = await createStory(
    word,
    style,
    result.title,
    result.hook,
    result.finalStory,
    blueprintIdForDb,
    storyMeta // 多様性ガード用にメタ情報を保存
  );

  await Promise.allSettled([
    incrementWordCount(word),
    logWordUsage(word, story.id),
    saveGenerationLog({
      storyId: story.id,
      blueprintId: blueprint.id,
      blueprintTitle: blueprint.title,
      blueprintQualityScore: blueprint.quality_score,
      fallbackUsed,
      fallbackReason,
      generationConfig: GENERATION_CONFIG,
      phaseAPrompt: result.phaseA.prompt,
      phaseAText: result.phaseA.text,
      phaseBPrompt: result.phaseB.prompt,
      phaseBText: result.phaseB.text,
      phaseCPrompt: result.phaseC.prompt,
      phaseCText: result.phaseC.text,
      finalStory: result.finalStory,
      // 検証統計
      retryCountPhaseA: stats.retryCountPhaseA,
      retryCountPhaseB: stats.retryCountPhaseB,
      retryCountPhaseC: stats.retryCountPhaseC,
      keywordMissDetected: stats.keywordMissDetected,
      incompleteQuoteDetected: stats.incompleteQuoteDetected,
      // 重複除去ログ
      dedupeApplied: stats.dedupeApplied,
      dedupeTarget: stats.dedupeTarget,
      dedupeMethod: stats.dedupeMethod,
      // 多様性ガードログ
      diversityGuardTriggered: stats.diversityGuardTriggered,
      diversityGuardReason: stats.diversityGuardReason,
      diversityRetryCount: stats.diversityRetryCount,
      // Phase C クライマックスチェック
      endingPeakOk: stats.endingPeakOk,
      endingRetryCount: stats.endingRetryCount,
      // キーワード主役化チェック
      keywordFocusOk: stats.keywordFocusOk,
      keywordFocusCount: stats.keywordFocusCount,
      keywordFocusRetryCount: stats.keywordFocusRetryCount,
    }),
  ]);

  return story;
}

// =============================================
// 入力バリデーション
// =============================================

function validateInput(
  word: unknown,
  style: unknown
): { valid: true; word: string; style: StoryStyle } | { valid: false; error: string } {
  if (!word || typeof word !== "string") {
    return { valid: false, error: "単語を入力してください" };
  }

  if (word.length > 20) {
    return { valid: false, error: "単語は20文字以内で入力してください" };
  }

  const validStyles: StoryStyle[] = ["short", "medium", "long"];
  if (!validStyles.includes(style as StoryStyle)) {
    return { valid: false, error: "無効なスタイルです" };
  }

  return { valid: true, word, style: style as StoryStyle };
}

// =============================================
// APIハンドラ
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. バリデーション
    const validation = validateInput(body.word, body.style);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { word, style } = validation;

    // 2. Blueprint選択（フォールバック対応：必ず成功する）
    const selection = await selectBlueprintWithFallback(word);
    console.log(
      `[Generate] word="${word}", style="${style}", ` +
        `blueprint="${selection.blueprint.title}" (id=${selection.blueprint.id}), ` +
        `fallback=${selection.fallbackReason}`
    );

    // 2.5. 直近のストーリーメタを取得（多様性ガード用）
    let recentMetas: StoryMeta[] = [];
    try {
      const storedMetas = await getRecentStoryMetas(3);
      recentMetas = storedMetas.map(m => ({
        setting: m.setting as StoryMeta['setting'],
        cast: m.cast as StoryMeta['cast'],
        flow: m.flow as StoryMeta['flow'],
      }));
    } catch (error) {
      console.warn("[Diversity] Failed to fetch recent metas:", error);
      // 失敗しても生成は続行
    }

    // 3. 3フェーズ生成（リトライ付き + 多様性ガード + クライマックスチェック）
    const { result, stats, storyMeta } = await executeThreePhaseGeneration(
      word,
      style,
      selection.blueprint,
      recentMetas
    );

    // 統計ログ
    const hasRetries = stats.retryCountPhaseA > 0 || stats.retryCountPhaseB > 0 || stats.retryCountPhaseC > 0;
    const hasGuards = stats.diversityGuardTriggered || stats.dedupeApplied || stats.endingRetryCount > 0;
    const hasKeywordIssue = !stats.keywordFocusOk;
    const hasPhaseBOverlap = stats.phaseBOverlapDetected;

    if (hasRetries || hasGuards || hasKeywordIssue || hasPhaseBOverlap) {
      console.log(
        `[Stats] retries: A=${stats.retryCountPhaseA}, B=${stats.retryCountPhaseB}, C=${stats.retryCountPhaseC}, ` +
          `keywordMiss=${stats.keywordMissDetected}, incompleteQuote=${stats.incompleteQuoteDetected}, ` +
          `dedupe=${stats.dedupeApplied}, diversity=${stats.diversityGuardTriggered}, ` +
          `endingRetry=${stats.endingRetryCount}, keywordFocus=${stats.keywordFocusOk}(count=${stats.keywordFocusCount}), ` +
          `phaseBOverlap=${stats.phaseBOverlapDetected}(reason=${stats.phaseBOverlapReason}, retry=${stats.phaseBOverlapRetryCount})`
      );
    }

    // 4. DB保存 + ログ記録
    const story = await saveStoryWithLogs(word, style, result, selection, stats, storyMeta);

    return NextResponse.json({ story });
  } catch (error) {
    console.error("[Generate] Error:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ error: "APIキーが無効です" }, { status: 500 });
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "リクエストが多すぎます。しばらくお待ちください" },
          { status: 429 }
        );
      }
    }

    return NextResponse.json({ error: "怪談の生成に失敗しました" }, { status: 500 });
  }
}
