import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { StoryStyle } from "@/types";
import { generatePrompt } from "@/lib/prompts";
import { createStory, incrementWordCount } from "@/lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const storyContent = content.text;

    // データベースに保存
    const story = await createStory(word, style, storyContent);

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
