import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Story, StoryStyle, StoryWithScore, TrendWord, WordCount } from "@/types";

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

// 怪談を作成
export async function createStory(
  word: string,
  style: StoryStyle,
  title: string,
  hook: string,
  story: string
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

  return (data || []).map(story => ({
    ...story,
    share_count: story.share_count || 0,
    score: story.score || 0,
  })) as StoryWithScore[];
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

  return (data || []).map(story => ({
    ...story,
    share_count: story.share_count || 0,
    score: story.score || 0,
  })) as StoryWithScore[];
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

  return (data || []).map(story => ({
    ...story,
    share_count: story.share_count || 0,
    score: story.score || 0,
  })) as StoryWithScore[];
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

  return filteredData.map(story => ({
    ...story,
    share_count: story.share_count || 0,
    score: story.score || 0,
  })) as StoryWithScore[];
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

  return (data || []).map(story => ({
    ...story,
    share_count: story.share_count || 0,
    score: story.score || 0,
  })) as StoryWithScore[];
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

  return (data || []).map(story => ({
    ...story,
    share_count: story.share_count || 0,
    score: story.score || 0,
  })) as StoryWithScore[];
}
