-- =============================================
-- Migration: storiesテーブルにblueprint_id追加
-- 目的: 生成に使用したBlueprintの追跡を可能にする
-- =============================================

-- blueprint_idカラム追加（nullable、既存レコードはnull）
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS blueprint_id INTEGER REFERENCES kaidan_blueprints(id) ON DELETE SET NULL;

-- インデックス追加（Blueprint別の怪談検索用）
CREATE INDEX IF NOT EXISTS idx_stories_blueprint_id ON stories(blueprint_id);

-- コメント追加
COMMENT ON COLUMN stories.blueprint_id IS '生成に使用したBlueprintのID（追跡用）';
