-- =============================================
-- 連続低評価のStyleBlueprintを自動無効化
-- 連続3回 rating <= 2 で is_active = false
-- =============================================

-- 1. 連続低評価チェック関数
CREATE OR REPLACE FUNCTION check_consecutive_low_ratings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_style_blueprint_id BIGINT;
  v_consecutive_low_count INT;
  v_active_count INT;
BEGIN
  -- story_id から style_blueprint_id を取得
  SELECT gl.style_blueprint_id INTO v_style_blueprint_id
  FROM generation_logs gl
  WHERE gl.story_id = NEW.story_id
  LIMIT 1;

  -- style_blueprint_id が存在しない場合は何もしない
  IF v_style_blueprint_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- そのStyleBlueprintの直近3件のレビューを取得し、全て rating <= 2 かチェック
  SELECT COUNT(*) INTO v_consecutive_low_count
  FROM (
    SELECT sr.rating
    FROM story_reviews sr
    JOIN generation_logs gl ON gl.story_id = sr.story_id
    WHERE gl.style_blueprint_id = v_style_blueprint_id
      AND sr.rating IS NOT NULL
    ORDER BY sr.created_at DESC
    LIMIT 3
  ) recent_reviews
  WHERE rating <= 2;

  -- 直近3件が全て低評価（rating <= 2）の場合
  IF v_consecutive_low_count = 3 THEN
    -- 他にアクティブなStyleBlueprintがあるか確認（最低1つは残す）
    SELECT COUNT(*) INTO v_active_count
    FROM style_blueprints
    WHERE is_active = true
      AND id != v_style_blueprint_id;

    -- 他にアクティブなものがあれば無効化
    IF v_active_count > 0 THEN
      UPDATE style_blueprints
      SET is_active = false
      WHERE id = v_style_blueprint_id;

      RAISE NOTICE 'StyleBlueprint % を自動無効化しました（連続3回低評価）', v_style_blueprint_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. トリガーを作成（レビュー挿入・更新時に発火）
DROP TRIGGER IF EXISTS trigger_check_consecutive_low_ratings ON story_reviews;

CREATE TRIGGER trigger_check_consecutive_low_ratings
AFTER INSERT OR UPDATE OF rating ON story_reviews
FOR EACH ROW
WHEN (NEW.rating IS NOT NULL)
EXECUTE FUNCTION check_consecutive_low_ratings();

COMMENT ON FUNCTION check_consecutive_low_ratings IS
  '連続3回低評価（rating <= 2）のStyleBlueprintを自動的にis_active = falseに設定';
