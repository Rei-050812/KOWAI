/**
 * StyleBlueprint 合格判定ロジック
 *
 * 洒落怖の作法に反するスタイルを自動検出し、
 * 保存を拒否または警告を出す
 */

import { StyleBlueprintData, StyleValidationResult, StyleViolation } from '@/types';

// =============================================
// 違反検出パターン
// =============================================

/** 否定的コンテキストを示すパターン（これらが後に続く場合は許可） */
const NEGATIVE_CONTEXT_PATTERNS = [
  'しない', 'をしない', 'は避ける', 'を避ける', '禁止', 'はNG', 'はしない',
  'ない', 'なし', '不要', '排除', '控える', '抑える',
];

/**
 * キーワードが否定的コンテキストで使われているかチェック
 * 例: 「謎解きをしない」「説明は避ける」などはOK
 */
function isInNegativeContext(text: string, keyword: string): boolean {
  const keywordIndex = text.indexOf(keyword);
  if (keywordIndex === -1) return false;

  // キーワードの後ろ10文字を確認
  const afterKeyword = text.slice(keywordIndex + keyword.length, keywordIndex + keyword.length + 10);

  for (const pattern of NEGATIVE_CONTEXT_PATTERNS) {
    if (afterKeyword.includes(pattern)) {
      return true;
    }
  }
  return false;
}

/** 説明・解説を誘導するキーワード */
const EXPLANATION_KEYWORDS = [
  '説明する', '理由を', '原因は', '正体は', '解説', '考察',
  '分析', '真相', '謎解き', '解明', 'なぜなら', 'つまり',
];

/** オチ・結論を要求するキーワード */
const ENDING_KEYWORDS = [
  'オチ', '結論', '真相を明かす', '正体を明かす', '謎を解く',
  '種明かし', '伏線回収', 'どんでん返し', '衝撃の結末',
];

/** 感情を煽るキーワード */
const EMOTION_KEYWORDS = [
  '怖い', '恐ろしい', '不気味な', '戦慄', '震える', '恐怖',
  'ゾッと', '背筋が凍る', '鳥肌', '身の毛がよだつ',
];

/** 読者への語りかけパターン */
const READER_ADDRESS_PATTERNS = [
  '読者', 'あなた', '皆さん', 'みなさん',
  'だろう？', 'ではないか？', 'と思いませんか',
  'ご存知', '想像してみて',
];

/** 映画的・派手な表現 */
const CINEMATIC_KEYWORDS = [
  '劇的', '衝撃', 'スリリング', 'ドラマチック', '映画のような',
  'クライマックス', 'サスペンス', 'ホラー映画',
];

// =============================================
// メイン判定関数
// =============================================

/**
 * StyleBlueprintの合格判定を行う
 * @param data 検証対象のStyleBlueprintData
 * @returns 判定結果（合格/不合格、違反リスト、警告リスト）
 */
export function validateStyleBlueprint(data: StyleBlueprintData): StyleValidationResult {
  const violations: StyleViolation[] = [];
  const warnings: StyleViolation[] = [];

  // 全テキストを結合して検査
  const allFeatures = data.tone_features.join(' ');
  const allPhrases = data.sample_phrases.join(' ');
  const allProhibitions = data.style_prohibitions.join(' ');
  const allText = `${allFeatures} ${allPhrases} ${data.archetype_name}`;

  // =============================================
  // 1. 必須フィールドチェック
  // =============================================

  if (!data.archetype_name || data.archetype_name.trim().length === 0) {
    violations.push({
      rule: 'required_archetype_name',
      severity: 'error',
      detail: '流派名は必須です',
    });
  }

  if (data.tone_features.length < 2) {
    violations.push({
      rule: 'min_tone_features',
      severity: 'error',
      detail: '文体の特徴は最低2つ必要です',
    });
  }

  if (data.tone_features.length > 6) {
    warnings.push({
      rule: 'max_tone_features',
      severity: 'warning',
      detail: '文体の特徴は5つ程度が推奨です',
    });
  }

  // =============================================
  // 2. 説明・解説を誘導していないか（警告のみ）
  // =============================================

  for (const keyword of EXPLANATION_KEYWORDS) {
    if (allText.includes(keyword) && !allProhibitions.includes(keyword)) {
      if (!isInNegativeContext(allText, keyword)) {
        warnings.push({
          rule: 'no_explanation',
          severity: 'warning',
          detail: `「${keyword}」が含まれています。洒落怖では説明・解説を避けることが推奨されます`,
        });
      }
    }
  }

  // =============================================
  // 3. オチ・結論を要求していないか（警告のみ）
  // =============================================

  for (const keyword of ENDING_KEYWORDS) {
    if (allText.includes(keyword) && !allProhibitions.includes(keyword)) {
      if (!isInNegativeContext(allText, keyword)) {
        warnings.push({
          rule: 'no_ending_reveal',
          severity: 'warning',
          detail: `「${keyword}」が含まれています。洒落怖ではオチや正体明かしを避けることが推奨されます`,
        });
      }
    }
  }

  // =============================================
  // 4. 感情語が支配的でないか（警告のみ）
  // =============================================

  let emotionCount = 0;
  for (const keyword of EMOTION_KEYWORDS) {
    if (allText.includes(keyword) && !allProhibitions.includes(keyword)) {
      if (!isInNegativeContext(allText, keyword)) {
        emotionCount++;
      }
    }
  }

  if (emotionCount >= 2) {
    warnings.push({
      rule: 'no_emotion_dominance',
      severity: 'warning',
      detail: `感情語が多めです（${emotionCount}個検出）。洒落怖は淡々とした語りが基本です`,
    });
  } else if (emotionCount === 1) {
    warnings.push({
      rule: 'emotion_warning',
      severity: 'warning',
      detail: '感情語が含まれています。洒落怖では感情を抑えた語りが推奨されます',
    });
  }

  // =============================================
  // 5. 読者への語りかけがないか（警告のみ）
  // =============================================

  for (const pattern of READER_ADDRESS_PATTERNS) {
    if (allText.includes(pattern) && !allProhibitions.includes(pattern)) {
      if (!isInNegativeContext(allText, pattern)) {
        warnings.push({
          rule: 'no_reader_address',
          severity: 'warning',
          detail: `「${pattern}」が含まれています。洒落怖は体験談形式が推奨されます`,
        });
      }
    }
  }

  // =============================================
  // 6. 映画的・派手な表現がないか（警告のみ）
  // =============================================

  for (const keyword of CINEMATIC_KEYWORDS) {
    if (allText.includes(keyword) && !allProhibitions.includes(keyword)) {
      if (!isInNegativeContext(allText, keyword)) {
        warnings.push({
          rule: 'no_cinematic',
          severity: 'warning',
          detail: `「${keyword}」が含まれています。洒落怖では派手な表現を避けることが推奨されます`,
        });
      }
    }
  }

  // =============================================
  // 7. emotion_level のチェック
  // =============================================

  if (data.emotion_level > 1) {
    warnings.push({
      rule: 'emotion_level_high',
      severity: 'warning',
      detail: '感情表出レベルが高めです。洒落怖は感情を抑えた語りが基本です',
    });
  }

  // =============================================
  // 8. 禁止事項が設定されているか
  // =============================================

  if (data.style_prohibitions.length === 0) {
    warnings.push({
      rule: 'has_prohibitions',
      severity: 'warning',
      detail: '禁止事項を設定することを推奨します',
    });
  }

  // =============================================
  // 9. サンプルフレーズのチェック
  // =============================================

  if (data.sample_phrases.length < 2) {
    warnings.push({
      rule: 'min_sample_phrases',
      severity: 'warning',
      detail: 'サンプルフレーズは3つ以上あると効果的です',
    });
  }

  // サンプルフレーズに感情語が含まれていないか
  for (const keyword of EMOTION_KEYWORDS) {
    if (allPhrases.includes(keyword)) {
      violations.push({
        rule: 'no_emotion_in_samples',
        severity: 'error',
        detail: `サンプルフレーズに感情語「${keyword}」が含まれています`,
      });
    }
  }

  // =============================================
  // 結果を返す
  // =============================================

  return {
    is_valid: violations.length === 0,
    violations,
    warnings,
    normalized_data: violations.length === 0 ? data : null,
  };
}

/**
 * StyleBlueprintの類似度を計算
 * 既存のアーキタイプと重複していないかチェック用
 * @param a 比較対象1
 * @param b 比較対象2
 * @returns 類似度（0-1）
 */
export function calculateStyleSimilarity(a: StyleBlueprintData, b: StyleBlueprintData): number {
  let score = 0;
  let maxScore = 0;

  // narrator_stance の一致（重み: 20）
  maxScore += 20;
  if (a.narrator_stance === b.narrator_stance) score += 20;

  // emotion_level の近さ（重み: 15）
  maxScore += 15;
  score += 15 - Math.abs(a.emotion_level - b.emotion_level) * 5;

  // sentence_style の一致（重み: 15）
  maxScore += 15;
  if (a.sentence_style === b.sentence_style) score += 15;

  // dialogue_style の一致（重み: 10）
  maxScore += 10;
  if (a.dialogue_style === b.dialogue_style) score += 10;

  // tone_features の重複（重み: 40）
  maxScore += 40;
  const aFeatures = new Set(a.tone_features.map(f => f.toLowerCase()));
  const bFeatures = new Set(b.tone_features.map(f => f.toLowerCase()));
  let featureOverlap = 0;
  for (const f of aFeatures) {
    for (const g of bFeatures) {
      if (f.includes(g) || g.includes(f)) {
        featureOverlap++;
        break;
      }
    }
  }
  const featureScore = (featureOverlap / Math.max(aFeatures.size, bFeatures.size)) * 40;
  score += featureScore;

  return score / maxScore;
}

/**
 * 上限チェック
 * @param currentCount 現在の有効なStyleBlueprint数
 * @param maxCount 上限（デフォルト100）
 * @returns 保存可能かどうか
 */
export function canSaveStyleBlueprint(currentCount: number, maxCount: number = 100): boolean {
  return currentCount < maxCount;
}
