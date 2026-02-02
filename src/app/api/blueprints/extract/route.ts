import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { KaidanBlueprintData, StyleBlueprintData } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================
// 定数
// =============================================
const MAX_CHARS = 50000; // 絶対上限
const LONG_TEXT_THRESHOLD = 10000; // 長文モード閾値
const CHUNK_SIZE = 7000; // チャンクサイズ目標
const MIN_TEXT_LENGTH = 100; // 最小文字数

// =============================================
// タグ正規化ルール（プロンプト共通）
// =============================================
const TAG_RULES = `
【タグ正規化ルール（絶対遵守）】
tagsは「検索・分類のためのラベル」であり、文章や要約ではありません。

■ 絶対条件
- 名詞または名詞的概念のみ
- 1タグは最大10文字程度
- 助詞（の・に・を・と・が・は等）を含めない
- 動詞・形容詞・文末表現・時制表現を含めない
- 出来事や状況を説明する文章をtagsにしない

■ 禁止例
✗「鏡台の三段目の引き出しの中身を見ると」
✗「夜中に開けたら」
✗「なんとなくおかしい」
✗「見てはいけないものを見た」

■ 矯正ルール
文章・フレーズになった場合は要素を分解し抽象化：
「鏡台の三段目の引き出しの中身を見ると」→「鏡」「家具」「引き出し」「日常物品」
「夜中に開けたら」→「夜」「屋内」「私物」

■ タグ数：3〜7個（重複・類義語は統合）
`;

// =============================================
// プロンプト定義
// =============================================

/**
 * A) 短文用プロンプト：source_text -> Blueprint
 */
function getShortTextPrompt(text: string): string {
  return `あなたは怪談の構造分析専門家です。以下の怪談本文から「Blueprint」を抽出してください。

【絶対ルール】
1. 要約禁止：筋・固有名詞・固有台詞を保持しない。一般化する
2. 怪異は必ず1つだけ：複数の怪異が出てきても、最も核心的な1つに絞る
3. 「何が起きたか」は分かるが「なぜ」は分からない状態にする
4. 出力はBlueprint JSONのみ（前後に余計な文章を書かない）
${TAG_RULES}
【出力形式】
以下のJSON形式のみで出力してください：
{
  "tags": ["名詞タグ1", "名詞タグ2", "名詞タグ3"],
  "anomaly": "怪異の核（必ず1つだけ。具体的な名前や場所は抽象化）",
  "normal_rule": "通常の前提（読者が理解できるレベル）",
  "irreversible_point": "世界の前提が不可逆に確定する事実（説明なしで提示できる）",
  "reader_understands": "読者が理解できること（何が起きたか）",
  "reader_cannot_understand": "読者が理解できないこと（なぜ起きたか／正体）",
  "constraints": {
    "no_explanations": true,
    "single_anomaly_only": true,
    "no_emotion_words": true,
    "no_clean_resolution": true,
    "daily_details_min": 3
  },
  "allowed_subgenres": ["心霊", "異世界", "ヒトコワ", "禁忌から該当するもの"],
  "detail_bank": ["生活音", "匂い", "時間帯", "天候", "生活用品など抽出"],
  "ending_style": "前提が壊れた状態で停止（結末は描かない）"
}

【怪談本文】
${text}

【出力】`;
}

/**
 * B) 長文用（Part用）プロンプト：source_text_part -> Blueprint_part
 */
function getPartPrompt(text: string, partNum: number, totalParts: number): string {
  return `あなたは怪談の構造分析専門家です。これは長文怪談の Part ${partNum}/${totalParts} です。
このPartで観測できる範囲で「Blueprint」を抽出してください。

【絶対ルール】
1. 要約禁止：筋・固有名詞・固有台詞を保持しない。一般化する
2. 怪異は必ず1つだけ：このPartで複数出てきても、最も核心的な1つに絞る
3. 「何が起きたか」は分かるが「なぜ」は分からない状態にする
4. 出力はBlueprint JSONのみ（前後に余計な文章を書かない）
5. このPartで情報が不足している項目は空文字""または空配列[]にしてよい
${TAG_RULES}
【出力形式】
{
  "tags": ["このPartから抽出した名詞タグ"],
  "anomaly": "このPartで観測できる怪異の核（1つだけ）",
  "normal_rule": "このPartで示される通常の前提",
  "irreversible_point": "このPartで確定する不可逆の事実（あれば）",
  "reader_understands": "このPartで読者が理解できること",
  "reader_cannot_understand": "このPartで読者が理解できないこと",
  "constraints": {
    "no_explanations": true,
    "single_anomaly_only": true,
    "no_emotion_words": true,
    "no_clean_resolution": true,
    "daily_details_min": 3
  },
  "allowed_subgenres": [],
  "detail_bank": [],
  "ending_style": ""
}

【怪談本文 Part ${partNum}/${totalParts}】
${text}

【出力】`;
}

/**
 * C) 統合用プロンプト：Blueprint_part[] -> Unified Blueprint
 */
function getUnifyPrompt(blueprints: Array<KaidanBlueprintData & { tags?: string[] }>): string {
  const blueprintTexts = blueprints
    .map((bp, i) => `【Part ${i + 1} Blueprint】\n${JSON.stringify(bp, null, 2)}`)
    .join("\n\n");

  return `あなたは怪談の構造分析専門家です。複数のPart Blueprintを1つに統合してください。

【統合ルール】
1. 各Partの共通する「怪異の核」を1つに確定する（複数は不可）
2. normal_rule / irreversible_point は最も一貫性が高いものを採用または統合
3. 具体的な出来事順序は捨てる（ストーリー再構築禁止）
4. 各Partのtags, detail_bank, allowed_subgenresはマージして重複除去
5. 出力は統合Blueprint JSON 1つのみ
${TAG_RULES}
【出力形式】
{
  "tags": ["マージ・整理後の名詞タグ3〜7個"],
  "anomaly": "統合された怪異の核（必ず1つだけ）",
  "normal_rule": "統合された通常の前提",
  "irreversible_point": "統合された不可逆の確定点",
  "reader_understands": "読者が理解できること",
  "reader_cannot_understand": "読者が理解できないこと",
  "constraints": {
    "no_explanations": true,
    "single_anomaly_only": true,
    "no_emotion_words": true,
    "no_clean_resolution": true,
    "daily_details_min": 3
  },
  "allowed_subgenres": ["マージ結果"],
  "detail_bank": ["マージ結果"],
  "ending_style": "前提が壊れた状態で停止（結末は描かない）"
}

${blueprintTexts}

【統合Blueprint出力】`;
}

/**
 * D) 文体抽出用プロンプト：source_text -> StyleBlueprintData
 */
function getStyleExtractionPrompt(text: string, existingNames: string[] = []): string {
  const existingNamesSection = existingNames.length > 0
    ? `

【重要：流派名の命名ルール】
以下の既存の流派名と被らない、かつ類似しない名前を付けてください。
- 完全一致はもちろん、「〜風」「〜調」「〜型」などの接尾辞違いも避ける
- 同じキーワードを使った名前も避ける（例：「回想録風」があれば「回想録調」も不可）
- この文体の特徴を的確に表す、新しい独自の名前を創造してください

既存の流派名一覧：
${existingNames.map(n => `- ${n}`).join('\n')}`
    : '';

  return `あなたは洒落怖（2ch系怪談）の文体分析専門家です。以下の怪談本文から「書き方の流派（StyleBlueprint）」を抽出してください。

【目的】
この分析結果は、同じ文体で新しい怪談を生成するためのスタイル指示書として使われます。
そのため、具体的なストーリー内容ではなく「書き方の癖・方向性」を抽出してください。
${existingNamesSection}

【分析観点】
1. 語り手の距離感：出来事をどの程度他人事として語っているか
   - distant: 完全に報告者・記録者の立場
   - involved: 体験者として語っているが感情を抑えている
   - detached: 淡々と事実を列挙する

2. 文の長さ傾向：
   - short: 短文中心、切れ味重視
   - mixed: 短文と長文を使い分ける
   - flowing: 長めの文が多く、流れるような語り

3. 感情表出レベル：
   - 0: 完全抑制（怖い・不気味などの感情語を使わない）
   - 1: 最小限（稀に漏れる程度）
   - 2: 控えめ（感情は出すがオーバーではない）

4. 擬音・効果音の使用：
   - none: 使わない
   - minimal: 重要な場面でのみ
   - moderate: 適度に使用

5. 会話文の傾向：
   - rare: ほぼ地の文のみ
   - functional: 必要最小限の会話
   - natural: 自然な会話が多い

6. 特徴的なフレーズ：原文そのままではなく「このスタイルらしい表現パターン」を一般化して抽出
   例: 「〜だったと思う」「〜なのだが」「〜してしまった」

7. 禁止事項：このスタイルが明らかに避けていること
   例: 「過度な感情表現」「説明的な怪異描写」「読者への呼びかけ」

8. 流派名：このスタイルを端的に表す名前（日本語で）
   例: 「淡々実録型」「回想録調」「報告書風」「語り部型」

【出力形式】
以下のJSON形式のみで出力してください（前後に余計な文章を書かない）：
{
  "archetype_name": "流派名",
  "tone_features": ["文体特徴1", "文体特徴2", "文体特徴3"],
  "narrator_stance": "distant" | "involved" | "detached",
  "emotion_level": 0 | 1 | 2,
  "sentence_style": "short" | "mixed" | "flowing",
  "onomatopoeia_usage": "none" | "minimal" | "moderate",
  "dialogue_style": "rare" | "functional" | "natural",
  "style_prohibitions": ["禁止事項1", "禁止事項2"],
  "sample_phrases": ["スタイルらしい表現パターン1", "パターン2", "パターン3"]
}

【怪談本文】
${text}

【出力】`;
}

/**
 * Claude APIでStyleBlueprintData JSONを生成
 */
async function callClaudeForStyle(prompt: string): Promise<StyleBlueprintData> {
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
    throw new Error("Unexpected response type from Claude");
  }

  return parseStyleBlueprint(content.text);
}

/**
 * レスポンスからStyleBlueprintData JSONをパース
 */
function parseStyleBlueprint(text: string): StyleBlueprintData {
  // コードブロックを除去
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  // JSONオブジェクトを抽出
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  // バリデーション＆デフォルト値設定
  const validStances = ['distant', 'involved', 'detached'] as const;
  const validEmotionLevels = [0, 1, 2] as const;
  const validSentenceStyles = ['short', 'mixed', 'flowing'] as const;
  const validOnomatopoeia = ['none', 'minimal', 'moderate'] as const;
  const validDialogueStyles = ['rare', 'functional', 'natural'] as const;

  return {
    archetype_name: parsed.archetype_name || "不明",
    tone_features: Array.isArray(parsed.tone_features) ? parsed.tone_features.slice(0, 5) : [],
    narrator_stance: validStances.includes(parsed.narrator_stance) ? parsed.narrator_stance : 'distant',
    emotion_level: validEmotionLevels.includes(parsed.emotion_level) ? parsed.emotion_level : 1,
    sentence_style: validSentenceStyles.includes(parsed.sentence_style) ? parsed.sentence_style : 'mixed',
    onomatopoeia_usage: validOnomatopoeia.includes(parsed.onomatopoeia_usage) ? parsed.onomatopoeia_usage : 'minimal',
    dialogue_style: validDialogueStyles.includes(parsed.dialogue_style) ? parsed.dialogue_style : 'functional',
    style_prohibitions: Array.isArray(parsed.style_prohibitions) ? parsed.style_prohibitions : [],
    sample_phrases: Array.isArray(parsed.sample_phrases) ? parsed.sample_phrases.slice(0, 5) : [],
  };
}

/**
 * 長文から文体分析用の代表サンプルを抽出
 * 冒頭・中盤・終盤からバランスよく取得
 */
function extractRepresentativeSample(text: string, maxLength: number = 8000): string {
  if (text.length <= maxLength) return text;

  const sectionLength = Math.floor(maxLength / 3);
  const beginning = text.slice(0, sectionLength);
  const middleStart = Math.floor(text.length / 2) - Math.floor(sectionLength / 2);
  const middle = text.slice(middleStart, middleStart + sectionLength);
  const ending = text.slice(-sectionLength);

  return `${beginning}\n\n[...中略...]\n\n${middle}\n\n[...中略...]\n\n${ending}`;
}

// =============================================
// ユーティリティ
// =============================================

/**
 * 長文を段落優先でチャンクに分割
 */
function splitTextIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 > CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // 段落自体が長すぎる場合は強制分割
      if (para.length > CHUNK_SIZE) {
        const forceSplit = para.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "g")) || [];
        chunks.push(...forceSplit);
        currentChunk = "";
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Blueprint + tags の型
interface BlueprintWithTags extends KaidanBlueprintData {
  tags: string[];
}

/**
 * Claude APIでBlueprint JSONを生成
 */
async function callClaude(prompt: string): Promise<BlueprintWithTags> {
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
    throw new Error("Unexpected response type from Claude");
  }

  return parseBlueprint(content.text);
}

/**
 * タグの正規化（後処理）
 */
function normalizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];

  return tags
    .map(tag => tag.trim())
    // 10文字以下に切り詰め
    .map(tag => tag.slice(0, 10))
    // 空文字除去
    .filter(tag => tag.length > 0)
    // 助詞で終わるものを除去
    .filter(tag => !/[のにをとがはでへや]$/.test(tag))
    // 長すぎる文章っぽいものを除去（句読点含む）
    .filter(tag => !/[、。？！]/.test(tag))
    // 重複除去
    .filter((tag, i, arr) => arr.indexOf(tag) === i)
    // 3〜7個に制限
    .slice(0, 7);
}

/**
 * レスポンスからBlueprint JSONをパース
 */
function parseBlueprint(text: string): BlueprintWithTags {
  // コードブロックを除去
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  // JSONオブジェクトを抽出
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  // タグを正規化
  const normalizedTags = normalizeTags(parsed.tags || []);

  // 必須フィールドのデフォルト値を設定
  return {
    tags: normalizedTags,
    anomaly: parsed.anomaly || "",
    normal_rule: parsed.normal_rule || "",
    irreversible_point: parsed.irreversible_point || "",
    reader_understands: parsed.reader_understands || "",
    reader_cannot_understand: parsed.reader_cannot_understand || "",
    constraints: {
      no_explanations: parsed.constraints?.no_explanations ?? true,
      single_anomaly_only: parsed.constraints?.single_anomaly_only ?? true,
      no_emotion_words: parsed.constraints?.no_emotion_words ?? true,
      no_clean_resolution: parsed.constraints?.no_clean_resolution ?? true,
      daily_details_min: parsed.constraints?.daily_details_min ?? 3,
    },
    allowed_subgenres: parsed.allowed_subgenres || [],
    detail_bank: parsed.detail_bank || [],
    ending_style: parsed.ending_style || "",
  };
}

// =============================================
// APIハンドラ
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_text, existing_style_names } = body as {
      source_text: string;
      existing_style_names?: string[];
    };

    // バリデーション（source_textの内容はログに出さない）
    if (!source_text || typeof source_text !== "string") {
      return NextResponse.json(
        { error: "本文を入力してください" },
        { status: 400 }
      );
    }

    const textLength = source_text.length;

    if (textLength < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `本文が短すぎます（${MIN_TEXT_LENGTH}文字以上必要）` },
        { status: 400 }
      );
    }

    if (textLength > MAX_CHARS) {
      return NextResponse.json(
        { error: `本文が長すぎます（${MAX_CHARS}文字以内）` },
        { status: 400 }
      );
    }

    let result: BlueprintWithTags;

    if (textLength < LONG_TEXT_THRESHOLD) {
      // 短文モード：1回で処理
      const prompt = getShortTextPrompt(source_text);
      result = await callClaude(prompt);
    } else {
      // 長文モード：分割して処理
      const chunks = splitTextIntoChunks(source_text);
      const partBlueprints: BlueprintWithTags[] = [];

      // 各Partを処理
      for (let i = 0; i < chunks.length; i++) {
        const prompt = getPartPrompt(chunks[i], i + 1, chunks.length);
        const partBp = await callClaude(prompt);
        partBlueprints.push(partBp);
      }

      // 統合
      if (partBlueprints.length === 1) {
        result = partBlueprints[0];
      } else {
        const unifyPrompt = getUnifyPrompt(partBlueprints);
        result = await callClaude(unifyPrompt);
      }
    }

    // tagsをblueprintから分離
    const { tags, ...blueprint } = result;

    // 文体抽出（長文の場合は代表サンプルを使用）
    const styleSampleText = textLength >= LONG_TEXT_THRESHOLD
      ? extractRepresentativeSample(source_text)
      : source_text;
    const stylePrompt = getStyleExtractionPrompt(styleSampleText, existing_style_names || []);
    const styleData = await callClaudeForStyle(stylePrompt);

    // source_textを含めずにレスポンス
    return NextResponse.json({
      blueprint,
      tags: normalizeTags(tags), // 最終正規化
      styleData,
      mode: textLength < LONG_TEXT_THRESHOLD ? "short" : "long",
      chunks: textLength < LONG_TEXT_THRESHOLD ? 1 : splitTextIntoChunks(source_text).length,
    });
  } catch (error) {
    // エラーログ出力（デバッグ用）
    console.error("[Blueprint Extract Error]", error);

    // エラー時もsource_textを含めない
    if (error instanceof Anthropic.APIError) {
      console.error("[Anthropic API Error]", error.status, error.message);
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
      // その他のAPIエラー
      return NextResponse.json(
        { error: `API エラー: ${error.message}` },
        { status: 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Blueprint JSONのパースに失敗しました。再度お試しください" },
        { status: 500 }
      );
    }

    // 未知のエラー
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: `Blueprint変換に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
