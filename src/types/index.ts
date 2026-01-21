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
