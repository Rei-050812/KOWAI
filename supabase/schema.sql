-- KOWAIデータベーススキーマ

-- 拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- storiesテーブル
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word VARCHAR(20) NOT NULL,
  style VARCHAR(10) NOT NULL CHECK (style IN ('short', 'medium', 'real', 'urban')),
  title VARCHAR(50) NOT NULL,
  hook TEXT NOT NULL,
  story TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- wordsテーブル（人気の単語用）
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word VARCHAR(20) UNIQUE NOT NULL,
  count INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_likes ON stories(likes DESC);
CREATE INDEX IF NOT EXISTS idx_words_count ON words(count DESC);

-- RLSポリシー（Row Level Security）
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能
CREATE POLICY "Stories are viewable by everyone" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Words are viewable by everyone" ON words
  FOR SELECT USING (true);

-- 挿入も許可（認証なしでMVP用）
CREATE POLICY "Anyone can insert stories" ON stories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert words" ON words
  FOR INSERT WITH CHECK (true);

-- 更新も許可（いいね・閲覧数用）
CREATE POLICY "Anyone can update stories" ON stories
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can update words" ON words
  FOR UPDATE USING (true);
