# KOWAI - AI怪談生成サイト

<div align="center">

**たった一つの単語から、AIが本格的な怪談を生成**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.18-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Claude AI](https://img.shields.io/badge/Claude_AI-Sonnet_4.5-orange?style=flat-square)](https://www.anthropic.com/)

[デモを見る](#) | [機能](#機能) | [セットアップ](#セットアップ)

</div>

## 📖 概要

KOWAIは、Claude AIを活用した次世代の怪談生成プラットフォームです。ユーザーが入力した一つの単語から、**Blueprint駆動RAGシステム**と「洒落怖」スタイルのプロンプトに基づいて本格的な怪談を自動生成します。

### ✨ 特徴

- 🧠 **Blueprint駆動RAGシステム**（NEW!）
  - 怪談の構造パターンを「Blueprint」として蓄積
  - タグベース検索による高速マッチング
  - 品質スコアによる階層的検索（70点→50点→30点→ランダム）
  - 管理画面から新しいBlueprintを登録可能

- 👻 **「洒落怖」スタイル**
  - 2ちゃんねるオカルト板発祥のリアリティ重視の怪談
  - 「不可逆の確定」：取り返しがつかないと悟った瞬間を描写
  - 怪異は1種類のみ、説明は一切しない
  - 日常ディテールの積み重ねで信憑性を担保

- 🎭 **4つの怪談パターン**
  - 目撃系：不可解なものを目撃する視覚的恐怖
  - 因果応報系：禁忌を犯して取り返しがつかなくなる
  - 伝承系：古い言い伝えが現実になる
  - 日常崩壊系：日常の違和感から真実に気づく

- 📝 **3つのスタイル**
  - 短編（約500字）：サクッと読める、オチ重視
  - 中編（約1000字）：雰囲気が徐々に積み重なる
  - 長編（約2000字）：本格怪談、伏線や複数の展開

- 🎨 **文学的なデザイン**
  - 明朝体（Noto Serif JP）を使用した高級感のあるUI
  - 深い黒（#0A0A0A）とオフホワイト（#E8E6E3）の洗練された配色
  - 紙のようなテクスチャと赤いグロー効果

- 📊 **ランキング機能**
  - 最新の怪談
  - 人気の怪談（いいね数順）
  - 人気の単語

## 🛠 技術スタック

### フロントエンド
- **Next.js 16.1.4** - React フレームワーク（Turbopack）
- **TypeScript 5.9.3** - 型安全な開発
- **Tailwind CSS 4.1.18** - ユーティリティファーストCSS

### バックエンド
- **Next.js API Routes** - サーバーサイドAPI
- **Claude AI (Anthropic)** - 怪談生成AI
  - Model: `claude-sonnet-4-20250514`
- **Supabase** - PostgreSQLデータベース

### その他
- **React 19.2.3** - UIライブラリ
- **PostCSS** - CSS処理

## 📦 セットアップ

### 前提条件

- Node.js 18.x 以上
- npm または yarn
- Anthropic API Key
- Supabase プロジェクト

### 1. リポジトリのクローン

```bash
git clone https://github.com/Rei-050812/KOWAI.git
cd KOWAI
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local` ファイルをプロジェクトルートに作成：

```env
# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### APIキーの取得方法

**Anthropic API Key:**
1. https://console.anthropic.com/ にアクセス
2. アカウントを作成
3. API Keys セクションから新しいキーを作成

**Supabase:**
1. https://supabase.com/ にアクセス
2. プロジェクトを作成
3. Settings → API から URL と anon key を取得

### 4. データベースのセットアップ

Supabase SQL Editor で以下のSQLを実行：

```sql
-- stories テーブルの作成
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  style TEXT NOT NULL CHECK (style IN ('short', 'medium', 'long')),
  title TEXT NOT NULL,
  hook TEXT NOT NULL,
  story TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- word_counts テーブルの作成
CREATE TABLE word_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL,
  count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_stories_likes ON stories(likes DESC);
CREATE INDEX idx_word_counts_count ON word_counts(count DESC);

-- word_usage_logs テーブル（トレンド計算用）
CREATE TABLE word_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_word_usage_logs_word ON word_usage_logs(word);
CREATE INDEX idx_word_usage_logs_created_at ON word_usage_logs(created_at DESC);
```

#### Blueprint RAGシステム用テーブル

```sql
-- kaidan_blueprints テーブルの作成
CREATE TABLE kaidan_blueprints (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  blueprint JSONB NOT NULL,
  quality_score INTEGER NOT NULL DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_blueprints_tags ON kaidan_blueprints USING GIN (tags);
CREATE INDEX idx_blueprints_quality ON kaidan_blueprints(quality_score DESC);
CREATE INDEX idx_blueprints_created_at ON kaidan_blueprints(created_at DESC);

-- タグベース検索RPC
CREATE OR REPLACE FUNCTION match_blueprints_by_keyword(
  query_keyword TEXT,
  match_count INT DEFAULT 3,
  min_quality INT DEFAULT 50
)
RETURNS TABLE (
  id INT,
  title TEXT,
  blueprint JSONB,
  tags TEXT[],
  quality_score INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.blueprint,
    kb.tags,
    kb.quality_score,
    1.0::FLOAT AS similarity
  FROM kaidan_blueprints kb
  WHERE
    kb.quality_score >= min_quality
    AND EXISTS (
      SELECT 1 FROM unnest(kb.tags) AS tag
      WHERE tag ILIKE '%' || query_keyword || '%'
         OR query_keyword ILIKE '%' || tag || '%'
    )
  ORDER BY kb.quality_score DESC
  LIMIT match_count;
END;
$$;

-- ランダムBlueprint取得RPC
CREATE OR REPLACE FUNCTION get_random_blueprint(min_quality INT DEFAULT 50)
RETURNS TABLE (
  id INT,
  title TEXT,
  blueprint JSONB,
  tags TEXT[],
  quality_score INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.blueprint,
    kb.tags,
    kb.quality_score,
    0.0::FLOAT AS similarity
  FROM kaidan_blueprints kb
  WHERE kb.quality_score >= min_quality
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 🚀 ビルドとデプロイ

### プロダクションビルド

```bash
npm run build
npm start
```

### Vercelへのデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Rei-050812/KOWAI)

1. Vercelアカウントにログイン
2. リポジトリをインポート
3. 環境変数を設定
4. デプロイ

## 📂 プロジェクト構造

```
KOWAI/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── generate/     # 怪談生成API（Blueprint対応）
│   │   │   ├── blueprints/   # Blueprint API
│   │   │   │   ├── save/    # Blueprint保存
│   │   │   │   └── search/  # Blueprint検索
│   │   │   ├── ranking/      # ランキングAPI
│   │   │   └── stories/      # ストーリーAPI
│   │   ├── admin/            # 管理画面
│   │   │   └── blueprints/  # Blueprint管理ページ
│   │   ├── story/[id]/       # 怪談詳細ページ
│   │   ├── ranking/          # ランキングページ
│   │   ├── layout.tsx        # ルートレイアウト
│   │   ├── page.tsx          # トップページ
│   │   └── globals.css       # グローバルスタイル
│   ├── components/            # Reactコンポーネント
│   │   ├── StoryGenerator.tsx  # 怪談生成フォーム
│   │   ├── StoryDisplay.tsx    # 怪談表示
│   │   └── RankingPreview.tsx  # ランキングプレビュー
│   ├── lib/                   # ユーティリティ
│   │   ├── prompts.ts        # AIプロンプト定義（洒落怖スタイル）
│   │   └── supabase.ts       # Supabaseクライアント（Blueprint対応）
│   ├── hooks/                 # カスタムフック
│   │   └── useTypingEffect.ts # タイピング演出
│   └── types/                 # TypeScript型定義（Blueprint型含む）
│       └── index.ts
├── supabase/
│   └── migrations/           # DBマイグレーション
│       └── 001_kaidan_blueprints.sql
├── public/                    # 静的ファイル
├── .env.local.example        # 環境変数のサンプル
├── next.config.ts            # Next.js設定
├── tailwind.config.ts        # Tailwind CSS設定
├── tsconfig.json             # TypeScript設定
└── package.json
```

## 🧠 Blueprint RAGシステム

### 概要

Blueprintは怪談の「構造的な怖さの設計図」です。入力された単語に応じて適切なBlueprintを検索し、それを元に怪談を生成します。

### Blueprintの構造

```json
{
  "anomaly": "怪異の核（1つだけ）",
  "normal_rule": "通常時の前提・日常のルール",
  "irreversible_point": "不可逆の確定点",
  "reader_understands": "読者が理解できること",
  "reader_cannot_understand": "読者が理解できないこと",
  "constraints": {
    "no_explanations": true,
    "single_anomaly_only": true,
    "no_emotion_words": true,
    "no_clean_resolution": true,
    "daily_details_min": 3
  },
  "allowed_subgenres": ["目撃系", "伝承系"],
  "detail_bank": ["日常ディテールのリスト"],
  "ending_style": "結末のスタイル"
}
```

### 品質評価システム（100点満点）

| 評価項目 | 配点 | 説明 |
|---------|------|------|
| Single Anomaly（怪異1種のみ） | 0-30 | 怪異が1種類に絞られているか |
| Normal Rule Clarity | 0-20 | 通常時の前提が明確か |
| Irreversible Point | 0-25 | 不可逆の確定点が明確か |
| No Explanations | 0-15 | 説明に逃げていないか |
| Reusability | 0-10 | 別シチュエーションに転用可能か |

### 検索アルゴリズム

1. 入力単語でタグマッチ（min_quality: 70）
2. マッチなし → min_quality: 50で再検索
3. マッチなし → min_quality: 30で再検索
4. マッチなし → ランダムにBlueprint取得
5. Blueprintが0件 → 従来のプロンプトにフォールバック

### 管理画面

`/admin/blueprints` から新しいBlueprintを登録できます。

- フォームで各フィールドを入力
- 品質スコアを5項目で採点
- 自動採点・自動タグ生成機能
- 保存時にバリデーション実行

## 🎨 デザインシステム

### カラーパレット

```css
/* 背景 */
--horror-black: #0A0A0A;      /* メイン背景 */
--horror-dark: #121212;       /* カード背景 */

/* テキスト */
--horror-text: #E8E6E3;       /* メインテキスト */
--horror-text-secondary: #9CA3AF; /* セカンダリテキスト */

/* アクセント */
--horror-crimson: #A52A2A;    /* 深紅 */
--horror-red: #8B0000;        /* 暗赤 */
--horror-blood: #4A0000;      /* 血痕風 */
```

### タイポグラフィ

- **メインフォント**: Noto Serif JP（明朝体）
- **英数字フォント**: Crimson Text, EB Garamond
- **フォールバック**: 游明朝, YuMincho, serif

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。

## 🙏 謝辞

- [Anthropic](https://www.anthropic.com/) - Claude AI
- [Supabase](https://supabase.com/) - データベース
- [Vercel](https://vercel.com/) - ホスティング
- [Next.js](https://nextjs.org/) - フレームワーク

## 📞 お問い合わせ

プロジェクトリンク: [https://github.com/Rei-050812/KOWAI](https://github.com/Rei-050812/KOWAI)

---

<div align="center">

**🕯️ 恐怖の種を、物語へ 🕯️**

Made with ❤️ and 👻 by Claude Sonnet 4.5

</div>
