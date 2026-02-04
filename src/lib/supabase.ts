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

export function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase迺ｰ蠅・・ｽ・ｽ謨ｰ縺瑚ｨｭ螳壹＆繧後※縺・・ｽ・ｽ縺帙ｓ");
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
  return supabase;
}

// =============================================
// 繝倥Ν繝托ｿｽE髢｢謨ｰ
// =============================================

/**
 * DB縺九ｉ蜿門ｾ励＠縺殱tory繝・・ｽE繧ｿ繧担toryWithScore蝙九↓螟画鋤
 * share_count, score縺ｮnull蟇ｾ蠢懊ｒ荳蜈・・ｽ・ｽ
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

// 諤ｪ隲・・ｽ・ｽ菴懶ｿｽE
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
    throw new Error("諤ｪ隲・・ｽE菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return data as Story;
}

// 諤ｪ隲・・ｽ・ｽ蜿門ｾ暦ｼ・D謖・・ｽ・ｽ・・
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
    throw new Error("諤ｪ隲・・ｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return data as Story;
}

// 髢ｲ隕ｧ謨ｰ繧偵う繝ｳ繧ｯ繝ｪ繝｡繝ｳ繝・
export async function incrementViews(id: string): Promise<void> {
  const client = getSupabaseClient();

  // RPC髢｢謨ｰ繧剃ｽｿ逕ｨ・ｽE・ｽ螟ｱ謨玲凾縺ｯ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・ｽE・ｽE
  const { error: rpcError } = await client.rpc("increment_views", { story_id: id });

  if (rpcError) {
    // RPC髢｢謨ｰ縺後↑縺・・ｽ・ｽ蜷茨ｿｽE騾壼ｸｸ縺ｮupdate繧剃ｽｿ逕ｨ
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

// 縺・・ｽ・ｽ縺ｭ繧偵う繝ｳ繧ｯ繝ｪ繝｡繝ｳ繝・
export async function incrementLikes(id: string): Promise<number> {
  const client = getSupabaseClient();

  // 縺ｾ縺夂樟蝨ｨ縺ｮ蛟､繧貞叙蠕・
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
    throw new Error("縺・・ｽ・ｽ縺ｭ縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
  }

  return newLikes;
}

// 譛譁ｰ縺ｮ諤ｪ隲・・ｽ・ｽ蜿門ｾ・
export async function getLatestStories(limit: number = 10): Promise<Story[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching latest stories:", error);
    throw new Error("諤ｪ隲・・ｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return data as Story[];
}

// 莠ｺ豌暦ｿｽE諤ｪ隲・・ｽ・ｽ蜿門ｾ暦ｼ医＞縺・・ｽE謨ｰ鬆・・ｽ・ｽE
export async function getPopularStories(limit: number = 10): Promise<Story[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("is_visible", true)
    .order("likes", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching popular stories:", error);
    throw new Error("諤ｪ隲・・ｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return data as Story[];
}

// 蜊倩ｪ槭き繧ｦ繝ｳ繝医ｒ繧､繝ｳ繧ｯ繝ｪ繝｡繝ｳ繝・
export async function incrementWordCount(word: string): Promise<void> {
  const client = getSupabaseClient();

  // 縺ｾ縺壼腰隱槭′蟄伜惠縺吶ｋ縺狗｢ｺ隱・
  const { data: existingWord } = await client
    .from("words")
    .select("*")
    .eq("word", word)
    .single();

  if (existingWord) {
    // 蟄伜惠縺吶ｋ蝣ｴ蜷茨ｿｽE繧ｫ繧ｦ繝ｳ繝医ｒ蠅怜刈
    await client
      .from("words")
      .update({ count: existingWord.count + 1 })
      .eq("word", word);
  } else {
    // 蟄伜惠縺励↑縺・・ｽ・ｽ蜷茨ｿｽE譁ｰ隕丈ｽ懶ｿｽE
    await client
      .from("words")
      .insert({ word, count: 1 });
  }
}

// 莠ｺ豌暦ｿｽE蜊倩ｪ槭ｒ蜿門ｾ・
export async function getPopularWords(limit: number = 10): Promise<WordCount[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("words")
    .select("*")
    .order("count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching popular words:", error);
    throw new Error("蜊倩ｪ橸ｿｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return data as WordCount[];
}

// =============================================
// 繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ繝ｻ繧ｫ繝・・ｽ・ｽ繝ｪ繝ｼ讖滂ｿｽE
// =============================================

// 谿ｿ蝣ゑｿｽE繧奇ｼ・譌･莉･荳顔ｵ碁℃縲・00髢ｲ隕ｧ莉･荳翫√せ繧ｳ繧｢荳贋ｽ・0莉ｶ・ｽE・ｽE
export async function getHallOfFameStories(limit: number = 50): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("is_visible", true)
    .lt("created_at", sevenDaysAgo.toISOString())
    .gte("views", 100)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching hall of fame:", error);
    throw new Error("谿ｿ蝣ゑｿｽE繧奇ｿｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return toStoryWithScore(data || []);
}

// 騾ｱ髢薙Λ繝ｳ繧ｭ繝ｳ繧ｰ・ｽE・ｽ驕主悉7譌･髢薙√せ繧ｳ繧｢荳贋ｽ・0莉ｶ・ｽE・ｽE
export async function getWeeklyRankingStories(limit: number = 20): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("is_visible", true)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching weekly ranking:", error);
    throw new Error("騾ｱ髢薙Λ繝ｳ繧ｭ繝ｳ繧ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return toStoryWithScore(data || []);
}

// 譛磯俣繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ・ｽE・ｽ驕主悉30譌･髢薙√せ繧ｳ繧｢荳贋ｽ・0莉ｶ・ｽE・ｽE
export async function getMonthlyRankingStories(limit: number = 30): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("is_visible", true)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching monthly ranking:", error);
    throw new Error("譛磯俣繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return toStoryWithScore(data || []);
}

// Hidden Gems・ｽE・ｽ髢ｲ隕ｧ10-100縲√＞縺・・ｽE3莉･荳翫√＞縺・・ｽE邇・0%莉･荳奇ｼ・
export async function getHiddenGems(limit: number = 20): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("is_visible", true)
    .gte("views", 10)
    .lte("views", 100)
    .gte("likes", 3)
    .order("score", { ascending: false })
    .limit(limit * 2);

  if (error) {
    console.error("Error fetching hidden gems:", error);
    throw new Error("髫繧後◆蜷堺ｽ懶ｿｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  // 縺・・ｽ・ｽ縺ｭ邇・0%莉･荳翫〒繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
  const filteredData = (data || [])
    .filter(story => (story.likes / story.views) >= 0.1)
    .slice(0, limit);

  return toStoryWithScore(filteredData);
}

// 繝医Ξ繝ｳ繝牙腰隱橸ｼ・4譎る俣豈碑ｼ・・ｽ・ｽ・ｽE髟ｷ邇・・ｽ・ｽ邂暦ｼ・
export async function getTrendingWords(limit: number = 10): Promise<TrendWord[]> {
  const client = getSupabaseClient();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // 驕主悉24譎る俣縺ｮ蜊倩ｪ樔ｽｿ逕ｨ
  const { data: currentData, error: currentError } = await client
    .from("word_usage_logs")
    .select("word")
    .gte("created_at", twentyFourHoursAgo.toISOString());

  if (currentError) {
    console.error("Error fetching current word usage:", currentError);
    throw new Error("繝医Ξ繝ｳ繝牙腰隱橸ｿｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  // 24-48譎る俣蜑搾ｿｽE蜊倩ｪ樔ｽｿ逕ｨ
  const { data: previousData, error: previousError } = await client
    .from("word_usage_logs")
    .select("word")
    .gte("created_at", fortyEightHoursAgo.toISOString())
    .lt("created_at", twentyFourHoursAgo.toISOString());

  if (previousError) {
    console.error("Error fetching previous word usage:", previousError);
    throw new Error("繝医Ξ繝ｳ繝牙腰隱橸ｿｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  // 蜊倩ｪ槭き繧ｦ繝ｳ繝医ｒ髮・・ｽ・ｽE
  const currentCounts: Record<string, number> = {};
  (currentData || []).forEach(log => {
    currentCounts[log.word] = (currentCounts[log.word] || 0) + 1;
  });

  const previousCounts: Record<string, number> = {};
  (previousData || []).forEach(log => {
    previousCounts[log.word] = (previousCounts[log.word] || 0) + 1;
  });

  // 謌宣聞邇・・ｽ・ｽ險育ｮ・
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

// 繧ｹ繧ｿ繧､繝ｫ蛻･縺ｮ諤ｪ隲・・ｽ・ｽ蜿門ｾ・
export async function getStoriesByStyle(style: StoryStyle, limit: number = 20): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("is_visible", true)
    .eq("style", style)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching stories by style:", error);
    throw new Error("繧ｹ繧ｿ繧､繝ｫ蛻･諤ｪ隲・・ｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return toStoryWithScore(data || []);
}

// 繧ｷ繧ｧ繧｢謨ｰ繧偵う繝ｳ繧ｯ繝ｪ繝｡繝ｳ繝・
export async function incrementShareCount(id: string): Promise<number> {
  const client = getSupabaseClient();

  // RPC髢｢謨ｰ繧剃ｽｿ逕ｨ
  const { data, error } = await client.rpc("increment_share_count", { story_id: id });

  if (error) {
    console.error("Error incrementing share count (RPC):", error);
    // RPC髢｢謨ｰ縺後↑縺・・ｽ・ｽ蜷茨ｿｽE繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
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
      throw new Error("繧ｷ繧ｧ繧｢謨ｰ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
    }

    return newShareCount;
  }

  return data as number;
}

// 蜊倩ｪ樔ｽｿ逕ｨ繝ｭ繧ｰ繧定ｨ倬鹸
export async function logWordUsage(word: string, storyId: string): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client
    .from("word_usage_logs")
    .insert({ word, story_id: storyId });

  if (error) {
    console.error("Error logging word usage:", error);
    // 繧ｨ繝ｩ繝ｼ縺後≠縺｣縺ｦ繧よｪ隲・・ｽ・ｽ謌舌↓縺ｯ蠖ｱ髻ｿ縺輔○縺ｪ縺・
  }
}

// 繝ｩ繝ｳ繝繝縺ｪ諤ｪ隲・・ｽ・ｽ蜿門ｾ・
export async function getRandomStories(limit: number = 5): Promise<StoryWithScore[]> {
  const client = getSupabaseClient();

  // 縺ｾ縺夂ｷ乗焚繧貞叙蠕・
  const { count, error: countError } = await client
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("is_visible", true);

  if (countError || !count) {
    console.error("Error counting stories:", countError);
    return [];
  }

  // 繝ｩ繝ｳ繝繝縺ｪ繧ｪ繝輔そ繝・・ｽ・ｽ繧堤函謌・
  const randomOffset = Math.floor(Math.random() * Math.max(0, count - limit));

  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("is_visible", true)
    .range(randomOffset, randomOffset + limit - 1);

  if (error) {
    console.error("Error fetching random stories:", error);
    throw new Error("繝ｩ繝ｳ繝繝諤ｪ隲・・ｽE蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return toStoryWithScore(data || []);
}

// =============================================
// RAG Blueprint 髢｢騾｣・ｽE・ｽ繧ｿ繧ｰ繝呻ｿｽE繧ｹ讀懃ｴ｢迚茨ｼ・
// =============================================

/**
 * Blueprint繧剃ｿ晏ｭ・
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
    throw new Error("Blueprint縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return { id: data.id };
}

/**
 * 繧ｭ繝ｼ繝ｯ繝ｼ繝峨〒Blueprint繧呈､懃ｴ｢・ｽE・ｽ繧ｿ繧ｰ繝呻ｿｽE繧ｹ・ｽE・ｽE
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
    throw new Error("Blueprint縺ｮ讀懃ｴ｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
  }

  // match_score繧痴imilarity縺ｫ螟画鋤・ｽE・ｽ莠呈鋤諤ｧ縺ｮ縺溘ａ・ｽE・ｽE
  return (data || []).map((item: { id: number; title: string; blueprint: KaidanBlueprintData; tags: string[]; quality_score: number; match_score: number }) => ({
    ...item,
    similarity: item.match_score / 15, // 豁｣隕丞喧・ｽE・ｽEax=15遞句ｺｦ・ｽE・ｽE
  })) as BlueprintSearchResult[];
}

/**
 * 繝ｩ繝ｳ繝繝縺ｫBlueprint繧貞叙蠕暦ｼ医ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ逕ｨ・ｽE・ｽE
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
    similarity: 0.5, // 繝ｩ繝ｳ繝繝蜿門ｾ励↑縺ｮ縺ｧ荳ｭ髢灘､
  } as BlueprintSearchResult;
}

/**
 * 蜈ｨBlueprint繧貞叙蠕暦ｼ育ｮ｡逅・・ｽ・ｽ・ｽE・ｽE
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
    throw new Error("Blueprint縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return data || [];
}

/**
 * 蜈ｨBlueprint繧偵ヵ繝ｫ繝・・ｽE繧ｿ縺ｧ蜿門ｾ暦ｼ域ｭ｣隕丞喧逕ｨ・ｽE・ｽE
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
    throw new Error("Blueprint縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
  }

  return data || [];
}

/**
 * Blueprint繧呈峩譁ｰ
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
    throw new Error("Blueprint縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
  }
}

/**
 * Blueprintを削除
 */
export async function deleteKaidanBlueprint(id: number): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("kaidan_blueprints")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting blueprint:", error);
    throw new Error("Blueprintの削除に失敗しました");
  }
}

// =============================================
// 3繝輔ぉ繝ｼ繧ｺ逕滂ｿｽE繝ｭ繧ｰ
// =============================================

/**
 * 3繝輔ぉ繝ｼ繧ｺ逕滂ｿｽE繝ｭ繧ｰ縺ｮ蜈･蜉帙ョ繝ｼ繧ｿ
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
  // 繝舌Μ繝・・ｽE繧ｷ繝ｧ繝ｳ邨ｱ險・
  retryCountPhaseA: number;
  retryCountPhaseB: number;
  retryCountPhaseC: number;
  keywordMissDetected: boolean;
  incompleteQuoteDetected: boolean;
  // 驥崎､・・ｽ・ｽ蜴ｻ繝ｭ繧ｰ
  dedupeApplied: boolean;
  dedupeTarget: 'A-B' | 'B-C' | null;
  dedupeMethod: 'trim_head' | null;
  // 螟壽ｧ俶ｧ繧ｬ繝ｼ繝峨Ο繧ｰ
  diversityGuardTriggered: boolean;
  diversityGuardReason: string | null;
  diversityRetryCount: number;
  // Phase C 繧ｯ繝ｩ繧､繝槭ャ繧ｯ繧ｹ繝√ぉ繝・・ｽ・ｽ
  endingPeakOk: boolean;
  endingRetryCount: number;
  // 繧ｭ繝ｼ繝ｯ繝ｼ繝我ｸｻ蠖ｹ蛹悶メ繧ｧ繝・・ｽ・ｽ
  keywordFocusOk: boolean;
  keywordFocusCount: number;
  keywordFocusRetryCount: number;
  // StyleBlueprint（書き方の流派）
  styleBlueprintId?: number | null;
  styleBlueprintName?: string | null;
}

/**
 * 3繝輔ぉ繝ｼ繧ｺ逕滂ｿｽE繝ｭ繧ｰ繧剃ｿ晏ｭ・
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
    // 繝舌Μ繝・・ｽE繧ｷ繝ｧ繝ｳ邨ｱ險・
    retry_count_phase_a: input.retryCountPhaseA,
    retry_count_phase_b: input.retryCountPhaseB,
    retry_count_phase_c: input.retryCountPhaseC,
    keyword_miss_detected: input.keywordMissDetected,
    incomplete_quote_detected: input.incompleteQuoteDetected,
    // 驥崎､・・ｽ・ｽ蜴ｻ繝ｭ繧ｰ
    dedupe_applied: input.dedupeApplied,
    dedupe_target: input.dedupeTarget,
    dedupe_method: input.dedupeMethod,
    // 螟壽ｧ俶ｧ繧ｬ繝ｼ繝峨Ο繧ｰ
    diversity_guard_triggered: input.diversityGuardTriggered,
    diversity_guard_reason: input.diversityGuardReason,
    diversity_retry_count: input.diversityRetryCount,
    // Phase C 繧ｯ繝ｩ繧､繝槭ャ繧ｯ繧ｹ繝√ぉ繝・・ｽ・ｽ
    ending_peak_ok: input.endingPeakOk,
    ending_retry_count: input.endingRetryCount,
    // 繧ｭ繝ｼ繝ｯ繝ｼ繝我ｸｻ蠖ｹ蛹悶メ繧ｧ繝・・ｽ・ｽ
    keyword_focus_ok: input.keywordFocusOk,
    keyword_focus_count: input.keywordFocusCount,
    keyword_focus_retry_count: input.keywordFocusRetryCount,
    // StyleBlueprint（書き方の流派）
    style_blueprint_id: input.styleBlueprintId || null,
    style_blueprint_name: input.styleBlueprintName || null,
  });

  if (error) {
    console.error("Error saving generation log:", error);
    // 繝ｭ繧ｰ菫晏ｭ伜､ｱ謨暦ｿｽE諤ｪ隲・・ｽ・ｽ謌舌↓縺ｯ蠖ｱ髻ｿ縺輔○縺ｪ縺・
  }
}

// =============================================
// 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ逕ｨBlueprint讀懃ｴ｢
// =============================================

/**
 * 邱ｩ縺・・ｽ・ｽ莉ｶ縺ｧBlueprint繧呈､懃ｴ｢・ｽE・ｽEear 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ逕ｨ・ｽE・ｽE
 * min_quality繧剃ｸ九￡縺ｦ蜀肴､懃ｴ｢
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
// 螟壽ｧ俶ｧ繧ｬ繝ｼ繝臥畑・ｽE・ｽ逶ｴ霑托ｿｽE繧ｹ繝茨ｿｽE繝ｪ繝ｼ繝｡繧ｿ蜿門ｾ・
// =============================================

export interface StoredStoryMeta {
  setting: string;
  cast: string;
  flow: string;
  notableNouns?: string[];
}

/**
 * 逶ｴ霑鮮莉ｶ縺ｮ繧ｹ繝茨ｿｽE繝ｪ繝ｼ繝｡繧ｿ繧貞叙蠕・
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

// =============================================
// Admin review helpers
// =============================================

export interface AdminReviewQueueItem {
  log_id?: string;
  story_id: string;
  title?: string;
  hook?: string;
  story?: string;
  final_story?: string;
  story_text?: string;
  created_at: string;
  blueprint_id: number | null;
  target_length?: string;
  ending_type?: string | null;
  priority?: number;
  event_repetition_detected?: boolean;
  action_consistency_issue?: boolean;
  quote_incomplete_detected?: boolean;
  coherence_issue?: boolean;
  retry_total?: number;
  fallback_reason?: string;
  is_visible?: boolean;
}

export type AdminQueueType = "priority" | "all" | "random";

export async function getAdminReviewQueue(
  limit: number = 50
): Promise<AdminReviewQueueItem[]> {
  return getAdminReviewQueueByType("priority", limit);
}

export async function getAdminReviewQueueByType(
  queueType: AdminQueueType,
  limit: number = 50
): Promise<AdminReviewQueueItem[]> {
  const client = getSupabaseClient();
  const viewName =
    queueType === "all"
      ? "admin_all_queue"
      : queueType === "random"
      ? "admin_random_queue"
      : "admin_review_queue";

  let query = client.from(viewName).select("*").limit(limit);
  if (queueType === "priority") {
    query = query.order("priority", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching admin review queue:", error);
    throw new Error("レビュー一覧の取得に失敗しました");
  }

  return (data || []) as AdminReviewQueueItem[];
}

export async function saveStoryReview(input: {
  storyId: string;
  rating: number | null;
  issues: string[];
  note: string | null;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from("story_reviews").upsert(
    {
      story_id: input.storyId,
      rating: input.rating,
      issues: input.issues,
      note: input.note,
    },
    { onConflict: "story_id" }
  );

  if (error) {
    console.error("Error saving story review:", error);
    throw new Error("レビューの保存に失敗しました");
  }
}

// =============================================
// StyleBlueprint 関連
// =============================================

import { StyleBlueprint, StyleBlueprintData } from "@/types";

/**
 * StyleBlueprint を選択（複合スコア順で上位から取得）
 * 最近使われていない＋高評価＋高品質を優先
 */
export async function selectStyleBlueprint(): Promise<StyleBlueprint | null> {
  const client = getSupabaseClient();

  const { data, error } = await client.rpc("select_style_blueprint");

  if (error) {
    console.error("Error selecting style blueprint:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // 上位3件からランダム選択（多様性確保）
  const top3 = data.slice(0, Math.min(3, data.length));
  const selected = top3[Math.floor(Math.random() * top3.length)];

  return {
    id: selected.id,
    archetype_name: selected.archetype_name,
    style_data: selected.style_data as StyleBlueprintData,
    quality_score: selected.quality_score,
    usage_count: selected.usage_count,
    last_used_at: selected.last_used_at,
    avg_story_rating: selected.avg_story_rating,
    is_active: true,
    created_at: "",
    updated_at: "",
  };
}

/**
 * StyleBlueprint の使用を記録
 */
export async function recordStyleBlueprintUsage(styleId: number): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client.rpc("record_style_blueprint_usage", {
    p_style_id: styleId,
  });

  if (error) {
    console.error("Error recording style blueprint usage:", error);
    // 使用記録の失敗は生成には影響させない
  }
}

/**
 * 低評価ストーリーの情報を取得（悪い例 + メモ）
 */
export interface LowRatedStoryInfo {
  excerpt: string;  // 文章の抜粋（冒頭・中盤・終盤）
  note: string | null;  // レビューメモ
}

/**
 * 低評価ストーリーの抜粋とメモを取得（悪い例として使用）
 * @param styleId StyleBlueprintのID
 * @param maxRating この評価以下を「低評価」とみなす（デフォルト: 2）
 * @param limit 取得件数
 */
export async function getLowRatedStoryExcerpts(
  styleId: number,
  maxRating: number = 2,
  limit: number = 2
): Promise<LowRatedStoryInfo[]> {
  const client = getSupabaseClient();

  // Step 1: generation_logsからstyle_blueprint_idに紐づくstory_idを取得
  const { data: logData, error: logError } = await client
    .from("generation_logs")
    .select("story_id")
    .eq("style_blueprint_id", styleId);

  if (logError || !logData || logData.length === 0) {
    return [];
  }

  const storyIds = logData.map((log) => log.story_id).filter(Boolean);
  if (storyIds.length === 0) {
    return [];
  }

  // Step 2: 低評価レビューがあるストーリーを取得（メモも含む）
  const { data: reviewData, error: reviewError } = await client
    .from("story_reviews")
    .select("story_id, note")
    .in("story_id", storyIds)
    .lte("rating", maxRating)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (reviewError || !reviewData || reviewData.length === 0) {
    return [];
  }

  const lowRatedStoryIds = reviewData.map((r) => r.story_id);
  const noteMap = new Map(reviewData.map((r) => [r.story_id, r.note]));

  // Step 3: ストーリー本文を取得
  const { data: storyData, error: storyError } = await client
    .from("stories")
    .select("id, story")
    .in("id", lowRatedStoryIds);

  if (storyError || !storyData) {
    return [];
  }

  // ストーリーから複数箇所の抜粋を取得（冒頭・中盤・終盤）
  return storyData
    .map((row) => {
      const story = row.story;
      if (!story || story.length < 100) return null;

      const excerpts: string[] = [];
      const excerptLen = 100;

      // 冒頭100文字
      excerpts.push(story.slice(0, excerptLen));

      // 中盤100文字（全体の40-60%あたり）
      if (story.length > excerptLen * 2) {
        const midStart = Math.floor(story.length * 0.4);
        excerpts.push(story.slice(midStart, midStart + excerptLen));
      }

      // 終盤100文字（最後から100文字）
      if (story.length > excerptLen * 3) {
        excerpts.push(story.slice(-excerptLen));
      }

      return {
        excerpt: excerpts.join(" ... "),
        note: noteMap.get(row.id) || null,
      };
    })
    .filter((info): info is LowRatedStoryInfo => info !== null);
}

/**
 * StyleBlueprint を保存
 */
export async function saveStyleBlueprint(
  data: StyleBlueprintData,
  qualityScore: number = 70
): Promise<{ id: number }> {
  const client = getSupabaseClient();

  const { data: result, error } = await client
    .from("style_blueprints")
    .insert({
      archetype_name: data.archetype_name,
      style_data: data,
      quality_score: qualityScore,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving style blueprint:", error);
    throw new Error("StyleBlueprintの保存に失敗しました");
  }

  return { id: result.id };
}

/**
 * 有効な StyleBlueprint の数を取得
 */
export async function getActiveStyleBlueprintCount(): Promise<number> {
  const client = getSupabaseClient();

  const { count, error } = await client
    .from("style_blueprints")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    console.error("Error counting style blueprints:", error);
    return 0;
  }

  return count || 0;
}

/**
 * 有効な StyleBlueprint を取得（管理用一覧）
 */
export async function getAllStyleBlueprints(): Promise<StyleBlueprint[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("style_blueprints")
    .select("*")
    .eq("is_active", true)
    .order("quality_score", { ascending: false });

  if (error) {
    console.error("Error fetching style blueprints:", error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    style_data: row.style_data as StyleBlueprintData,
  })) as StyleBlueprint[];
}

/**
 * StyleBlueprint を更新
 */
export async function updateStyleBlueprint(
  id: number,
  updates: {
    is_active?: boolean;
    quality_score?: number;
    style_data?: StyleBlueprintData;
    archetype_name?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  const { error } = await client
    .from("style_blueprints")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating style blueprint:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * StyleBlueprint を削除（論理削除：is_active = false に設定）
 */
export async function deleteStyleBlueprint(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  const { error } = await client
    .from("style_blueprints")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating style blueprint:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =============================================
// ストーリー表示/非表示管理
// =============================================

/**
 * ストーリーの表示/非表示を切り替える
 */
export async function setStoryVisibility(
  storyId: string,
  isVisible: boolean
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  const { error } = await client
    .from("stories")
    .update({ is_visible: isVisible })
    .eq("id", storyId);

  if (error) {
    console.error("Error updating story visibility:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 公開ページ用：表示可能なストーリーのみ取得
 */
export async function getVisibleStoryById(id: string): Promise<Story | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("stories")
    .select("*")
    .eq("id", id)
    .eq("is_visible", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching visible story:", error);
    return null;
  }

  return data as Story;
}