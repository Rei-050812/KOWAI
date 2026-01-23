import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Story,
  StoryStyle,
  StoryWithScore,
  TrendWord,
  WordCount,
  KaidanBlueprintData,
  BlueprintSearchResult,
  GenerationConfig,
  FallbackReason,
} from "@/types";

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase環境変数が設定されていません");
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
  return supabase;
}

// =============================================
// ヘルパー関数
// =============================================

/**
 * DBから取得したstoryデータをStoryWithScore型に変換
 * share_count, scoreのnull対応を一元化
 */
function toStoryWithScore(data: unknown[]): StoryWithScore[] {
  return (data || []).map((story) => {
    const s = story as Record<string, unknown>;
    return {
      ...s,
      share_count: (s.share_count as number) || 0,
      score: (s.score as number) || 0,
    } as StoryWithScore;
  });
}

// 怪談を作成
export async function createStory(
  word: string,
  style: StoryStyle,
  title: string,
  hook: string,
  story: string,
  blueprintId: number | null = null,
  storyMeta: StoredStoryMeta | null = null
): Promise<Story> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("stories")
    .insert({
      word,
      style,
      title,
      hook,
      story,
      likes: 0,
      views: 0,
      blueprint_id: blueprintId,
      story_meta: storyMeta,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating story:", error);
    throw new Error("怪談の保存に失敗しました");
  }

  return data as Story;
}

// 怪談を取得（ID指定）
export async function getStoryById(id: string): Promise<Story | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching story:", error);
    throw new Error("怪談の取得に失敗しました");
  }

  return data as Story;
}

// 閲覧数をインクリメント
export async function incrementViews(id: string): Promise<void> {
  const client = getSupabaseClient();

  // RPC関数を使用（失敗時はフォールバック）
  const { error: rpcError } = await client.rpc("increment_views", { story_id: id });

  if (rpcError) {
    // RPC関数がない場合は通常のupdateを使用
    const { data } = await client
      .from("stories")
      .select("views")
      .eq("id", id)
      .single();

    if (data) {
      const { error } = await client
        .from("stories")
        .update({ views: (data.views || 0) + 1 })
        .eq("id", id);

      if (error) {
        console.error("Error incrementing views:", error);
      }
    }
  }
}

// いいねをインクリメント
export async function incrementLikes(id: string): Promise<number> {
  const client = getSupabaseClient();

  // まず現在の値を取得
  const { data: currentData } = await client
    .from("stories")
    .select("likes")
    .eq("id", id)
    .single();

  const newLikes = (currentData?.likes || 0) + 1;

  const { error } = await client
    .from("stories")
    .update({ likes: newLikes })
    .eq("id", id);

  if (error) {
    console.error("Error incrementing likes:", error);
    throw new Error("いいねに失敗しました");
  }

  return newLikes;
}

// 最新の怪談を取得
export async function getLatestStories(limit: number = 10): Promise<Story[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching latest stories:", error);
    throw new Error("怪談の取得に失敗しました");
  }

  return data as Story[];
}

// 人気の怪談を取得（いいね数順）
export async function getPopularStories(limit: number = 10): Promise<Story[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("stories")
    .select("*")
    .order("likes", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching popular stories:", error);
    throw new Error("怪談の取得に失敗しました");
  }

  return data as Story[];
}

// 単語カウントをインクリメント
export async function incrementWordCount(word: string): Promise<void> {
  const client = getSupabaseClient();

  // まず単語が存在するか確認
  const { data: existingWord } = await client
    .from("words")
    .select("*")
    .eq("word", word)
    .single();

  if (existingWord) {
    // 存在する場合はカウントを増加
    await client
      .from("words")
      .update({ count: existingWord.count + 1 })
      .eq("word", word);
  } else {
    // 存在しない場合は新規作成
    await client
      .from("words")
      .insert({ word, count: 1 });
  }
}

// 人気の単語を取得
export async function getPopularWords(limit: number = 10): Promise<WordCount[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("words")
    .select("*")
    .order("count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching popular words:", error);
    throw new Error("単語の取得に失敗しました");
  }

  return data as WordCount[];
}

// =============================================
// ランキング・カテゴリー機能
// =============================================

// 殿堂入り（7日以上経過、100閲覧以上、スコア上位50件）
export async function getHallOfFameStories(limit: number = 50): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await client
    .from("stories")
    .select("*")
    .lt("created_at", sevenDaysAgo.toISOString())
    .gte("views", 100)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching hall of fame:", error);
    throw new Error("殿堂入りの取得に失敗しました");
  }

  return toStoryWithScore(data || []);
}

// 週間ランキング（過去7日間、スコア上位20件）
export async function getWeeklyRankingStories(limit: number = 20): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await client
    .from("stories")
    .select("*")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching weekly ranking:", error);
    throw new Error("週間ランキングの取得に失敗しました");
  }

  return toStoryWithScore(data || []);
}

// 月間ランキング（過去30日間、スコア上位30件）
export async function getMonthlyRankingStories(limit: number = 30): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await client
    .from("stories")
    .select("*")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching monthly ranking:", error);
    throw new Error("月間ランキングの取得に失敗しました");
  }

  return toStoryWithScore(data || []);
}

// Hidden Gems（閲覧10-100、いいね3以上、いいね率10%以上）
export async function getHiddenGems(limit: number = 20): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("stories")
    .select("*")
    .gte("views", 10)
    .lte("views", 100)
    .gte("likes", 3)
    .order("score", { ascending: false })
    .limit(limit * 2);

  if (error) {
    console.error("Error fetching hidden gems:", error);
    throw new Error("隠れた名作の取得に失敗しました");
  }

  // いいね率10%以上でフィルタリング
  const filteredData = (data || [])
    .filter(story => (story.likes / story.views) >= 0.1)
    .slice(0, limit);

  return toStoryWithScore(filteredData);
}

// トレンド単語（24時間比較、成長率計算）
export async function getTrendingWords(limit: number = 10): Promise<TrendWord[]> {
  const client = getSupabaseClient();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // 過去24時間の単語使用
  const { data: currentData, error: currentError } = await client
    .from("word_usage_logs")
    .select("word")
    .gte("created_at", twentyFourHoursAgo.toISOString());

  if (currentError) {
    console.error("Error fetching current word usage:", currentError);
    throw new Error("トレンド単語の取得に失敗しました");
  }

  // 24-48時間前の単語使用
  const { data: previousData, error: previousError } = await client
    .from("word_usage_logs")
    .select("word")
    .gte("created_at", fortyEightHoursAgo.toISOString())
    .lt("created_at", twentyFourHoursAgo.toISOString());

  if (previousError) {
    console.error("Error fetching previous word usage:", previousError);
    throw new Error("トレンド単語の取得に失敗しました");
  }

  // 単語カウントを集計
  const currentCounts: Record<string, number> = {};
  (currentData || []).forEach(log => {
    currentCounts[log.word] = (currentCounts[log.word] || 0) + 1;
  });

  const previousCounts: Record<string, number> = {};
  (previousData || []).forEach(log => {
    previousCounts[log.word] = (previousCounts[log.word] || 0) + 1;
  });

  // 成長率を計算
  const trendWords: TrendWord[] = Object.entries(currentCounts)
    .map(([word, current_count]) => {
      const previous_count = previousCounts[word] || 0;
      const growth_rate = previous_count === 0
        ? current_count * 100
        : ((current_count - previous_count) / previous_count) * 100;
      return { word, current_count, previous_count, growth_rate };
    })
    .filter(tw => tw.growth_rate > 0)
    .sort((a, b) => b.growth_rate - a.growth_rate)
    .slice(0, limit);

  return trendWords;
}

// スタイル別の怪談を取得
export async function getStoriesByStyle(style: StoryStyle, limit: number = 20): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("style", style)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching stories by style:", error);
    throw new Error("スタイル別怪談の取得に失敗しました");
  }

  return toStoryWithScore(data || []);
}

// シェア数をインクリメント
export async function incrementShareCount(id: string): Promise<number> {
  const client = getSupabaseClient();

  // RPC関数を使用
  const { data, error } = await client.rpc("increment_share_count", { story_id: id });

  if (error) {
    console.error("Error incrementing share count (RPC):", error);
    // RPC関数がない場合はフォールバック
    const { data: currentData } = await client
      .from("stories")
      .select("share_count")
      .eq("id", id)
      .single();

    const newShareCount = (currentData?.share_count || 0) + 1;

    const { error: updateError } = await client
      .from("stories")
      .update({ share_count: newShareCount })
      .eq("id", id);

    if (updateError) {
      console.error("Error incrementing share count:", updateError);
      throw new Error("シェア数の更新に失敗しました");
    }

    return newShareCount;
  }

  return data as number;
}

// 単語使用ログを記録
export async function logWordUsage(word: string, storyId: string): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client
    .from("word_usage_logs")
    .insert({ word, story_id: storyId });

  if (error) {
    console.error("Error logging word usage:", error);
    // エラーがあっても怪談生成には影響させない
  }
}

// ランダムな怪談を取得
export async function getRandomStories(limit: number = 5): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();

  // まず総数を取得
  const { count, error: countError } = await client
    .from("stories")
    .select("*", { count: "exact", head: true });

  if (countError || !count) {
    console.error("Error counting stories:", countError);
    return [];
  }

  // ランダムなオフセットを生成
  const randomOffset = Math.floor(Math.random() * Math.max(0, count - limit));

  const { data, error } = await client
    .from("stories")
    .select("*")
    .range(randomOffset, randomOffset + limit - 1);

  if (error) {
    console.error("Error fetching random stories:", error);
    throw new Error("ランダム怪談の取得に失敗しました");
  }

  return toStoryWithScore(data || []);
}

// =============================================
// RAG Blueprint 関連（タグベース検索版）
// =============================================

/**
 * Blueprintを保存
 */
export async function saveBlueprint(
  title: string,
  tags: string[],
  blueprint: KaidanBlueprintData,
  qualityScore: number = 0
): Promise<{ id: number }> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("kaidan_blueprints")
    .insert({
      title,
      tags,
      blueprint,
      quality_score: qualityScore,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving blueprint:", error);
    throw new Error("Blueprintの保存に失敗しました");
  }

  return { id: data.id };
}

/**
 * キーワードでBlueprintを検索（タグベース）
 */
export async function matchBlueprintsByKeyword(
  keyword: string,
  matchCount: number = 3,
  minQuality: number = 0
): Promise<BlueprintSearchResult[]> {
  const client = getSupabaseClient();

  const { data, error } = await client.rpc("match_blueprints_by_keyword", {
    search_keyword: keyword,
    match_count: matchCount,
    min_quality: minQuality,
  });

  if (error) {
    console.error("Error matching blueprints:", error);
    throw new Error("Blueprintの検索に失敗しました");
  }

  // match_scoreをsimilarityに変換（互換性のため）
  return (data || []).map((item: { id: number; title: string; blueprint: KaidanBlueprintData; tags: string[]; quality_score: number; match_score: number }) => ({
    ...item,
    similarity: item.match_score / 15, // 正規化（max=15程度）
  })) as BlueprintSearchResult[];
}

/**
 * ランダムにBlueprintを取得（フォールバック用）
 */
export async function getRandomBlueprint(
  minQuality: number = 30
): Promise<BlueprintSearchResult | null> {
  const client = getSupabaseClient();

  const { data, error } = await client.rpc("get_random_blueprint", {
    min_quality: minQuality,
  });

  if (error) {
    console.error("Error getting random blueprint:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  return {
    ...data[0],
    similarity: 0.5, // ランダム取得なので中間値
  } as BlueprintSearchResult;
}

/**
 * 全Blueprintを取得（管理用）
 */
export async function getAllBlueprints(limit: number = 100): Promise<{
  id: number;
  title: string;
  tags: string[];
  quality_score: number;
  created_at: string;
}[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("kaidan_blueprints")
    .select("id, title, tags, quality_score, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching blueprints:", error);
    throw new Error("Blueprintの取得に失敗しました");
  }

  return data || [];
}

/**
 * 全Blueprintをフルデータで取得（正規化用）
 */
export async function getAllBlueprintsFull(): Promise<{
  id: number;
  title: string;
  tags: string[];
  blueprint: KaidanBlueprintData;
  quality_score: number;
  created_at: string;
}[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("kaidan_blueprints")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching full blueprints:", error);
    throw new Error("Blueprintの取得に失敗しました");
  }

  return data || [];
}

/**
 * Blueprintを更新
 */
export async function updateBlueprint(
  id: number,
  blueprint: KaidanBlueprintData,
  qualityScore: number
): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client
    .from("kaidan_blueprints")
    .update({
      blueprint,
      quality_score: qualityScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating blueprint:", error);
    throw new Error("Blueprintの更新に失敗しました");
  }
}

// =============================================
// 3フェーズ生成ログ
// =============================================

/**
 * 3フェーズ生成ログの入力データ
 */
export interface SaveGenerationLogInput {
  storyId: string;
  blueprintId: number;
  blueprintTitle: string;
  blueprintQualityScore: number;
  fallbackUsed: boolean;
  fallbackReason: FallbackReason;
  generationConfig: GenerationConfig;
  phaseAPrompt: string;
  phaseAText: string;
  phaseBPrompt: string;
  phaseBText: string;
  phaseCPrompt: string;
  phaseCText: string;
  finalStory: string;
  // バリデーション統計
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
}

/**
 * 3フェーズ生成ログを保存
 */
export async function saveGenerationLog(input: SaveGenerationLogInput): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client.from("generation_logs").insert({
    story_id: input.storyId,
    used_blueprint_id: input.blueprintId,
    used_blueprint_title: input.blueprintTitle,
    used_blueprint_quality_score: input.blueprintQualityScore,
    fallback_used: input.fallbackUsed,
    fallback_reason: input.fallbackReason,
    generation_config: input.generationConfig,
    phase_a_prompt: input.phaseAPrompt,
    phase_a_text: input.phaseAText,
    phase_b_prompt: input.phaseBPrompt,
    phase_b_text: input.phaseBText,
    phase_c_prompt: input.phaseCPrompt,
    phase_c_text: input.phaseCText,
    final_story: input.finalStory,
    // バリデーション統計
    retry_count_phase_a: input.retryCountPhaseA,
    retry_count_phase_b: input.retryCountPhaseB,
    retry_count_phase_c: input.retryCountPhaseC,
    keyword_miss_detected: input.keywordMissDetected,
    incomplete_quote_detected: input.incompleteQuoteDetected,
    // 重複除去ログ
    dedupe_applied: input.dedupeApplied,
    dedupe_target: input.dedupeTarget,
    dedupe_method: input.dedupeMethod,
    // 多様性ガードログ
    diversity_guard_triggered: input.diversityGuardTriggered,
    diversity_guard_reason: input.diversityGuardReason,
    diversity_retry_count: input.diversityRetryCount,
    // Phase C クライマックスチェック
    ending_peak_ok: input.endingPeakOk,
    ending_retry_count: input.endingRetryCount,
    // キーワード主役化チェック
    keyword_focus_ok: input.keywordFocusOk,
    keyword_focus_count: input.keywordFocusCount,
    keyword_focus_retry_count: input.keywordFocusRetryCount,
  });

  if (error) {
    console.error("Error saving generation log:", error);
    // ログ保存失敗は怪談生成には影響させない
  }
}

// =============================================
// フォールバック用Blueprint検索
// =============================================

/**
 * 緩い条件でBlueprintを検索（near フォールバック用）
 * min_qualityを下げて再検索
 */
export async function matchBlueprintsLoose(
  keyword: string,
  minQuality: number = 30
): Promise<BlueprintSearchResult[]> {
  const client = getSupabaseClient();

  const { data, error } = await client.rpc("match_blueprints_by_keyword", {
    search_keyword: keyword,
    match_count: 1,
    min_quality: minQuality,
  });

  if (error) {
    console.error("Error matching blueprints (loose):", error);
    return [];
  }

  return (data || []).map((item: { id: number; title: string; blueprint: KaidanBlueprintData; tags: string[]; quality_score: number; match_score: number }) => ({
    ...item,
    similarity: item.match_score / 15,
  })) as BlueprintSearchResult[];
}

// =============================================
// 多様性ガード用：直近のストーリーメタ取得
// =============================================

export interface StoredStoryMeta {
  setting: string;
  cast: string;
  flow: string;
}

/**
 * 直近N件のストーリーメタを取得
 */
export async function getRecentStoryMetas(limit: number = 3): Promise<StoredStoryMeta[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("stories")
    .select("story_meta")
    .not("story_meta", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent story metas:", error);
    return [];
  }

  return (data || [])
    .map((row: { story_meta: StoredStoryMeta | null }) => row.story_meta)
    .filter((meta): meta is StoredStoryMeta => meta !== null);
}
