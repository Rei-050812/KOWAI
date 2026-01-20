import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Story, StoryStyle, WordCount } from "@/types";

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
  content: string
): Promise<Story> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("stories")
    .insert({
      word,
      style,
      content,
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
  const { error } = await client.rpc("increment_views", { story_id: id });

  if (error) {
    console.error("Error incrementing views:", error);
  }
}

// いいねをインクリメント
export async function incrementLikes(id: string): Promise<number> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("increment_likes", { story_id: id });

  if (error) {
    console.error("Error incrementing likes:", error);
    throw new Error("いいねに失敗しました");
  }

  return data;
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
  const { error } = await client.rpc("increment_word_count", {
    input_word: word,
  });

  if (error) {
    console.error("Error incrementing word count:", error);
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
