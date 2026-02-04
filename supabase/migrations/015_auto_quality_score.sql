-- =============================================
-- StyleBlueprintの品質スコアを自動計算
-- =============================================

-- 1. トリガー関数を更新（avg_story_rating と quality_score を同時に更新）
CREATE OR REPLACE FUNCTION update_style_blueprint_avg_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_style_blueprint_id BIGINT;
  v_avg_rating DECIMAL(3,2);
  v_quality_score INT;
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

  -- 平均評価がある場合、quality_scoreを計算（avg_rating × 20）
  IF v_avg_rating IS NOT NULL THEN
    v_quality_score := ROUND(v_avg_rating * 20);
  ELSE
    v_quality_score := 70; -- デフォルト値
  END IF;

  -- style_blueprints の avg_story_rating と quality_score を更新
  UPDATE style_blueprints
  SET
    avg_story_rating = v_avg_rating,
    quality_score = v_quality_score
  WHERE id = v_style_blueprint_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. 既存データの品質スコアを一括更新
UPDATE style_blueprints sb
SET quality_score = ROUND(sb.avg_story_rating * 20)
WHERE sb.avg_story_rating IS NOT NULL;

COMMENT ON FUNCTION update_style_blueprint_avg_rating IS
  'レビュー評価時にStyleBlueprintのavg_story_ratingとquality_scoreを自動更新';
