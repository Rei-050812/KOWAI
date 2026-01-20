export type StoryStyle = 'short' | 'medium' | 'real' | 'urban';

export interface Story {
  id: string;
  word: string;
  style: StoryStyle;
  content: string;
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
  short: '短編オチ型',
  medium: '中編雰囲気型',
  real: '実話怪談風',
  urban: '都市伝説風',
};

export const STYLE_DESCRIPTIONS: Record<StoryStyle, string> = {
  short: '約500文字。短くまとまった、ゾクッとするオチがある怪談',
  medium: '約1000文字。じっくりと恐怖が積み重なる雰囲気重視の怪談',
  real: '実際にあった話のような、リアルで生々しい怪談',
  urban: '「〇〇を見たら死ぬ」のような、広まりやすい都市伝説',
};
