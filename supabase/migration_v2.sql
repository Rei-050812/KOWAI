-- マイグレーション: contentカラムをtitle, hook, storyに分離

-- 既存のstoriesテーブルを削除して再作成
DROP TABLE IF EXISTS stories;

-- 新しいstoriesテーブルを作成
CREATE TABLE stories (
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

-- インデックス
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_stories_likes ON stories(likes DESC);

-- RLS有効化
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY "Anyone can read stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stories" ON stories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stories" ON stories FOR UPDATE USING (true);
