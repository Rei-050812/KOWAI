-- =============================================
-- レビュー評価をStyleBlueprintに反映するトリガー
-- =============================================

-- 1. StyleBlueprintの平均評価を更新する関数
CREATE OR REPLACE FUNCTION update_style_blueprint_avg_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_style_blueprint_id BIGINT;
  v_avg_rating DECIMAL(3,2);
BEGIN
  -- story_id から style_blueprint_id を取得
  SELECT gl.style_blueprint_id INTO v_style_blueprint_id
  FROM generation_logs gl
  WHERE gl.story_id = COALESCE(NEW.story_id, OLD.story_id)
  LIMIT 1;

  -- style_blueprint_id が存在しない場合は何もしない
  IF v_style_blueprint_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- そのStyleBlueprintを使った全ストーリーの平均評価を計算
  SELECT ROUND(AVG(sr.rating)::numeric, 2) INTO v_avg_rating
  FROM story_reviews sr
  JOIN generation_logs gl ON gl.story_id = sr.story_id
  WHERE gl.style_blueprint_id = v_style_blueprint_id
    AND sr.rating IS NOT NULL;

  -- style_blueprints の avg_story_rating を更新
  UPDATE style_blueprints
  SET avg_story_rating = v_avg_rating
  WHERE id = v_style_blueprint_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. INSERT/UPDATE/DELETE 時にトリガー発火
DROP TRIGGER IF EXISTS trigger_update_style_rating_on_review ON story_reviews;

CREATE TRIGGER trigger_update_style_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON story_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_style_blueprint_avg_rating();

-- 3. 既存データの平均評価を一括更新（初回マイグレーション用）
UPDATE style_blueprints sb
SET avg_story_rating = sub.avg_rating
FROM (
  SELECT
    gl.style_blueprint_id,
    ROUND(AVG(sr.rating)::numeric, 2) AS avg_rating
  FROM story_reviews sr
  JOIN generation_logs gl ON gl.story_id = sr.story_id
  WHERE gl.style_blueprint_id IS NOT NULL
    AND sr.rating IS NOT NULL
  GROUP BY gl.style_blueprint_id
) sub
WHERE sb.id = sub.style_blueprint_id;

COMMENT ON FUNCTION update_style_blueprint_avg_rating IS
  'レビュー評価時にStyleBlueprintのavg_story_ratingを自動更新';
