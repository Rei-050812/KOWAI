-- =============================================
-- StyleBlueprint選択に問題傾向ペナルティを追加
-- =============================================

-- 1. StyleBlueprintごとの問題発生率を計算するビュー
CREATE OR REPLACE VIEW style_blueprint_issue_stats AS
SELECT
  gl.style_blueprint_id,
  COUNT(*) AS total_generated,
  AVG(CASE WHEN gl.event_repetition_detected THEN 1 ELSE 0 END) AS event_repetition_rate,
  AVG(CASE WHEN gl.action_consistency_issue THEN 1 ELSE 0 END) AS action_issue_rate,
  AVG(CASE WHEN gl.quote_incomplete_detected THEN 1 ELSE 0 END) AS quote_issue_rate,
  AVG(CASE WHEN gl.coherence_issue THEN 1 ELSE 0 END) AS coherence_issue_rate,
  -- レビューから集計した問題タグ（issues配列）
  AVG(CASE WHEN sr.issues IS NOT NULL AND array_length(sr.issues, 1) > 0 THEN 1 ELSE 0 END) AS review_issue_rate
FROM generation_logs gl
LEFT JOIN story_reviews sr ON sr.story_id = gl.story_id
WHERE gl.style_blueprint_id IS NOT NULL
GROUP BY gl.style_blueprint_id;

COMMENT ON VIEW style_blueprint_issue_stats IS
  'StyleBlueprintごとの問題発生率統計';

-- 2. select_style_blueprint を更新（問題率ペナルティを追加）
CREATE OR REPLACE FUNCTION select_style_blueprint()
RETURNS TABLE (
  id BIGINT,
  archetype_name TEXT,
  style_data JSONB,
  quality_score INT,
  usage_count INT,
  last_used_at TIMESTAMPTZ,
  avg_story_rating DECIMAL(3,2),
  selection_score DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sb.id,
    sb.archetype_name,
    sb.style_data,
    sb.quality_score,
    sb.usage_count,
    sb.last_used_at,
    sb.avg_story_rating,
    (
      -- ベーススコア（既存ロジック）
      LEAST(
        EXTRACT(EPOCH FROM (NOW() - COALESCE(sb.last_used_at, NOW() - INTERVAL '30 days'))) / 86400 * 2,
        50
      ) +
      COALESCE(sb.avg_story_rating, 3) * 10 +
      sb.quality_score * 0.3
      -- 問題発生率によるペナルティ（新規追加）
      - COALESCE(sis.coherence_issue_rate, 0) * 25      -- 支離滅裂: 最大-25点
      - COALESCE(sis.action_issue_rate, 0) * 20         -- 行動不整合: 最大-20点
      - COALESCE(sis.event_repetition_rate, 0) * 15     -- 出来事再描写: 最大-15点
      - COALESCE(sis.quote_issue_rate, 0) * 10          -- 未完セリフ: 最大-10点
      - COALESCE(sis.review_issue_rate, 0) * 15         -- レビュー問題タグ: 最大-15点
    )::DECIMAL(10,2) AS selection_score
  FROM style_blueprints sb
  LEFT JOIN style_blueprint_issue_stats sis ON sis.style_blueprint_id = sb.id
  WHERE sb.is_active = true
  ORDER BY selection_score DESC
  LIMIT 5;
END;
$$;

COMMENT ON FUNCTION select_style_blueprint IS
  'StyleBlueprint選択（評価・品質・問題率の複合スコア）';
