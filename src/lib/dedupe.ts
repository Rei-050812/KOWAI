/**
 * テキスト重複除去ユーティリティ
 * Phase A/B/C の結合時に冒頭文が連続する問題を防ぐ
 */

// =============================================
// 定数
// =============================================

/** 比較する先頭文字数（正規化後） */
const HEAD_COMPARE_LENGTH = 100;

/** 類似度の閾値（これ以上で重複と判定） */
const SIMILARITY_THRESHOLD = 0.85;

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
 * 先頭文が重複しているかチェック
 */
function isHeadDuplicate(textA: string, textB: string): boolean {
  const headA = extractHeadSentences(textA, 2);
  const headB = extractHeadSentences(textB, 2);

  // 先頭文が完全に含まれているか
  const normalizedA = normalizeForCompare(headA);
  const normalizedB = normalizeForCompare(headB);

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
 * Phase Bの先頭からPhase Aと重複する部分を除去
 */
function trimDuplicateHead(phaseA: string, phaseB: string): string {
  const headA = extractHeadSentences(phaseA, 2);
  const normalizedHeadA = normalizeForCompare(headA);

  // Phase Bの先頭からheadAを探して除去
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
        continue; // この行をスキップ
      }
    }

    trimmedLines.push(lines[i]);
  }

  // 重複が見つからなかった場合は元のテキストを返す
  if (!foundDuplicate) {
    return phaseB;
  }

  return trimmedLines.join('\n').trim();
}

// =============================================
// メイン関数
// =============================================

/**
 * 3フェーズテキストの重複を検出・除去
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

  // A-B間の重複チェック
  if (isHeadDuplicate(phaseA, phaseB)) {
    console.log('[Dedupe] A-B duplicate detected, trimming B head');
    resultB = trimDuplicateHead(phaseA, phaseB);
    log.dedupeApplied = true;
    log.dedupeTarget = 'A-B';
    log.dedupeMethod = 'trim_head';
  }

  // B-C間の重複チェック（A-Bで処理した後のBを使う）
  if (isHeadDuplicate(resultB, phaseC)) {
    console.log('[Dedupe] B-C duplicate detected, trimming C head');
    resultC = trimDuplicateHead(resultB, phaseC);
    // 既にA-Bで検出済みの場合はB-Cに上書きしない
    if (!log.dedupeApplied) {
      log.dedupeApplied = true;
      log.dedupeTarget = 'B-C';
      log.dedupeMethod = 'trim_head';
    }
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
