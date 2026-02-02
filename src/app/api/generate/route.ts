import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  StoryStyle,
  BlueprintSearchResult,
  Story,
  GenerationConfig,
  BlueprintSelectionResult,
  StyleBlueprint,
  StyleBlueprintData,
} from "@/types";
import { buildPhaseAPrompt, buildPhaseBPrompt, buildPhaseCPrompt, buildStyleHint } from "@/lib/prompts";
import {
  createStory,
  incrementWordCount,
  logWordUsage,
  matchBlueprintsByKeyword,
  matchBlueprintsLoose,
  getRandomBlueprint,
  saveGenerationLog,
  getRecentStoryMetas,
  selectStyleBlueprint,
  recordStyleBlueprintUsage,
} from "@/lib/supabase";
import { getGenericBlueprint, isGenericBlueprint } from "@/lib/generic-blueprint";
import {
  validatePhaseText,
  containsKeyword,
  validatePhaseCClimax,
  validateKeywordFocus,
  validatePhaseBOverlap,
  validateEventRepetition,
  validateActionConsistency,
  validatePhaseA,
  validatePhaseABSimilarity,
  PhaseAValidationResult,
  PhaseABSimilarityResult,
} from "@/lib/validators";
import { deduplicatePhases, DedupeLog } from "@/lib/dedupe";
import { extractStoryMeta, StoryMeta, shouldTriggerDiversityGuard, buildDiversityAvoidanceHint, buildVocabCooldownList, buildVocabCooldownHint } from "@/lib/diversity";

// =============================================
// 定数
// =============================================

const MODEL = "claude-sonnet-4-20250514";
const MIN_QUALITY_HIT = 70;
const MIN_QUALITY_NEAR = 30;
const TOP_K = 1;
const MAX_RETRY = 1; // 高速化のため削減

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
  // 出来事再描写チェック（内部ログ用）
  eventRepetitionDetected: boolean;
  eventRepetitionRetryCount: number;
  repeatedEvents: string[];
  // 行動整合性チェック（内部ログ用）
  actionConsistencyIssueDetected: boolean;
  actionConsistencyRetryCount: number;
  actionConsistencyReason: 'incompatible_action' | 'abrupt_escape' | null;
  // 語彙クールダウン（内部ログ用）
  repeatedVocabDetected: boolean;
  avoidedVocab: string[];
  // Phase A 文数制限/禁止語句チェック（内部ログ用）
  phaseASentenceCountViolation: boolean;
  phaseASentenceCount: number;
  phaseAForbiddenWordDetected: boolean;
  phaseAForbiddenWords: string[];
  phaseAValidationRetryCount: number;
  // Phase A / B 類似判定（内部ログ用）
  phaseABSimilarityViolation: boolean;
  phaseABSimilarityScore: number;
  phaseABSimilarityReason: 'high_similarity' | 'forbidden_start' | 'same_subject' | null;
  phaseABSimilarityRetryCount: number;
  // StyleBlueprint（書き方の流派）
  styleBlueprintId: number | null;
  styleBlueprintName: string | null;
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
  // 0. 単語が空の場合は直接ランダム選択（おまかせモード）
  if (!word) {
    try {
      const randomBlueprint = await getRandomBlueprint(50);
      if (randomBlueprint) {
        console.log(
          `[Blueprint] RANDOM(おまかせ): "${randomBlueprint.title}" (id=${randomBlueprint.id}, quality=${randomBlueprint.quality_score})`
        );
        return { blueprint: randomBlueprint, fallbackUsed: false, fallbackReason: "random" };
      }
    } catch (error) {
      console.warn("[Blueprint] Random selection failed:", error);
    }
    // ランダムも失敗したら汎用Blueprint
    const genericBlueprint = getGenericBlueprint();
    console.log(`[Blueprint] GENERIC(おまかせ): using fallback blueprint`);
    return { blueprint: genericBlueprint, fallbackUsed: true, fallbackReason: "generic" };
  }

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
  recentMetas: StoryMeta[],
  styleBlueprint: StyleBlueprint | null
): Promise<{ result: ThreePhaseResult; stats: ValidationStats; storyMeta: StoryMeta }> {
  const bp = blueprint.blueprint;
  const endingMode = bp.ending_mode || "open";

  // StyleBlueprint のスタイルヒントを構築（Phase B/C で使用）
  const styleHint = styleBlueprint ? buildStyleHint(styleBlueprint.style_data) : '';
  if (styleBlueprint) {
    console.log(`[StyleBlueprint] Using: "${styleBlueprint.archetype_name}" (id=${styleBlueprint.id})`);
  }

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
    // 出来事再描写チェック（内部ログ用）
    eventRepetitionDetected: false,
    eventRepetitionRetryCount: 0,
    repeatedEvents: [],
    // 行動整合性チェック（内部ログ用）
    actionConsistencyIssueDetected: false,
    actionConsistencyRetryCount: 0,
    actionConsistencyReason: null,
    // 語彙クールダウン（内部ログ用）
    repeatedVocabDetected: false,
    avoidedVocab: [],
    // Phase A 文数制限/禁止語句チェック（内部ログ用）
    phaseASentenceCountViolation: false,
    phaseASentenceCount: 0,
    phaseAForbiddenWordDetected: false,
    phaseAForbiddenWords: [],
    phaseAValidationRetryCount: 0,
    // Phase A / B 類似判定（内部ログ用）
    phaseABSimilarityViolation: false,
    phaseABSimilarityScore: 0,
    phaseABSimilarityReason: null,
    phaseABSimilarityRetryCount: 0,
    // StyleBlueprint（書き方の流派）
    styleBlueprintId: styleBlueprint?.id || null,
    styleBlueprintName: styleBlueprint?.archetype_name || null,
  };

  // 多様性ヒントを構築
  const diversityHint = buildDiversityAvoidanceHint(recentMetas);

  // 語彙クールダウンリストを構築
  const vocabCooldown = buildVocabCooldownList(recentMetas, 5);
  const vocabCooldownHint = buildVocabCooldownHint(vocabCooldown.avoidList);
  if (vocabCooldown.detected) {
    stats.repeatedVocabDetected = true;
    stats.avoidedVocab = vocabCooldown.avoidList;
    console.log(`[VocabCooldown] Avoid list: ${vocabCooldown.avoidList.join(', ')}`);
  }

  // Phase A: opening（最大1文のみ）+ 多様性ガード + 文数制限/禁止語句チェック
  // 対策1: Phase A は必ず「上書き」する（append/push/concat 禁止）
  let phaseAText = '';
  let phaseAPrompt = '';
  const MAX_PHASE_A_VALIDATION_RETRY = 1; // 高速化のため削減

  phaseAGenerationLoop:
  for (let validationAttempt = 0; validationAttempt <= MAX_PHASE_A_VALIDATION_RETRY; validationAttempt++) {
    for (let diversityAttempt = 0; diversityAttempt <= 1; diversityAttempt++) {
      phaseAPrompt = buildPhaseAPrompt(bp.normal_rule, style, word, bp.detail_bank, diversityAttempt > 0 ? diversityHint : '', vocabCooldownHint);
      console.log(`[Phase A] generating opening... (validation attempt ${validationAttempt + 1}, diversity attempt ${diversityAttempt + 1})`);
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
          continue; // 再生成（多様性）
        }
      }
      break; // 多様性OK or 再生成完了
    }

    // Phase A 文数制限/禁止語句チェック
    const phaseAValidation = validatePhaseA(phaseAText);
    stats.phaseASentenceCount = phaseAValidation.sentenceCheck.sentenceCount;

    if (!phaseAValidation.isValid) {
      if (phaseAValidation.reason === 'sentence_count') {
        stats.phaseASentenceCountViolation = true;
        console.log(`[Phase A Validation] ${phaseAValidation.details}, retry ${validationAttempt + 1}/${MAX_PHASE_A_VALIDATION_RETRY + 1}`);
      } else if (phaseAValidation.reason === 'forbidden_word') {
        stats.phaseAForbiddenWordDetected = true;
        stats.phaseAForbiddenWords = phaseAValidation.forbiddenCheck.forbiddenWords.map(fw => fw.word);
        console.log(`[Phase A Validation] ${phaseAValidation.details}, retry ${validationAttempt + 1}/${MAX_PHASE_A_VALIDATION_RETRY + 1}`);
      }
      stats.phaseAValidationRetryCount = validationAttempt + 1;

      if (validationAttempt < MAX_PHASE_A_VALIDATION_RETRY) {
        continue phaseAGenerationLoop; // 再生成
      }
      // 最大リトライ到達、現在の結果を使用
      console.log(`[Phase A Validation] max retry reached, proceeding with current result`);
    }
    break phaseAGenerationLoop; // バリデーションOK
  }

  // Phase B: disturbance（続き書き専用 + 導入文被り/出来事再描写/行動整合性チェック）
  // styleHint を Phase B に注入（Phase A には適用しない）
  const phaseBPrompt = buildPhaseBPrompt(bp.anomaly, style, phaseAText, word, vocabCooldownHint + styleHint);
  let phaseBText = '';
  const MAX_PHASE_B_VALIDATION_RETRY = 1; // 高速化のため削減

  for (let validationAttempt = 0; validationAttempt <= MAX_PHASE_B_VALIDATION_RETRY; validationAttempt++) {
    console.log(`[Phase B] generating disturbance... (validation attempt ${validationAttempt + 1})`);
    const phaseBResult = await generatePhaseWithRetry(phaseBPrompt, "Phase B");
    stats.retryCountPhaseB += phaseBResult.retryCount;
    if (phaseBResult.incompleteQuoteDetected) {
      stats.incompleteQuoteDetected = true;
    }
    phaseBText = phaseBResult.text;

    let shouldRetry = false;

    // 1. 導入文被りチェック
    const overlapCheck = validatePhaseBOverlap(phaseAText, phaseBText);
    if (!overlapCheck.isValid) {
      stats.phaseBOverlapDetected = true;
      stats.phaseBOverlapReason = overlapCheck.reason;
      stats.phaseBOverlapRetryCount = validationAttempt + 1;
      console.log(`[Phase B Overlap] ${overlapCheck.details}`);
      console.log(`[Phase B Overlap Internal] phaseB_overlap_detected: true, phaseB_overlap_reason: ${overlapCheck.reason}, phaseB_overlap_retry_count: ${validationAttempt + 1}`);
      shouldRetry = true;
    }

    // 1.5. Phase A / B 類似判定（強化版）
    const similarityCheck = validatePhaseABSimilarity(phaseAText, phaseBText);
    if (!similarityCheck.isValid) {
      stats.phaseABSimilarityViolation = true;
      stats.phaseABSimilarityScore = similarityCheck.similarity;
      stats.phaseABSimilarityReason = similarityCheck.reason;
      stats.phaseABSimilarityRetryCount = validationAttempt + 1;
      console.log(`[Phase A/B Similarity] ${similarityCheck.details}`);
      console.log(`[Phase A/B Similarity Internal] similarity_violation: true, score: ${similarityCheck.similarity.toFixed(2)}, reason: ${similarityCheck.reason}, retry_count: ${validationAttempt + 1}`);
      shouldRetry = true;
    }

    // 2. 出来事再描写チェック
    const eventCheck = validateEventRepetition(phaseAText, phaseBText);
    if (!eventCheck.isValid) {
      stats.eventRepetitionDetected = true;
      stats.repeatedEvents = eventCheck.repeatedEvents;
      stats.eventRepetitionRetryCount = validationAttempt + 1;
      console.log(`[Phase B EventRepetition] ${eventCheck.details}`);
      console.log(`[Phase B EventRepetition Internal] event_repetition_detected: true, repeated_events: [${eventCheck.repeatedEvents.join(', ')}], retry_count: ${validationAttempt + 1}`);
      shouldRetry = true;
    }

    // 3. 行動整合性チェック（Phase A を前段として渡す）
    const actionCheck = validateActionConsistency(phaseBText, phaseAText);
    if (!actionCheck.isValid) {
      stats.actionConsistencyIssueDetected = true;
      stats.actionConsistencyReason = actionCheck.reason;
      stats.actionConsistencyRetryCount = validationAttempt + 1;
      console.log(`[Phase B ActionConsistency] ${actionCheck.details}`);
      console.log(`[Phase B ActionConsistency Internal] action_consistency_issue: true, reason: ${actionCheck.reason}, retry_count: ${validationAttempt + 1}`);
      shouldRetry = true;
    }

    if (!shouldRetry) {
      // 全チェックOK
      break;
    }

    if (validationAttempt === MAX_PHASE_B_VALIDATION_RETRY) {
      // 最大リトライ到達、最後の結果を使用（後続のdedupeで救済）
      console.log(`[Phase B Validation] max retry reached, proceeding with current result`);
    }
  }

  // Phase C: irreversible_point + climax チェック + 行動整合性チェック + キーワード主役化チェック
  // styleHint を Phase C にも注入
  const combinedAB = `${phaseAText}\n\n${phaseBText}`;
  let phaseCText = '';
  let phaseCPrompt = '';
  const MAX_PHASE_C_VALIDATION_RETRY = 1; // 高速化のため削減

  for (let validationAttempt = 0; validationAttempt <= MAX_PHASE_C_VALIDATION_RETRY; validationAttempt++) {
    phaseCPrompt = buildPhaseCPrompt(bp.irreversible_point, style, combinedAB, endingMode, word, vocabCooldownHint + styleHint);
    console.log(`[Phase C] generating irreversible_point+climax (mode=${endingMode}, validation attempt ${validationAttempt + 1})...`);
    const phaseCResult = await generatePhaseWithRetry(phaseCPrompt, "Phase C");
    stats.retryCountPhaseC += phaseCResult.retryCount;
    if (phaseCResult.incompleteQuoteDetected) {
      stats.incompleteQuoteDetected = true;
    }
    phaseCText = phaseCResult.text;

    let shouldRetry = false;

    // 1. クライマックスチェック
    const climaxValidation = validatePhaseCClimax(phaseCText);
    if (!climaxValidation.isValid) {
      console.log(`[Phase C Climax] validation failed: ${climaxValidation.issues.join(', ')}`);
      stats.endingPeakOk = false;
      stats.endingRetryCount = validationAttempt + 1;
      shouldRetry = true;
    }

    // 2. 行動整合性チェック（Phase A+B を前段として渡す）
    const actionCheck = validateActionConsistency(phaseCText, combinedAB);
    if (!actionCheck.isValid) {
      // Phase C でも検出した場合は stats を上書き（Phase B で検出済みでなければ）
      if (!stats.actionConsistencyIssueDetected) {
        stats.actionConsistencyIssueDetected = true;
        stats.actionConsistencyReason = actionCheck.reason;
      }
      stats.actionConsistencyRetryCount = Math.max(stats.actionConsistencyRetryCount, validationAttempt + 1);
      console.log(`[Phase C ActionConsistency] ${actionCheck.details}`);
      console.log(`[Phase C ActionConsistency Internal] action_consistency_issue: true, reason: ${actionCheck.reason}, retry_count: ${validationAttempt + 1}`);
      shouldRetry = true;
    }

    if (!shouldRetry) {
      stats.endingPeakOk = true;
      break;
    }

    if (validationAttempt === MAX_PHASE_C_VALIDATION_RETRY) {
      console.log(`[Phase C Validation] max retry reached, proceeding with current result`);
    }
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
      // StyleBlueprint（書き方の流派）
      styleBlueprintId: stats.styleBlueprintId,
      styleBlueprintName: stats.styleBlueprintName,
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
  // 単語は任意（空文字列も許可）
  const wordStr = typeof word === "string" ? word.trim() : "";

  if (wordStr.length > 20) {
    return { valid: false, error: "単語は20文字以内で入力してください" };
  }

  const validStyles: StoryStyle[] = ["short", "medium", "long"];
  if (!validStyles.includes(style as StoryStyle)) {
    return { valid: false, error: "無効なスタイルです" };
  }

  return { valid: true, word: wordStr, style: style as StoryStyle };
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

    // 2.6. StyleBlueprint を選択（書き方の流派）
    let styleBlueprint: StyleBlueprint | null = null;
    try {
      styleBlueprint = await selectStyleBlueprint();
      if (styleBlueprint) {
        console.log(
          `[Generate] styleBlueprint="${styleBlueprint.archetype_name}" (id=${styleBlueprint.id})`
        );
      }
    } catch (error) {
      console.warn("[StyleBlueprint] Failed to select:", error);
      // 失敗しても生成は続行（スタイルなしで生成）
    }

    // 3. 3フェーズ生成（リトライ付き + 多様性ガード + クライマックスチェック + スタイル適用）
    const { result, stats, storyMeta } = await executeThreePhaseGeneration(
      word,
      style,
      selection.blueprint,
      recentMetas,
      styleBlueprint
    );

    // 3.5. StyleBlueprint の使用を記録
    if (styleBlueprint) {
      recordStyleBlueprintUsage(styleBlueprint.id).catch(err => {
        console.warn("[StyleBlueprint] Failed to record usage:", err);
      });
    }

    // 統計ログ
    const hasRetries = stats.retryCountPhaseA > 0 || stats.retryCountPhaseB > 0 || stats.retryCountPhaseC > 0;
    const hasGuards = stats.diversityGuardTriggered || stats.dedupeApplied || stats.endingRetryCount > 0;
    const hasKeywordIssue = !stats.keywordFocusOk;
    const hasPhaseBOverlap = stats.phaseBOverlapDetected;
    const hasEventRepetition = stats.eventRepetitionDetected;
    const hasActionConsistencyIssue = stats.actionConsistencyIssueDetected;
    const hasVocabCooldown = stats.repeatedVocabDetected;
    const hasPhaseAValidationIssue = stats.phaseASentenceCountViolation || stats.phaseAForbiddenWordDetected;
    const hasPhaseABSimilarityIssue = stats.phaseABSimilarityViolation;

    if (hasRetries || hasGuards || hasKeywordIssue || hasPhaseBOverlap || hasEventRepetition || hasActionConsistencyIssue || hasVocabCooldown || hasPhaseAValidationIssue || hasPhaseABSimilarityIssue) {
      console.log(
        `[Stats] retries: A=${stats.retryCountPhaseA}, B=${stats.retryCountPhaseB}, C=${stats.retryCountPhaseC}, ` +
          `keywordMiss=${stats.keywordMissDetected}, incompleteQuote=${stats.incompleteQuoteDetected}, ` +
          `dedupe=${stats.dedupeApplied}, diversity=${stats.diversityGuardTriggered}, ` +
          `endingRetry=${stats.endingRetryCount}, keywordFocus=${stats.keywordFocusOk}(count=${stats.keywordFocusCount}), ` +
          `phaseAValidation=${hasPhaseAValidationIssue}(sentences=${stats.phaseASentenceCount}, forbidden=${stats.phaseAForbiddenWords.join(',')}, retry=${stats.phaseAValidationRetryCount}), ` +
          `phaseABSimilarity=${stats.phaseABSimilarityViolation}(score=${stats.phaseABSimilarityScore.toFixed(2)}, reason=${stats.phaseABSimilarityReason}, retry=${stats.phaseABSimilarityRetryCount}), ` +
          `phaseBOverlap=${stats.phaseBOverlapDetected}(reason=${stats.phaseBOverlapReason}, retry=${stats.phaseBOverlapRetryCount}), ` +
          `eventRepetition=${stats.eventRepetitionDetected}(retry=${stats.eventRepetitionRetryCount}), ` +
          `actionConsistency=${stats.actionConsistencyIssueDetected}(reason=${stats.actionConsistencyReason}, retry=${stats.actionConsistencyRetryCount}), ` +
          `vocabCooldown=${stats.repeatedVocabDetected}(avoided=[${stats.avoidedVocab.join(',')}])`
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
