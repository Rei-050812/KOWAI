export type StoryStyle = 'short' | 'medium' | 'long';

export interface Story {
  id: string;
  word: string;
  style: StoryStyle;
  title: string;
  /**
   * プレビュー用の冒頭抜粋（1-2文）
   * 一覧画面、OGP、シェアテキストで使用
   */
  hook: string;
  /**
   * 怪談の全文（Phase A+B+C）
   * hookの内容を含む完全なテキスト。詳細画面ではこれのみを表示する
   */
  story: string;
  likes: number;
  views: number;
  blueprint_id: number | null;  // 生成に使用したBlueprintのID（追跡用）
  created_at: string;
  updated_at: string;
}

export interface WordCount {
  id: string;
  word: string;
  count: number;
  updated_at: string;
}

export const STYLE_LABELS: Record<StoryStyle, string> = {
  short: '短編',
  medium: '中編',
  long: '長編',
};

export const STYLE_DESCRIPTIONS: Record<StoryStyle, string> = {
  short: '約800字。サクッと読める、オチ重視で最後の一文で急転する怪談',
  medium: '約1500字。じっくり読ませる、雰囲気と恐怖が徐々に積み重なる怪談',
  long: '約3000字。読み応えのある本格怪談、伏線や複数の展開を含む',
};

// ランキング機能用の型定義
export interface StoryWithScore extends Story {
  share_count: number;
  score: number;
}

export interface TrendWord {
  word: string;
  current_count: number;
  previous_count: number;
  growth_rate: number;
}

export interface WordUsageLog {
  id: string;
  word: string;
  story_id: string;
  created_at: string;
}

export type RankingType = 'hall_of_fame' | 'weekly' | 'monthly' | 'trending' | 'hidden_gems';

// =============================================
// RAG Blueprint 型定義
// =============================================

// Blueprintの制約条件
export interface BlueprintConstraints {
  no_explanations: boolean;      // 説明禁止
  single_anomaly_only: boolean;  // 怪異は1つだけ
  no_emotion_words: boolean;     // 感情語禁止
  no_clean_resolution: boolean;  // 綺麗な結末禁止
  daily_details_min: number;     // 日常ディテール最低数
}

// ending_mode: 落ちの強化オプション
export type EndingMode = 'open' | 'partial_explanation';

// Blueprint本体（JSON構造）
export interface KaidanBlueprintData {
  anomaly: string;                        // 怪異の核（1つだけ）
  normal_rule: string;                    // 通常時の前提
  irreversible_point: string;             // 不可逆の確定点
  reader_understands: string;             // 読者が理解できること
  reader_cannot_understand: string;       // 読者が理解できないこと
  constraints: BlueprintConstraints;      // 制約条件
  allowed_subgenres: string[];            // 許可サブジャンル
  detail_bank: string[];                  // 日常ディテールバンク
  ending_style: string;                   // 結末スタイル
  ending_mode?: EndingMode;               // 落ち強化オプション（optional）
}

// DBに保存されるBlueprint
export interface KaidanBlueprint {
  id: number;
  title: string;
  tags: string[];
  blueprint: KaidanBlueprintData;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

// 検索結果（similarity含む）
export interface BlueprintSearchResult {
  id: number;
  title: string;
  blueprint: KaidanBlueprintData;
  tags: string[];
  quality_score: number;
  similarity: number;
}

// 品質スコアの内訳（採点基準）
export interface QualityScoreBreakdown {
  single_anomaly: number;           // 0-30: 怪異は1種類のみ
  normal_rule_clarity: number;      // 0-20: 通常時の前提が明確
  irreversible_point_clarity: number; // 0-25: 不可逆の確定が明確
  no_explanations: number;          // 0-15: 説明に逃げていない
  reusability: number;              // 0-10: 別シチュに転用可能
}

// 自動採点の警告
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  deduction: number; // 減点数
}

// Blueprint保存リクエスト
export interface SaveBlueprintRequest {
  title: string;
  tags: string[];
  quality_score?: number;
  score_breakdown?: QualityScoreBreakdown; // 内訳から算出する場合
  blueprint: KaidanBlueprintData;
}

// Blueprint検索リクエスト
export interface SearchBlueprintRequest {
  query: string;
  match_count?: number;
  min_quality?: number;
}

// =============================================
// 3フェーズ生成 型定義
// =============================================

// 生成フェーズ
export type GenerationPhase = 'opening' | 'disturbance' | 'irreversible_point';

// 各フェーズの生成結果
export interface PhaseResult {
  phase: GenerationPhase;
  prompt: string;
  generated_text: string;
}

// 3フェーズ生成の設定
export interface GenerationConfig {
  topK: number;
  minQuality: number;
  model: string;
}

// フォールバック理由
export type FallbackReason = 'hit' | 'near' | 'generic' | 'random';

// Blueprint選択結果（フォールバック情報含む）
export interface BlueprintSelectionResult {
  blueprint: BlueprintSearchResult;
  fallbackUsed: boolean;
  fallbackReason: FallbackReason;
}

// 生成ログ
export interface GenerationLog {
  id: string;
  story_id: string;
  used_blueprint_id: number;
  used_blueprint_title: string;
  used_blueprint_quality_score: number;
  fallback_used: boolean;
  fallback_reason: FallbackReason;
  generation_config: GenerationConfig;
  phase_a_prompt: string;
  phase_a_text: string;
  phase_b_prompt: string;
  phase_b_text: string;
  phase_c_prompt: string;
  phase_c_text: string;
  final_story: string;
  created_at: string;
}

// =============================================
// StyleBlueprint 型定義（書き方の流派）
// =============================================

/**
 * 語りの視点・距離感
 * - distant: 客観的・距離を置いた語り
 * - involved: 当事者として巻き込まれた語り
 * - detached: 淡々と事実を述べる語り
 */
export type NarratorStance = 'distant' | 'involved' | 'detached';

/**
 * 書き方の流派データ（アーキタイプ）
 * 個々の怪談の癖ではなく、方向性を抽象化したもの
 */
export interface StyleBlueprintData {
  /** 流派名（表示用）例: "実録調", "報告書風", "ぶっきらぼう" */
  archetype_name: string;

  /** 文体の特徴（プロンプト注入用・3-5項目） */
  tone_features: string[];

  /** 語りの視点・距離感 */
  narrator_stance: NarratorStance;

  /** 感情表出のレベル（0: 完全抑制, 1: 最小限, 2: 控えめ） */
  emotion_level: 0 | 1 | 2;

  /** 文の長さ傾向 */
  sentence_style: 'short' | 'mixed' | 'flowing';

  /** 擬音・効果音の使用傾向 */
  onomatopoeia_usage: 'none' | 'minimal' | 'moderate';

  /** 会話文の傾向 */
  dialogue_style: 'rare' | 'functional' | 'natural';

  /** 禁止事項（このスタイルで特に避けるべきこと） */
  style_prohibitions: string[];

  /** サンプルフレーズ（このスタイルらしい表現例・3-5個） */
  sample_phrases: string[];
}

/**
 * DBに保存されるStyleBlueprint
 */
export interface StyleBlueprint {
  id: number;
  archetype_name: string;
  style_data: StyleBlueprintData;
  quality_score: number;
  usage_count: number;
  last_used_at: string | null;
  avg_story_rating: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * StyleBlueprint 合格判定の違反項目
 */
export interface StyleViolation {
  rule: string;
  severity: 'error' | 'warning';
  detail: string;
}

/**
 * StyleBlueprint 合格判定結果
 */
export interface StyleValidationResult {
  is_valid: boolean;
  violations: StyleViolation[];
  warnings: StyleViolation[];
  normalized_data: StyleBlueprintData | null;
}
