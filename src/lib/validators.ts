/**
 * 生成テキストのバリデーション関数群
 * - Phase A 文数制限チェック
 * - Phase A 禁止語句チェック
 * - Phase A / B 類似判定
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

// =============================================
// Phase B 導入文被りチェック
// =============================================

/**
 * 導入文型パターン（Phase B 冒頭に出現したらNG）
 */
const INTRO_PATTERNS = [
  /^俺[がはも]/,
  /^私[がはも]/,
  /^僕[がはも]/,
  /^私たち[がはも]/,
  /^俺たち[がはも]/,
  /^彼[がはも]/,
  /^彼女[がはも]/,
  /^[A-Z][さんくんちゃん]?[がはも]/,
  /^会社[でのはが]/,
  /^大学[でのはが]/,
  /^学校[でのはが]/,
  /^職場[でのはが]/,
  /^バイト先[でのはが]/,
  /^勤め/,
  /^働いて/,
  /^通って/,
  /^住んで/,
  /^暮らして/,
  /^旅行[でに]/,
  /^出張[でに]/,
  /^帰省[でに]/,
];

/**
 * テキストを正規化（比較用）
 */
function normalizeText(text: string): string {
  return text
    .replace(/[\r\n]+/g, '')
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

/**
 * 先頭1文を抽出
 */
function extractFirstSentenceForCheck(text: string): string {
  const normalized = normalizeText(text);
  const match = normalized.match(/^[^。！？]+[。！？]?/);
  return match ? match[0].trim() : normalized.slice(0, 80).trim();
}

/**
 * 先頭2文を抽出
 */
function extractFirstTwoSentences(text: string): string {
  const normalized = normalizeText(text);
  const sentences = normalized.split(/(?<=[。！？])/);
  return sentences.slice(0, 2).join('').trim();
}

/**
 * 2つのテキストの類似度を計算（0-1）
 */
function calculateTextSimilarity(textA: string, textB: string): number {
  const a = normalizeText(textA).slice(0, 100);
  const b = normalizeText(textB).slice(0, 100);

  if (a.length === 0 || b.length === 0) return 0;

  const minLen = Math.min(a.length, b.length);
  let matchCount = 0;

  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) matchCount++;
  }

  return matchCount / minLen;
}

/**
 * Phase B が導入文型で始まっているかチェック
 */
function startsWithIntroPattern(text: string): boolean {
  const firstSentence = extractFirstSentenceForCheck(text);
  return INTRO_PATTERNS.some(pattern => pattern.test(firstSentence));
}

/**
 * Phase A と Phase B の先頭が類似しているかチェック
 */
function isSimilarToPhaseA(phaseA: string, phaseB: string): boolean {
  const headA = extractFirstTwoSentences(phaseA);
  const headB = extractFirstTwoSentences(phaseB);

  // 先頭1文の完全一致チェック
  const firstA = extractFirstSentenceForCheck(phaseA);
  const firstB = extractFirstSentenceForCheck(phaseB);

  if (firstA === firstB) return true;

  // 片方が片方を含む
  if (firstA.startsWith(firstB) || firstB.startsWith(firstA)) return true;

  // 類似度チェック（70%以上で類似と判定）
  const similarity = calculateTextSimilarity(headA, headB);
  return similarity >= 0.70;
}

/**
 * Phase B 重複チェック結果
 */
export interface PhaseBOverlapResult {
  isValid: boolean;
  reason: 'similar_to_phaseA' | 'intro_pattern' | null;
  details: string;
}

/**
 * Phase B の導入文被りをチェック
 * @param phaseA Phase A のテキスト
 * @param phaseB Phase B のテキスト
 * @returns 重複チェック結果
 */
export function validatePhaseBOverlap(
  phaseA: string,
  phaseB: string
): PhaseBOverlapResult {
  // 1. Phase A との類似度チェック
  if (isSimilarToPhaseA(phaseA, phaseB)) {
    const firstB = extractFirstSentenceForCheck(phaseB);
    return {
      isValid: false,
      reason: 'similar_to_phaseA',
      details: `Phase B 冒頭が Phase A と類似: "${firstB.slice(0, 30)}..."`,
    };
  }

  // 2. 導入文型パターンチェック
  if (startsWithIntroPattern(phaseB)) {
    const firstB = extractFirstSentenceForCheck(phaseB);
    return {
      isValid: false,
      reason: 'intro_pattern',
      details: `Phase B が導入文型で開始: "${firstB.slice(0, 30)}..."`,
    };
  }

  return {
    isValid: true,
    reason: null,
    details: '',
  };
}

// =============================================
// 出来事再描写チェック
// =============================================

/**
 * 動詞パターン（名詞+動詞の組み合わせを抽出）
 */
const EVENT_VERB_PATTERNS = [
  // 電話関連
  /電話[がを]?(?:鳴|掛か|かか|出|取)/,
  /電話[がを]?(?:鳴った|掛かった|かかった|出た|取った)/,
  // ドア・窓関連
  /(?:ドア|扉|玄関)[がを]?(?:開|閉|叩|ノック)/,
  /(?:ドア|扉|玄関)[がを]?(?:開いた|開けた|閉まった|閉じた|叩いた|ノックされた)/,
  /窓[がを]?(?:開|閉|割|叩)/,
  // 音関連
  /(?:音|物音|足音)[がを]?(?:聞こえ|した|鳴)/,
  /(?:チャイム|インターホン|ベル)[がを]?(?:鳴|押)/,
  // 視覚関連
  /(?:人|影|姿)[がを]?(?:見え|立っ|現れ|消え)/,
  /(?:人|影|姿)[がを]?(?:見えた|立っていた|現れた|消えた)/,
  // 車関連
  /車[がを]?(?:停|止|走|出|動)/,
  /エンジン[がを]?(?:かか|かけ|止|切)/,
  // 移動関連
  /(?:帰|戻|着|出発|出|入)/,
  // 連絡関連
  /(?:メール|LINE|メッセージ)[がを]?(?:来|届|送|受)/,
];

/**
 * 特徴的な名詞を抽出
 */
function extractKeyNouns(text: string): string[] {
  const nouns: string[] = [];

  // 特徴的な名詞パターン
  const nounPatterns = [
    /電話/g, /ドア/g, /扉/g, /玄関/g, /窓/g,
    /音/g, /物音/g, /足音/g, /声/g,
    /チャイム/g, /インターホン/g, /ベル/g,
    /人/g, /影/g, /姿/g, /顔/g,
    /車/g, /エンジン/g,
    /メール/g, /LINE/g, /メッセージ/g,
    /部屋/g, /廊下/g, /階段/g,
  ];

  for (const pattern of nounPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      nouns.push(...matches);
    }
  }

  return [...new Set(nouns)]; // 重複排除
}

/**
 * イベントパターンを抽出
 */
function extractEventPatterns(text: string): string[] {
  const events: string[] = [];

  for (const pattern of EVENT_VERB_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      events.push(match[0]);
    }
  }

  return events;
}

/**
 * 出来事再描写チェック結果
 */
export interface EventRepetitionResult {
  isValid: boolean;
  repeatedEvents: string[];
  details: string;
}

/**
 * Phase B が Phase A の出来事を再描写していないかチェック
 * @param phaseA Phase A のテキスト
 * @param phaseB Phase B のテキスト
 */
export function validateEventRepetition(
  phaseA: string,
  phaseB: string
): EventRepetitionResult {
  // Phase A のイベントパターンを抽出
  const eventsA = extractEventPatterns(phaseA);
  // Phase B の先頭部分（最初の2-3文）のイベントパターンを抽出
  const phaseBHead = extractFirstTwoSentences(phaseB);
  const eventsB = extractEventPatterns(phaseBHead);

  // 重複イベントを検出
  const repeatedEvents = eventsA.filter(eventA =>
    eventsB.some(eventB => {
      // 完全一致または含む関係
      return eventA === eventB ||
             eventA.includes(eventB) ||
             eventB.includes(eventA);
    })
  );

  if (repeatedEvents.length > 0) {
    return {
      isValid: false,
      repeatedEvents,
      details: `Phase A の出来事が Phase B で再描写: ${repeatedEvents.join(', ')}`,
    };
  }

  return {
    isValid: true,
    repeatedEvents: [],
    details: '',
  };
}

// =============================================
// 行動整合性チェック
// =============================================

/**
 * 同時に成立しない行動ペア
 */
const INCOMPATIBLE_ACTION_PAIRS: Array<[RegExp, RegExp, string]> = [
  // 運転中に両手が必要な行為
  [/運転|ハンドル|走(?:らせ|って)|車[をで]/, /双眼鏡|望遠鏡|カメラ[をで]覗/, '運転中に双眼鏡は使えない'],
  [/運転|ハンドル|走(?:らせ|って)|車[をで]/, /スマホ[をで](?:操作|見|触)/, '運転中にスマホ操作'],
  [/運転|ハンドル/, /目[をが](?:閉|つぶ|瞑)/, '運転中に目を閉じる'],
  // 逃走中に不要な行動
  [/逃|走|駆け/, /(?:ゆっくり|のんびり|落ち着いて)/, '逃走中にゆっくり'],
  [/逃|走|駆け/, /食事|食べ/, '逃走中に食事'],
  // 寝ている状態と行動
  [/寝て|眠って|就寝/, /歩|走|動/, '寝ながら移動'],
];

/**
 * 唐突な逃走・放棄を検出するパターン
 */
const ABRUPT_ESCAPE_PATTERNS = [
  // 逃走・放棄の動作
  /(?:車[をは])?(?:捨て|置い|放置し|乗り捨て)/,
  /(?:家[をは])?(?:飛び出|逃げ出)/,
  /(?:仕事[をは])?(?:放り出|投げ出)/,
  /(?:そのまま|即座に|すぐに)(?:逃|走|帰|戻)/,
];

/**
 * 危険・恐怖の前兆を示すパターン
 */
const DANGER_PRECEDING_PATTERNS = [
  // 直接的な危険
  /追(?:いかけ|ってき|われ)/,
  /襲(?:いかか|ってき|われ)/,
  /迫(?:ってき|られ)/,
  /近づ(?:いてき|かれ)/,
  // 恐怖の身体反応
  /震え|鳥肌|冷や汗|心臓|息[がを](?:止|詰|切)/,
  /動け(?:なく|ず)/,
  /声[がを](?:出せ|失)/,
  // 明確な怪異の顕在化
  /(?:それ|あれ|何か)[がは](?:見えた|聞こえた|触れた)/,
  /目[がと](?:合った|合う)/,
  /(?:こちら|俺|私)[をに](?:見て|向いて)/,
];

/**
 * 行動整合性チェック結果
 */
export interface ActionConsistencyResult {
  isValid: boolean;
  reason: 'incompatible_action' | 'abrupt_escape' | null;
  details: string;
}

/**
 * 行動の整合性をチェック
 * @param text チェック対象テキスト
 * @param previousText 前のフェーズのテキスト（オプション：逃走前兆チェック用）
 */
export function validateActionConsistency(
  text: string,
  previousText: string = ''
): ActionConsistencyResult {
  // 1. 同時に成立しない行動ペアのチェック
  for (const [pattern1, pattern2, message] of INCOMPATIBLE_ACTION_PAIRS) {
    // 同じ段落内で両方のパターンが出現するかチェック
    const paragraphs = text.split(/\n\n+/);
    for (const paragraph of paragraphs) {
      if (pattern1.test(paragraph) && pattern2.test(paragraph)) {
        return {
          isValid: false,
          reason: 'incompatible_action',
          details: message,
        };
      }
    }
  }

  // 2. 唐突な逃走・放棄のチェック
  for (const escapePattern of ABRUPT_ESCAPE_PATTERNS) {
    if (escapePattern.test(text)) {
      // 前のテキストまたは同テキスト内に危険の前兆があるかチェック
      const contextText = previousText + '\n' + text;
      const hasDangerPreceding = DANGER_PRECEDING_PATTERNS.some(
        dangerPattern => dangerPattern.test(contextText)
      );

      if (!hasDangerPreceding) {
        const match = text.match(escapePattern);
        return {
          isValid: false,
          reason: 'abrupt_escape',
          details: `唐突な逃走・放棄: "${match?.[0] || '検出'}"（危険描写が不足）`,
        };
      }
    }
  }

  return {
    isValid: true,
    reason: null,
    details: '',
  };
}

// =============================================
// Phase A 文数制限チェック
// =============================================

/**
 * Phase A 禁止語句パターン
 * - 感想: 不思議な、奇妙な、違和感、気になる 等
 * - 予告: まさか〜とは、後に〜、この時はまだ〜 等
 * - 未来視点: 〜とは思わなかった、〜とは知らなかった 等
 * - 不穏さの示唆: 何かが、妙に、いつもと違う 等
 * - 心情描写: 嫌な予感、落ち着かない、気が重い 等
 */
const PHASE_A_FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  // 予告・未来視点
  { pattern: /まさか.{0,20}とは/, category: '予告' },
  { pattern: /この時はまだ/, category: '予告' },
  { pattern: /後に.{0,10}(?:なる|起き|分か)/, category: '予告' },
  { pattern: /とは(?:思わなかった|知らなかった|気づかなかった)/, category: '未来視点' },
  { pattern: /(?:あんな|こんな)ことになる/, category: '予告' },
  { pattern: /(?:思い|知り)もしなかった/, category: '未来視点' },

  // 感想・不穏さの示唆
  { pattern: /不思議(?:な|に|と)/, category: '感想' },
  { pattern: /奇妙(?:な|に|と)/, category: '感想' },
  { pattern: /違和感/, category: '感想' },
  { pattern: /気になる/, category: '感想' },
  { pattern: /何かが(?:おかしい|違う)/, category: '不穏' },
  { pattern: /妙(?:な|に)/, category: '不穏' },
  { pattern: /いつもと(?:違う|異なる)/, category: '不穏' },
  { pattern: /(?:どこか|なんとなく).{0,5}(?:変|おかしい|違和感)/, category: '不穏' },

  // 心情描写
  { pattern: /嫌な予感/, category: '心情' },
  { pattern: /落ち着かない/, category: '心情' },
  { pattern: /気が重い/, category: '心情' },
  { pattern: /胸騒ぎ/, category: '心情' },
  { pattern: /不安(?:な|に|を)/, category: '心情' },
  { pattern: /怖(?:い|かった|く)/, category: '心情' },

  // 形容詞による雰囲気付け
  { pattern: /不気味(?:な|に)/, category: '雰囲気' },
  { pattern: /薄暗い/, category: '雰囲気' },
  { pattern: /薄気味悪い/, category: '雰囲気' },
  { pattern: /(?:ひっそり|しん)と(?:静|し)/, category: '雰囲気' },
];

/**
 * 文を句点で分割して文数をカウント
 */
function countSentences(text: string): number {
  const normalized = text.trim();
  if (normalized.length === 0) return 0;

  // 句点（。！？）で分割
  const sentences = normalized.split(/[。！？]+/).filter(s => s.trim().length > 0);

  // 最後が句点で終わらない場合も1文としてカウント
  if (sentences.length === 0 && normalized.length > 0) {
    return 1;
  }

  return sentences.length;
}

/**
 * Phase A 文数制限チェック結果
 */
export interface PhaseASentenceCheckResult {
  isValid: boolean;
  sentenceCount: number;
  details: string;
}

/**
 * Phase A が1文以内かチェック
 * @param text Phase A のテキスト
 * @returns 文数チェック結果
 */
export function validatePhaseASentenceCount(text: string): PhaseASentenceCheckResult {
  const sentenceCount = countSentences(text);

  if (sentenceCount > 1) {
    return {
      isValid: false,
      sentenceCount,
      details: `Phase A が${sentenceCount}文あります（最大1文）`,
    };
  }

  return {
    isValid: true,
    sentenceCount,
    details: '',
  };
}

/**
 * Phase A 禁止語句チェック結果
 */
export interface PhaseAForbiddenCheckResult {
  isValid: boolean;
  forbiddenWords: Array<{ word: string; category: string }>;
  details: string;
}

/**
 * Phase A に禁止語句が含まれていないかチェック
 * @param text Phase A のテキスト
 * @returns 禁止語句チェック結果
 */
export function validatePhaseAForbiddenWords(text: string): PhaseAForbiddenCheckResult {
  const forbiddenWords: Array<{ word: string; category: string }> = [];

  for (const { pattern, category } of PHASE_A_FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      forbiddenWords.push({ word: match[0], category });
    }
  }

  if (forbiddenWords.length > 0) {
    const details = forbiddenWords
      .map(fw => `「${fw.word}」(${fw.category})`)
      .join(', ');
    return {
      isValid: false,
      forbiddenWords,
      details: `Phase A に禁止語句: ${details}`,
    };
  }

  return {
    isValid: true,
    forbiddenWords: [],
    details: '',
  };
}

/**
 * Phase A 総合バリデーション結果
 */
export interface PhaseAValidationResult {
  isValid: boolean;
  sentenceCheck: PhaseASentenceCheckResult;
  forbiddenCheck: PhaseAForbiddenCheckResult;
  reason: 'sentence_count' | 'forbidden_word' | null;
  details: string;
}

/**
 * Phase A 総合バリデーション
 * @param text Phase A のテキスト
 * @returns 総合バリデーション結果
 */
export function validatePhaseA(text: string): PhaseAValidationResult {
  const sentenceCheck = validatePhaseASentenceCount(text);
  const forbiddenCheck = validatePhaseAForbiddenWords(text);

  // 文数制限を優先
  if (!sentenceCheck.isValid) {
    return {
      isValid: false,
      sentenceCheck,
      forbiddenCheck,
      reason: 'sentence_count',
      details: sentenceCheck.details,
    };
  }

  if (!forbiddenCheck.isValid) {
    return {
      isValid: false,
      sentenceCheck,
      forbiddenCheck,
      reason: 'forbidden_word',
      details: forbiddenCheck.details,
    };
  }

  return {
    isValid: true,
    sentenceCheck,
    forbiddenCheck,
    reason: null,
    details: '',
  };
}

// =============================================
// Phase A / B 類似判定（強化版）
// =============================================

/**
 * Phase B 禁止開始パターン（Phase A の再掲を検出）
 * - 主語＋状態動詞
 * - 場所・設定の説明文
 */
const PHASE_B_FORBIDDEN_START_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // 状態動詞での開始（Phase A と同じ文型になりやすい）
  { pattern: /^.{0,20}(?:だった|であった|ていた|にいた|であり)/, description: '状態動詞での開始' },

  // 場所の再説明
  { pattern: /^(?:その|この|あの)(?:アパート|マンション|家|部屋|会社|学校|道|場所)(?:は|には|では|で)/, description: '場所の再説明' },

  // 設定の再説明
  { pattern: /^(?:そこ|ここ|あそこ)(?:は|には|では)/, description: '設定の再説明' },
];

/**
 * Phase A / B 類似判定結果（強化版）
 */
export interface PhaseABSimilarityResult {
  isValid: boolean;
  reason: 'high_similarity' | 'forbidden_start' | 'same_subject' | null;
  similarity: number;
  details: string;
}

/**
 * 主語を抽出
 */
function extractSubject(text: string): string | null {
  const normalized = normalizeText(text);
  // 最初の助詞までを主語とみなす
  const match = normalized.match(/^([^はがもを]{1,20})[はがもを]/);
  return match ? match[1] : null;
}

/**
 * Phase A / B の類似度を詳細にチェック（強化版）
 * @param phaseA Phase A のテキスト
 * @param phaseB Phase B のテキスト
 * @returns 類似判定結果
 */
export function validatePhaseABSimilarity(
  phaseA: string,
  phaseB: string
): PhaseABSimilarityResult {
  const headA = extractFirstSentenceForCheck(phaseA);
  const headB = extractFirstSentenceForCheck(phaseB);

  // 1. 完全一致または高い類似度
  const similarity = calculateTextSimilarity(headA, headB);
  if (similarity >= 0.6) {
    return {
      isValid: false,
      reason: 'high_similarity',
      similarity,
      details: `Phase A と Phase B の冒頭が高い類似度 (${Math.round(similarity * 100)}%)`,
    };
  }

  // 2. 禁止開始パターン
  for (const { pattern, description } of PHASE_B_FORBIDDEN_START_PATTERNS) {
    if (pattern.test(phaseB.trim())) {
      return {
        isValid: false,
        reason: 'forbidden_start',
        similarity,
        details: `Phase B が禁止パターンで開始: ${description}`,
      };
    }
  }

  // 3. 同じ主語で開始
  const subjectA = extractSubject(phaseA);
  const subjectB = extractSubject(phaseB);
  if (subjectA && subjectB && subjectA === subjectB) {
    // Phase A と Phase B が同じ主語で始まる場合
    // ただし「私」「俺」などの一般的な一人称は許容
    const commonFirstPersons = ['私', '俺', '僕', '自分'];
    if (!commonFirstPersons.includes(subjectA)) {
      return {
        isValid: false,
        reason: 'same_subject',
        similarity,
        details: `Phase A と Phase B が同じ主語「${subjectA}」で開始`,
      };
    }
  }

  return {
    isValid: true,
    reason: null,
    similarity,
    details: '',
  };
}
