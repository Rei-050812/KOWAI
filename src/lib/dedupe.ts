/**
 * テキスト重複除去ユーティリティ
 * Phase A/B/C の結合時に冒頭文が連続する問題を防ぐ
 *
 * 対策：
 * 1. Phase A は必ず「上書き」（route.ts側で保証）
 * 2. 最終結合は固定形式のみ: A + "\n\n" + B + "\n\n" + C
 * 3. 結合前に冒頭重複ガード（先頭1文の実質同一チェック）
 */

// =============================================
// 定数
// =============================================

/** 比較する先頭文字数（正規化後） */
const HEAD_COMPARE_LENGTH = 100;

/** 類似度の閾値（これ以上で重複と判定） */
const SIMILARITY_THRESHOLD = 0.80;

/** 先頭1文の最小一致率（これ以上で実質同一と判定） */
const FIRST_SENTENCE_MATCH_THRESHOLD = 0.90;

// =============================================
// 型定義
// =============================================

export interface DedupeResult {
  text: string;
  applied: boolean;
  target: 'A-B' | 'B-C' | null;
  method: 'trim_head' | null;
}

export interface DedupeLog {
  dedupeApplied: boolean;
  dedupeTarget: 'A-B' | 'B-C' | null;
  dedupeMethod: 'trim_head' | null;
}

// =============================================
// 正規化関数
// =============================================

/**
 * テキストを正規化（比較用）
 * - 空白・改行をトリム
 * - 連続スペースを単一に
 * - 全角/半角スペース統一
 */
function normalizeForCompare(text: string): string {
  return text
    .replace(/[\r\n]+/g, '')       // 改行除去
    .replace(/[\s\u3000]+/g, ' ')  // 連続空白を単一スペースに
    .trim();
}

/**
 * 先頭N文を抽出
 * 句点（。）または改行で区切られた先頭1-2文を取得
 */
function extractHeadSentences(text: string, count: number = 2): string {
  const normalized = normalizeForCompare(text);
  const sentences = normalized.split(/(?<=[。！？])/);
  return sentences.slice(0, count).join('').trim();
}

/**
 * 先頭1文のみを抽出
 */
function extractFirstSentence(text: string): string {
  const normalized = normalizeForCompare(text);
  // 句点、感嘆符、疑問符で区切る
  const match = normalized.match(/^[^。！？]+[。！？]?/);
  return match ? match[0].trim() : normalized.slice(0, 50).trim();
}

// =============================================
// 類似度計算
// =============================================

/**
 * 2つのテキストの類似度を計算（0-1）
 * 先頭N文字での単純一致率
 */
function calculateSimilarity(textA: string, textB: string): number {
  const a = normalizeForCompare(textA).slice(0, HEAD_COMPARE_LENGTH);
  const b = normalizeForCompare(textB).slice(0, HEAD_COMPARE_LENGTH);

  if (a.length === 0 || b.length === 0) return 0;

  // 短い方の長さを基準に
  const minLen = Math.min(a.length, b.length);
  let matchCount = 0;

  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) matchCount++;
  }

  return matchCount / minLen;
}

/**
 * 先頭1文が実質同一かチェック（厳密）
 */
function isFirstSentenceSame(textA: string, textB: string): boolean {
  const firstA = extractFirstSentence(textA);
  const firstB = extractFirstSentence(textB);

  if (firstA.length === 0 || firstB.length === 0) return false;

  // 完全一致
  if (firstA === firstB) return true;

  // 片方が片方を含む（先頭から）
  if (firstA.startsWith(firstB) || firstB.startsWith(firstA)) return true;

  // 高い類似度（90%以上）
  return calculateSimilarity(firstA, firstB) >= FIRST_SENTENCE_MATCH_THRESHOLD;
}

/**
 * 先頭文が重複しているかチェック
 * - 先頭1文の実質同一チェック（優先）
 * - 先頭2文の類似度チェック（補助）
 */
function isHeadDuplicate(textA: string, textB: string): boolean {
  // 1. 先頭1文の実質同一チェック（厳密）
  if (isFirstSentenceSame(textA, textB)) {
    return true;
  }

  // 2. 先頭2文の類似度チェック（補助）
  const headA = extractHeadSentences(textA, 2);
  const headB = extractHeadSentences(textB, 2);

  const normalizedA = normalizeForCompare(headA);
  const normalizedB = normalizeForCompare(headB);

  // 先頭文が完全に含まれているか
  if (normalizedB.startsWith(normalizedA) || normalizedA.startsWith(normalizedB)) {
    return true;
  }

  // 類似度チェック
  return calculateSimilarity(headA, headB) >= SIMILARITY_THRESHOLD;
}

// =============================================
// 重複除去関数
// =============================================

/**
 * Phase Bの先頭からPhase Aの先頭1文と重複する部分を除去
 * 改良版：先頭1文の完全一致/高類似度を確実に検出して除去
 */
function trimDuplicateHead(phaseA: string, phaseB: string): string {
  const firstSentenceA = extractFirstSentence(phaseA);
  const normalizedFirstA = normalizeForCompare(firstSentenceA);

  // Phase Bを正規化
  const normalizedB = normalizeForCompare(phaseB);

  // 方法1: Phase B が Phase A の先頭1文で始まっている場合、その部分を除去
  if (normalizedB.startsWith(normalizedFirstA)) {
    // 先頭1文を除去
    const remaining = phaseB.replace(new RegExp(`^[\\s\\n]*${escapeRegex(firstSentenceA)}[\\s\\n]*`, 's'), '');
    console.log(`[Dedupe] Exact first sentence match removed: "${firstSentenceA.slice(0, 40)}..."`);
    return remaining.trim();
  }

  // 方法2: 先頭1文が高類似度（90%以上）の場合
  const firstSentenceB = extractFirstSentence(phaseB);
  const normalizedFirstB = normalizeForCompare(firstSentenceB);

  if (calculateSimilarity(normalizedFirstA, normalizedFirstB) >= FIRST_SENTENCE_MATCH_THRESHOLD) {
    // Phase Bから先頭1文を除去
    const sentencePattern = new RegExp(`^[^。！？]*[。！？]?[\\s\\n]*`, 's');
    const remaining = phaseB.replace(sentencePattern, '');
    console.log(`[Dedupe] Similar first sentence removed: "${firstSentenceB.slice(0, 40)}..."`);
    return remaining.trim();
  }

  // 方法3: 行単位での類似度チェック（従来方式、フォールバック）
  const headA = extractHeadSentences(phaseA, 2);
  const normalizedHeadA = normalizeForCompare(headA);

  const lines = phaseB.split(/\n+/);
  let trimmedLines: string[] = [];
  let foundDuplicate = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (!foundDuplicate) {
      const normalizedLine = normalizeForCompare(line);
      // 先頭行がPhase Aの先頭と類似していたらスキップ
      if (calculateSimilarity(normalizedLine, normalizedHeadA) >= SIMILARITY_THRESHOLD) {
        foundDuplicate = true;
        console.log(`[Dedupe] Similar line removed: "${line.slice(0, 40)}..."`);
        continue; // この行をスキップ
      }
    }

    trimmedLines.push(lines[i]);
  }

  if (foundDuplicate) {
    return trimmedLines.join('\n').trim();
  }

  // 重複が見つからなかった場合は元のテキストを返す
  return phaseB;
}

/**
 * 正規表現エスケープ
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================
// メイン関数
// =============================================

/**
 * 3フェーズテキストの重複を検出・除去
 *
 * 対策3: 結合前に冒頭重複ガードを入れる（保険）
 * - phaseA と phaseB の先頭1文が実質同一なら phaseB の冒頭文を削除
 * - 同様に phaseB / phaseC もチェック
 *
 * @param phaseA Phase Aのテキスト
 * @param phaseB Phase Bのテキスト
 * @param phaseC Phase Cのテキスト
 * @returns 重複除去後のテキストとログ情報
 */
export function deduplicatePhases(
  phaseA: string,
  phaseB: string,
  phaseC: string
): { a: string; b: string; c: string; log: DedupeLog } {
  let resultA = phaseA;
  let resultB = phaseB;
  let resultC = phaseC;

  const log: DedupeLog = {
    dedupeApplied: false,
    dedupeTarget: null,
    dedupeMethod: null,
  };

  // 内部ログ用
  let opening_deduped = false;
  let opening_deduped_target: 'A-B' | 'B-C' | null = null;

  // A-B間の重複チェック（先頭1文の実質同一をチェック）
  if (isHeadDuplicate(phaseA, phaseB)) {
    const firstA = extractFirstSentence(phaseA);
    const firstB = extractFirstSentence(phaseB);
    console.log(`[Dedupe] A-B duplicate detected`);
    console.log(`  First sentence A: "${firstA.slice(0, 50)}..."`);
    console.log(`  First sentence B: "${firstB.slice(0, 50)}..."`);

    resultB = trimDuplicateHead(phaseA, phaseB);
    log.dedupeApplied = true;
    log.dedupeTarget = 'A-B';
    log.dedupeMethod = 'trim_head';

    opening_deduped = true;
    opening_deduped_target = 'A-B';
  }

  // B-C間の重複チェック（A-Bで処理した後のBを使う）
  if (isHeadDuplicate(resultB, phaseC)) {
    const firstB = extractFirstSentence(resultB);
    const firstC = extractFirstSentence(phaseC);
    console.log(`[Dedupe] B-C duplicate detected`);
    console.log(`  First sentence B: "${firstB.slice(0, 50)}..."`);
    console.log(`  First sentence C: "${firstC.slice(0, 50)}..."`);

    resultC = trimDuplicateHead(resultB, phaseC);

    // 既にA-Bで検出済みの場合はB-Cに上書きしない（DBログ用）
    if (!log.dedupeApplied) {
      log.dedupeApplied = true;
      log.dedupeTarget = 'B-C';
      log.dedupeMethod = 'trim_head';
    }

    opening_deduped = true;
    opening_deduped_target = opening_deduped_target || 'B-C';
  }

  // 内部ログ出力
  if (opening_deduped) {
    console.log(`[Dedupe Internal] opening_deduped: ${opening_deduped}, opening_deduped_target: ${opening_deduped_target}`);
  }

  return {
    a: resultA,
    b: resultB,
    c: resultC,
    log,
  };
}

/**
 * 最終結合を行う（固定フォーマット）
 * Phase A + "\n\n" + Phase B + "\n\n" + Phase C
 */
export function concatenatePhases(
  phaseA: string,
  phaseB: string,
  phaseC: string
): string {
  // 重複除去を適用
  const { a, b, c } = deduplicatePhases(phaseA, phaseB, phaseC);

  // 各フェーズの末尾改行を正規化
  const cleanA = a.trim();
  const cleanB = b.trim();
  const cleanC = c.trim();

  return `${cleanA}\n\n${cleanB}\n\n${cleanC}`;
}
