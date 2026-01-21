-- マイグレーション v3: ランキング・カテゴリー機能追加

-- =============================================
-- storiesテーブル拡張
-- =============================================

-- シェア数カラム追加
ALTER TABLE stories ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- スコアカラム追加（計算済み値）
ALTER TABLE stories ADD COLUMN IF NOT EXISTS score NUMERIC(10,2) DEFAULT 0;

-- スタイルの制約を更新（short, medium, longに変更）
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_style_check;
ALTER TABLE stories ADD CONSTRAINT stories_style_check
  CHECK (style IN ('short', 'medium', 'long'));

-- =============================================
-- word_usage_logsテーブル（トレンド計算用）
-- =============================================

CREATE TABLE IF NOT EXISTS word_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word VARCHAR(20) NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE word_usage_logs ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY "Anyone can read word_usage_logs" ON word_usage_logs
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert word_usage_logs" ON word_usage_logs
  FOR INSERT WITH CHECK (true);

-- =============================================
-- インデックス追加
-- =============================================

-- スコア順のインデックス
CREATE INDEX IF NOT EXISTS idx_stories_score ON stories(score DESC);

-- シェア数のインデックス
CREATE INDEX IF NOT EXISTS idx_stories_share_count ON stories(share_count DESC);

-- 閲覧数のインデックス
CREATE INDEX IF NOT EXISTS idx_stories_views ON stories(views DESC);

-- スタイル別のインデックス
CREATE INDEX IF NOT EXISTS idx_stories_style ON stories(style);

-- word_usage_logsのインデックス
CREATE INDEX IF NOT EXISTS idx_word_usage_logs_word ON word_usage_logs(word);
CREATE INDEX IF NOT EXISTS idx_word_usage_logs_created_at ON word_usage_logs(created_at DESC);

-- =============================================
-- スコア計算関数
-- score = (likes * 3) + (share_count * 5) + (views * 0.1)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_story_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.score := (COALESCE(NEW.likes, 0) * 3) +
               (COALESCE(NEW.share_count, 0) * 5) +
               (COALESCE(NEW.views, 0) * 0.1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- スコア計算トリガー
DROP TRIGGER IF EXISTS trigger_calculate_story_score ON stories;
CREATE TRIGGER trigger_calculate_story_score
  BEFORE INSERT OR UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION calculate_story_score();

-- =============================================
-- シェア数増加関数
-- =============================================

CREATE OR REPLACE FUNCTION increment_share_count(story_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_share_count INTEGER;
BEGIN
  UPDATE stories
  SET share_count = share_count + 1
  WHERE id = story_id
  RETURNING share_count INTO new_share_count;

  RETURN new_share_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 既存データのスコア更新
-- =============================================

UPDATE stories SET score = (COALESCE(likes, 0) * 3) + (COALESCE(share_count, 0) * 5) + (COALESCE(views, 0) * 0.1);
