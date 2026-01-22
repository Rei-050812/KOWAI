export type StoryStyle = 'short' | 'medium' | 'long';

export interface Story {
  id: string;
  word: string;
  style: StoryStyle;
  title: string;
  hook: string;
  story: string;
  likes: number;
  views: number;
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
  short: '約500字。サクッと読める、オチ重視で最後の一文で急転する怪談',
  medium: '約1000字。じっくり読ませる、雰囲気と恐怖が徐々に積み重なる怪談',
  long: '約2000字。読み応えのある本格怪談、伏線や複数の展開を含む',
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
