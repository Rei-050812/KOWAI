-- =============================================
-- ストーリー表示/非表示機能
-- =============================================

-- 1. storiesテーブルにis_visibleカラムを追加
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- 既存データはすべて表示状態にする
UPDATE stories SET is_visible = true WHERE is_visible IS NULL;

-- インデックス追加（フィルタリング高速化）
CREATE INDEX IF NOT EXISTS idx_stories_is_visible ON stories(is_visible);

-- 2. 評価1-2のレビューが付いたら自動で非表示にするトリガー
CREATE OR REPLACE FUNCTION auto_hide_low_rated_story()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 評価が1または2の場合、ストーリーを非表示にする
  IF NEW.rating IS NOT NULL AND NEW.rating <= 2 THEN
    UPDATE stories
    SET is_visible = false
    WHERE id = NEW.story_id;
  END IF;

  RETURN NEW;
END;
$$;

-- トリガー作成（INSERT/UPDATE時）
DROP TRIGGER IF EXISTS trigger_auto_hide_low_rated ON story_reviews;

CREATE TRIGGER trigger_auto_hide_low_rated
  AFTER INSERT OR UPDATE ON story_reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_hide_low_rated_story();

-- 3. 既存の低評価ストーリーを非表示にする（初回マイグレーション用）
UPDATE stories s
SET is_visible = false
WHERE EXISTS (
  SELECT 1 FROM story_reviews sr
  WHERE sr.story_id = s.id
    AND sr.rating IS NOT NULL
    AND sr.rating <= 2
);

COMMENT ON COLUMN stories.is_visible IS '表示フラグ: true=公開, false=非表示（低評価または手動非表示）';
COMMENT ON FUNCTION auto_hide_low_rated_story IS '評価1-2のレビューが付いたストーリーを自動で非表示にする';

-- 4. admin_review_queue ビューを更新（is_visibleを追加）
DROP VIEW IF EXISTS admin_review_queue CASCADE;
CREATE VIEW admin_review_queue AS
SELECT
  s.id AS story_id,
  s.title,
  s.hook,
  s.story,
  gl.final_story,
  gl.created_at,
  s.blueprint_id,
  s.is_visible,
  gl.event_repetition_detected,
  gl.action_consistency_issue,
  gl.quote_incomplete_detected,
  gl.coherence_issue,
  (gl.retry_count_phase_b + gl.retry_count_phase_c) AS retry_total,
  gl.fallback_reason,
  LEAST(
    100,
    (CASE WHEN gl.fallback_reason <> 'hit' THEN 30 ELSE 0 END) +
    (CASE WHEN gl.action_consistency_issue THEN 25 ELSE 0 END) +
    (CASE WHEN gl.event_repetition_detected THEN 20 ELSE 0 END) +
    (CASE WHEN gl.coherence_issue THEN 20 ELSE 0 END) +
    (CASE WHEN gl.quote_incomplete_detected THEN 15 ELSE 0 END) +
    (CASE WHEN (gl.retry_count_phase_b + gl.retry_count_phase_c) >= 2 THEN 10 ELSE 0 END)
  ) AS priority
FROM generation_logs gl
JOIN stories s ON s.id = gl.story_id
LEFT JOIN story_reviews r ON r.story_id = s.id
WHERE r.id IS NULL;

-- 5. admin_all_queue ビューを更新（is_visibleを追加、未レビューのみ）
DROP VIEW IF EXISTS admin_all_queue CASCADE;
CREATE VIEW admin_all_queue AS
SELECT *
FROM (
  SELECT
    gl.id AS log_id,
    s.id AS story_id,
    s.title,
    s.hook,
    s.story,
    COALESCE(gl.final_story, s.story) AS story_text,
    gl.created_at,
    s.blueprint_id,
    s.is_visible,
    s.style AS target_length,
    gl.ending_type,
    gl.event_repetition_detected,
    gl.action_consistency_issue,
    gl.quote_incomplete_detected,
    gl.coherence_issue,
    (gl.retry_count_phase_b + gl.retry_count_phase_c) AS retry_total,
    gl.fallback_reason
  FROM generation_logs gl
  JOIN stories s ON s.id = gl.story_id
  LEFT JOIN story_reviews r ON r.story_id = s.id
  WHERE r.id IS NULL

  UNION ALL

  SELECT
    NULL::uuid AS log_id,
    s.id AS story_id,
    s.title,
    s.hook,
    s.story,
    s.story AS story_text,
    s.created_at,
    s.blueprint_id,
    s.is_visible,
    s.style AS target_length,
    NULL::text AS ending_type,
    NULL::boolean AS event_repetition_detected,
    NULL::boolean AS action_consistency_issue,
    NULL::boolean AS quote_incomplete_detected,
    NULL::boolean AS coherence_issue,
    0::int AS retry_total,
    NULL::text AS fallback_reason
  FROM stories s
  LEFT JOIN generation_logs gl ON gl.story_id = s.id
  LEFT JOIN story_reviews r ON r.story_id = s.id
  WHERE r.id IS NULL AND gl.id IS NULL
) AS q
ORDER BY created_at DESC;

-- 6. admin_random_queue ビューを更新（is_visibleを追加）
DROP VIEW IF EXISTS admin_random_queue CASCADE;
CREATE VIEW admin_random_queue AS
SELECT * FROM admin_all_queue
ORDER BY RANDOM();
