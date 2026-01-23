/**
 * 生成テキストのバリデーション関数群
 * - 未完セリフ検出
 * - キーワード検出
 */

// =============================================
// 未完セリフ検出
// =============================================

/**
 * 未完セリフ（言いかけ）のパターン
 * 「」内が以下で終わる場合はNG:
 * - 省略記号のみで終わる: …, ……（ただし「...来た。」のような完結文はOK）
 * - ダッシュ: ―, —, ――, -
 * - 読点で終わる: 、
 * - 助詞・接続語で終わる: から, けど, のに, が, て, で, を, に, は, も
 *
 * 許可：
 * - セリフ内の「！」は使用可
 * - セリフ途中の「...」は使用可（文として完結していればOK）
 */
const INCOMPLETE_QUOTE_ENDINGS = [
  // 省略記号/ダッシュのみで終わる（完結していない）
  /[…]+」$/,     // 省略記号のみで終わる
  /―」$/,        // ダッシュ
  /—」$/,        // emダッシュ
  /――」$/,      // ダッシュ（二重）
  /-」$/,        // ハイフン
  /、」$/,       // 読点で終わる
  /から」$/,     // 助詞
  /けど」$/,     // 接続
  /のに」$/,     // 接続
  /だから」$/,   // 接続
  /でも」$/,     // 接続
  /って」$/,     // 引用
  /とか」$/,     // 列挙
  /が」$/,       // 助詞（文末）
  /て」$/,       // 助詞
  /で」$/,       // 助詞
  /を」$/,       // 助詞
  /に」$/,       // 助詞
  /は」$/,       // 助詞（文末で意味的に未完）
  /も」$/,       // 助詞
];

/**
 * 完結セリフのパターン（省略記号の後に完結語がある）
 * これらにマッチすればOK
 */
const COMPLETE_QUOTE_PATTERNS = [
  /[…]+[。！？」]/,           // 省略記号の後に句点/感嘆符/疑問符
  /[…]+[たのだよねわ]。?」$/, // 省略記号の後に終助詞
  /[…]+来た。?」$/,          // 「...来た。」パターン
  /[…]+[いるた]。?」$/,      // 「...いる。」「...た。」パターン
];

/**
 * セリフを抽出する正規表現
 */
const QUOTE_REGEX = /「[^」]+」/g;

/**
 * 未完セリフを検出
 * @param text 検査対象テキスト
 * @returns 未完セリフが含まれている場合 true
 */
export function hasIncompleteQuotes(text: string): boolean {
  const quotes = text.match(QUOTE_REGEX);
  if (!quotes) return false;

  for (const quote of quotes) {
    // 極端に短いセリフ（3文字以下）は未完扱い
    // 例: 「あ」「え」は許可、「あ、」「え―」は検出される
    const content = quote.slice(1, -1); // 「」を除去
    if (content.length <= 1) continue; // 1文字セリフは許可

    // 完結パターンにマッチすればOK（省略記号の後に完結語がある）
    const isComplete = COMPLETE_QUOTE_PATTERNS.some(pattern => pattern.test(quote));
    if (isComplete) continue;

    // 未完パターンにマッチしたらNG
    for (const pattern of INCOMPLETE_QUOTE_ENDINGS) {
      if (pattern.test(quote)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 未完セリフを全て抽出（デバッグ用）
 */
export function findIncompleteQuotes(text: string): string[] {
  const quotes = text.match(QUOTE_REGEX);
  if (!quotes) return [];

  const incompleteQuotes: string[] = [];

  for (const quote of quotes) {
    for (const pattern of INCOMPLETE_QUOTE_ENDINGS) {
      if (pattern.test(quote)) {
        incompleteQuotes.push(quote);
        break;
      }
    }
  }

  return incompleteQuotes;
}

// =============================================
// キーワード検出
// =============================================

/**
 * キーワードがテキストに含まれているかチェック
 * @param text 検査対象テキスト
 * @param keyword 検索キーワード
 * @returns キーワードが含まれている場合 true
 */
export function containsKeyword(text: string, keyword: string): boolean {
  if (!keyword || keyword.length === 0) return true;

  // 大文字小文字を区別しない
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  return lowerText.includes(lowerKeyword);
}

/**
 * キーワードの出現回数をカウント
 */
export function countKeywordOccurrences(text: string, keyword: string): number {
  if (!keyword || keyword.length === 0) return 0;

  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  let count = 0;
  let pos = 0;

  while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
    count++;
    pos += lowerKeyword.length;
  }

  return count;
}

// =============================================
// バリデーション結果
// =============================================

export interface ValidationResult {
  isValid: boolean;
  hasIncompleteQuotes: boolean;
  incompleteQuotes: string[];
  containsKeyword: boolean;
  keywordCount: number;
}

/**
 * テキスト全体をバリデーション
 */
export function validateGeneratedText(
  text: string,
  keyword: string
): ValidationResult {
  const incompleteQuotesList = findIncompleteQuotes(text);
  const keywordFound = containsKeyword(text, keyword);
  const keywordOccurrences = countKeywordOccurrences(text, keyword);

  return {
    isValid: incompleteQuotesList.length === 0 && keywordFound,
    hasIncompleteQuotes: incompleteQuotesList.length > 0,
    incompleteQuotes: incompleteQuotesList,
    containsKeyword: keywordFound,
    keywordCount: keywordOccurrences,
  };
}

/**
 * Phase A/B 用バリデーション（未完セリフのみ）
 */
export function validatePhaseText(text: string): {
  isValid: boolean;
  hasIncompleteQuotes: boolean;
  incompleteQuotes: string[];
} {
  const incompleteQuotesList = findIncompleteQuotes(text);

  return {
    isValid: incompleteQuotesList.length === 0,
    hasIncompleteQuotes: incompleteQuotesList.length > 0,
    incompleteQuotes: incompleteQuotesList,
  };
}

// =============================================
// Phase C クライマックスチェック
// =============================================

/**
 * 恐怖ピーク語彙（クライマックスの存在を示唆する語）
 */
const FEAR_PEAK_KEYWORDS = [
  // パニック・反応
  '叫', '悲鳴', '走', '逃', '駆', '飛び出', '転', '震',
  '息', '心臓', '動悸', '鳥肌', '冷や汗', '固まっ', '凍りつ',
  // 怪異の顕在化
  '見えた', '聞こえた', '触れ', '掴', '迫', '近づ', '現れ',
  '立って', 'いた', 'そこに', '振り返', '目が合',
  // 脱出・生存確認
  '気がつ', '目が覚', '朝に', '翌朝', '病院', '無事', '助かっ',
  '覚えて', 'その後', 'あれ以来', 'それ以来', '今でも',
];

/**
 * 余韻文パターン（締めの一文として適切な表現）
 */
const AFTERGLOW_PATTERNS = [
  /[。」]$/,                     // 文末
  /らしい[。」]?$/,              // 伝聞
  /ている[。」]?$/,              // 継続
  /いない[。」]?$/,              // 否定継続
  /ていた[。」]?$/,              // 過去継続
  /なかった[。」]?$/,            // 過去否定
  /のだ[。」]?$/,                // 断定
  /のだった[。」]?$/,            // 過去断定
  /という[。」]?$/,              // 引用
  /そうだ[。」]?$/,              // 伝聞
];

/**
 * Phase C クライマックスの妥当性をチェック
 * - 文字数が短すぎないか
 * - 恐怖ピーク語彙があるか
 * - 余韻文で終わっているか
 */
export function validatePhaseCClimax(text: string): {
  isValid: boolean;
  hasSufficientLength: boolean;
  hasFearPeak: boolean;
  hasAfterglow: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 1. 文字数チェック（最低100文字）
  const hasSufficientLength = text.length >= 100;
  if (!hasSufficientLength) {
    issues.push('文字数が短すぎる');
  }

  // 2. 恐怖ピーク語彙チェック
  const hasFearPeak = FEAR_PEAK_KEYWORDS.some(keyword => text.includes(keyword));
  if (!hasFearPeak) {
    issues.push('恐怖ピーク語彙が不足');
  }

  // 3. 余韻文チェック（末尾の文が適切な形式か）
  const lines = text.trim().split(/\n+/);
  const lastLine = lines[lines.length - 1]?.trim() || '';
  const hasAfterglow = AFTERGLOW_PATTERNS.some(pattern => pattern.test(lastLine));
  if (!hasAfterglow && lastLine.length < 10) {
    // 短すぎる末尾は余韻文として不適切
    issues.push('余韻文が不十分');
  }

  // 総合判定：恐怖ピーク必須、長さも必須
  const isValid = hasSufficientLength && hasFearPeak;

  return {
    isValid,
    hasSufficientLength,
    hasFearPeak,
    hasAfterglow,
    issues,
  };
}

// =============================================
// キーワード主役度チェック
// =============================================

/**
 * 怪異語彙（キーワードが怪異の核として機能しているか判定用）
 */
const ANOMALY_VOCAB = [
  // 視覚的異常
  '影', '姿', '顔', '目', '手', '指', '足', '形',
  // 聴覚的異常
  '声', '音', '足音', '笑い', '囁', '呼', '鳴',
  // 動作・状態
  '現れ', '消え', '立っ', '座っ', '覗', '見て', '追',
  '近づ', '離れ', '動', '止ま', '増え', '減',
  // 空間的異常
  '塞', '開', '閉', '伸び', '歪',
  // 触覚・感覚
  '触', '掴', '冷た', '温か', '重',
];

/**
 * キーワード周辺に怪異語彙があるかチェック
 * @param text テキスト
 * @param keyword キーワード
 * @param windowSize 前後何文字を見るか
 */
function hasAnomalyVocabNearKeyword(
  text: string,
  keyword: string,
  windowSize: number = 30
): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  let pos = 0;
  while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
    // キーワード周辺のテキストを抽出
    const start = Math.max(0, pos - windowSize);
    const end = Math.min(text.length, pos + keyword.length + windowSize);
    const window = text.slice(start, end);

    // 怪異語彙が含まれているかチェック
    if (ANOMALY_VOCAB.some(vocab => window.includes(vocab))) {
      return true;
    }

    pos += keyword.length;
  }

  return false;
}

/**
 * キーワード主役度チェック結果
 */
export interface KeywordFocusResult {
  isValid: boolean;
  keywordCount: number;
  hasAnomalyConnection: boolean;
  issues: string[];
}

/**
 * キーワードが物語の主役（怪異の核）になっているかチェック
 * @param text 検査対象テキスト（Phase B + Phase C）
 * @param keyword キーワード
 * @param minCount 最小出現回数（デフォルト2）
 */
export function validateKeywordFocus(
  text: string,
  keyword: string,
  minCount: number = 2
): KeywordFocusResult {
  const issues: string[] = [];

  // 1. 出現回数チェック
  const keywordCount = countKeywordOccurrences(text, keyword);
  if (keywordCount < minCount) {
    issues.push(`出現回数不足 (${keywordCount}/${minCount})`);
  }

  // 2. 怪異語彙との関連チェック
  const hasAnomalyConnection = hasAnomalyVocabNearKeyword(text, keyword);
  if (!hasAnomalyConnection) {
    issues.push('怪異語彙との関連が薄い');
  }

  // 総合判定：両方必要
  const isValid = keywordCount >= minCount && hasAnomalyConnection;

  return {
    isValid,
    keywordCount,
    hasAnomalyConnection,
    issues,
  };
}

// =============================================
// 擬音チェック
// =============================================

/**
 * 擬音パターン（カタカナ2-4文字の繰り返しや単独）
 */
const ONOMATOPOEIA_PATTERNS = [
  // 繰り返し系
  /[ァ-ヴー]{2,4}[ァ-ヴー]{2,4}/g,  // カタカナ繰り返し
  /ギシギシ|ガタガタ|カタカタ|ドンドン|トントン/gi,
  /ぺたぺた|ひたひた|ざわざわ|ぞわぞわ/gi,
  // 単発系
  /[「\s](?:ギシ|ガタ|カタ|ドン|トン|バン|ガン|パン|ザッ|ドサ|ゴト)[ッ！。、\s」]/g,
  /[「\s](?:ぺた|ひた|ざわ|ぞわ|じわ|ちり|かさ)[ッっ！。、\s」]/g,
];

/**
 * 擬音の出現回数をカウント
 */
export function countOnomatopoeia(text: string): number {
  let count = 0;

  for (const pattern of ONOMATOPOEIA_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

/**
 * 擬音チェック結果
 */
export interface OnomatopoeiaCheckResult {
  isValid: boolean;
  count: number;
  isExcessive: boolean;
}

/**
 * 擬音の過剰使用をチェック
 * @param text 検査対象テキスト
 * @param maxCount 許容する最大擬音数（デフォルト4）
 */
export function validateOnomatopoeia(
  text: string,
  maxCount: number = 4
): OnomatopoeiaCheckResult {
  const count = countOnomatopoeia(text);
  const isExcessive = count > maxCount;

  return {
    isValid: !isExcessive,
    count,
    isExcessive,
  };
}
