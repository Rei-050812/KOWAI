-- =============================================
-- admin_review_queue を admin_all_queue と同じカラム構成に統一
-- =============================================

-- 既存のビューを削除してから再作成
DROP VIEW IF EXISTS admin_review_queue;

CREATE VIEW admin_review_queue AS
SELECT
  gl.id AS log_id,
  s.id AS story_id,
  s.title,
  s.hook,
  s.story,
  COALESCE(gl.final_story, s.story) AS story_text,
  gl.created_at,
  s.blueprint_id,
  s.style AS target_length,
  gl.ending_type,
  gl.event_repetition_detected,
  gl.action_consistency_issue,
  gl.quote_incomplete_detected,
  gl.coherence_issue,
  (gl.retry_count_phase_b + gl.retry_count_phase_c) AS retry_total,
  gl.fallback_reason,
  -- 優先度スコア計算
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

COMMENT ON VIEW admin_review_queue IS 'Admin review queue with priority scoring and unified columns (unreviewed only).';
