-- =============================================
-- KOWAI RAG System: Kaidan Blueprints (タグベース検索版)
-- =============================================

-- 1. kaidan_blueprintsテーブルの作成
CREATE TABLE IF NOT EXISTS kaidan_blueprints (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  blueprint JSONB NOT NULL,
  quality_score INT NOT NULL DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. タグ検索用のGINインデックス
CREATE INDEX IF NOT EXISTS idx_kaidan_blueprints_tags
ON kaidan_blueprints
USING GIN (tags);

-- quality_score検索用インデックス
CREATE INDEX IF NOT EXISTS idx_kaidan_blueprints_quality
ON kaidan_blueprints (quality_score DESC);

-- 3. updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_kaidan_blueprints_updated_at ON kaidan_blueprints;
CREATE TRIGGER trigger_kaidan_blueprints_updated_at
  BEFORE UPDATE ON kaidan_blueprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. RPC: タグでBlueprint検索（メイン検索関数）
-- キーワードがタグ配列のいずれかに部分一致するBlueprintを検索
CREATE OR REPLACE FUNCTION match_blueprints_by_keyword(
  search_keyword TEXT,
  match_count INT DEFAULT 3,
  min_quality INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  blueprint JSONB,
  tags TEXT[],
  quality_score INT,
  match_score INT
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
    -- マッチスコア: 完全一致=10, 部分一致=5, タグ数で加点
    (
      CASE WHEN search_keyword = ANY(kb.tags) THEN 10 ELSE 0 END +
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(kb.tags) t WHERE t ILIKE '%' || search_keyword || '%'
      ) THEN 5 ELSE 0 END +
      array_length(
        ARRAY(SELECT t FROM unnest(kb.tags) t WHERE t ILIKE '%' || search_keyword || '%'),
        1
      )
    )::INT AS match_score
  FROM kaidan_blueprints kb
  WHERE kb.quality_score >= min_quality
    AND (
      -- 完全一致
      search_keyword = ANY(kb.tags)
      -- または部分一致
      OR EXISTS (
        SELECT 1 FROM unnest(kb.tags) t WHERE t ILIKE '%' || search_keyword || '%'
      )
    )
  ORDER BY match_score DESC, kb.quality_score DESC
  LIMIT match_count;
END;
$$;

-- 5. RPC: 複数タグでBlueprint検索（補助用）
CREATE OR REPLACE FUNCTION search_blueprints_by_tags(
  search_tags TEXT[],
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  blueprint JSONB,
  tags TEXT[],
  quality_score INT
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
    kb.quality_score
  FROM kaidan_blueprints kb
  WHERE kb.tags && search_tags
  ORDER BY kb.quality_score DESC
  LIMIT match_count;
END;
$$;

-- 6. RPC: ランダムにBlueprint取得（フォールバック用）
CREATE OR REPLACE FUNCTION get_random_blueprint(
  min_quality INT DEFAULT 30
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  blueprint JSONB,
  tags TEXT[],
  quality_score INT
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
    kb.quality_score
  FROM kaidan_blueprints kb
  WHERE kb.quality_score >= min_quality
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;

-- コメント
COMMENT ON TABLE kaidan_blueprints IS 'RAG用の怪談設計図（Blueprint）。本文は保存せず、抽象化された構造データのみを格納';
COMMENT ON COLUMN kaidan_blueprints.blueprint IS 'JSON形式の設計図。anomaly, normal_rule, irreversible_point等を含む';
COMMENT ON COLUMN kaidan_blueprints.tags IS 'キーワード検索用のタグ配列。anomaly/subgenre/detail等から抽出';
COMMENT ON COLUMN kaidan_blueprints.quality_score IS '品質スコア (0-100)。生成時に高品質なBlueprintを優先するために使用';
