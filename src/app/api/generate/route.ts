import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { StoryStyle } from "@/types";
import { generatePrompt } from "@/lib/prompts";
import { createStory, incrementWordCount } from "@/lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GeneratedStory {
  title: string;
  hook: string;
  story: string;
}

function parseStoryResponse(text: string): GeneratedStory {
  // JSONを抽出（```json ... ``` や 余分なテキストを除去）
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
    };
  } catch {
    // JSONパースに失敗した場合、テキスト全体をstoryとして使用
    console.error("Failed to parse JSON, using raw text");
    return {
      title: "無題の怪談",
      hook: text.slice(0, 100),
      story: text,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, style } = body as { word: string; style: StoryStyle };

    // バリデーション
    if (!word || typeof word !== "string") {
      return NextResponse.json(
        { error: "単語を入力してください" },
        { status: 400 }
      );
    }

    if (word.length > 20) {
      return NextResponse.json(
        { error: "単語は20文字以内で入力してください" },
        { status: 400 }
      );
    }

    const validStyles: StoryStyle[] = ["short", "medium", "real", "urban"];
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { error: "無効なスタイルです" },
        { status: 400 }
      );
    }

    // Claude APIで怪談を生成
    const prompt = generatePrompt(word, style);

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

    // レスポンスからテキストを抽出
    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // JSONをパース
    const generatedStory = parseStoryResponse(content.text);

    // データベースに保存
    const story = await createStory(
      word,
      style,
      generatedStory.title,
      generatedStory.hook,
      generatedStory.story
    );

    // 単語カウントを更新
    await incrementWordCount(word);

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Error generating story:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "APIキーが無効です" },
          { status: 500 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "リクエストが多すぎます。しばらくお待ちください" },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "怪談の生成に失敗しました" },
      { status: 500 }
    );
  }
}
