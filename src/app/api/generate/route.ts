import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { StoryStyle, BlueprintSearchResult, Story } from "@/types";
import { generatePrompt, generateBlueprintPrompt } from "@/lib/prompts";
import { createStory, incrementWordCount, logWordUsage, matchBlueprintsByKeyword, getRandomBlueprint } from "@/lib/supabase";

// =============================================
// 初期化
// =============================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================
// 型定義
// =============================================

interface GeneratedStory {
  title: string;
  hook: string;
  story: string;
  pattern?: string;
}

interface BlueprintSelectionResult {
  blueprint: BlueprintSearchResult | null;
  prompt: string;
  selectionMethod: "keyword" | "random" | "fallback";
}

// =============================================
// 責務分離された関数群
// =============================================

/**
 * LLMレスポンスからJSON形式の怪談をパース
 */
function parseStoryResponse(text: string): GeneratedStory {
  let jsonStr = text;

  // コードブロックを除去
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  // JSONオブジェクトを抽出
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      title: parsed.title || "無題の怪談",
      hook: parsed.hook || "",
      story: parsed.story || "",
      pattern: parsed.pattern || undefined,
    };
  } catch {
    console.error("Failed to parse JSON, using raw text");
    return {
      title: "無題の怪談",
      hook: text.slice(0, 100),
      story: text,
    };
  }
}

/**
 * キーワードに基づいてBlueprintを選択
 * 階層検索 → ランダム → フォールバックの順で試行
 */
async function selectBlueprint(word: string, style: StoryStyle): Promise<BlueprintSelectionResult> {
  const MIN_QUALITY_LEVELS = [70, 50, 30];

  try {
    // 1. 階層的にmin_qualityを下げながらキーワード検索
    for (const minQuality of MIN_QUALITY_LEVELS) {
      const blueprintResults = await matchBlueprintsByKeyword(word, 1, minQuality);
      if (blueprintResults.length > 0) {
        const blueprint = blueprintResults[0];
        console.log(`[Blueprint] keyword match: "${blueprint.title}" (quality: ${blueprint.quality_score}, threshold: ${minQuality})`);
        return {
          blueprint,
          prompt: generateBlueprintPrompt(word, style, blueprint.blueprint),
          selectionMethod: "keyword",
        };
      }
    }

    // 2. キーワードマッチなし → ランダムに高品質Blueprintを取得
    const randomBlueprint = await getRandomBlueprint(50);
    if (randomBlueprint) {
      console.log(`[Blueprint] random fallback: "${randomBlueprint.title}" (quality: ${randomBlueprint.quality_score})`);
      return {
        blueprint: randomBlueprint,
        prompt: generateBlueprintPrompt(word, style, randomBlueprint.blueprint),
        selectionMethod: "random",
      };
    }

    // 3. Blueprintが0件の場合は従来プロンプト
    console.log("[Blueprint] none available, using legacy prompt");
    return {
      blueprint: null,
      prompt: generatePrompt(word, style),
      selectionMethod: "fallback",
    };
  } catch (error) {
    console.error("[Blueprint] search failed:", error);
    return {
      blueprint: null,
      prompt: generatePrompt(word, style),
      selectionMethod: "fallback",
    };
  }
}

/**
 * Claude APIを呼び出して怪談を生成
 */
async function generateWithLLM(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from LLM");
  }

  return content.text;
}

/**
 * 生成された怪談をDBに保存し、関連ログを記録
 */
async function saveStoryWithLogs(
  word: string,
  style: StoryStyle,
  generatedStory: GeneratedStory,
  blueprintId: number | null
): Promise<Story> {
  // DB保存（blueprint_id含む）
  const story = await createStory(
    word,
    style,
    generatedStory.title,
    generatedStory.hook,
    generatedStory.story,
    blueprintId
  );

  // 並列でログ記録（どちらかが失敗しても継続）
  await Promise.allSettled([
    incrementWordCount(word),
    logWordUsage(word, story.id),
  ]);

  return story;
}

/**
 * 入力バリデーション
 */
function validateInput(word: unknown, style: unknown): { valid: true; word: string; style: StoryStyle } | { valid: false; error: string } {
  if (!word || typeof word !== "string") {
    return { valid: false, error: "単語を入力してください" };
  }

  if (word.length > 20) {
    return { valid: false, error: "単語は20文字以内で入力してください" };
  }

  const validStyles: StoryStyle[] = ["short", "medium", "long"];
  if (!validStyles.includes(style as StoryStyle)) {
    return { valid: false, error: "無効なスタイルです" };
  }

  return { valid: true, word, style: style as StoryStyle };
}

// =============================================
// APIハンドラ
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. バリデーション
    const validation = validateInput(body.word, body.style);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { word, style } = validation;

    // 2. Blueprint選択
    const { blueprint, prompt, selectionMethod } = await selectBlueprint(word, style);
    console.log(`[Generate] word="${word}", style="${style}", method="${selectionMethod}", blueprint_id=${blueprint?.id ?? "null"}`);

    // 3. LLM生成
    const rawResponse = await generateWithLLM(prompt);
    const generatedStory = parseStoryResponse(rawResponse);

    // 4. DB保存 + ログ記録
    const story = await saveStoryWithLogs(word, style, generatedStory, blueprint?.id ?? null);

    return NextResponse.json({ story });
  } catch (error) {
    console.error("[Generate] Error:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ error: "APIキーが無効です" }, { status: 500 });
      }
      if (error.status === 429) {
        return NextResponse.json({ error: "リクエストが多すぎます。しばらくお待ちください" }, { status: 429 });
      }
    }

    return NextResponse.json({ error: "怪談の生成に失敗しました" }, { status: 500 });
  }
}
