-- =============================================
-- Admin all/random queue views (unreviewed only)
-- =============================================

CREATE OR REPLACE VIEW admin_all_queue AS
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
  gl.fallback_reason
FROM generation_logs gl
JOIN stories s ON s.id = gl.story_id
LEFT JOIN story_reviews r ON r.story_id = s.id
WHERE r.id IS NULL
ORDER BY gl.created_at DESC;

CREATE OR REPLACE VIEW admin_random_queue AS
SELECT * FROM admin_all_queue
ORDER BY random();

COMMENT ON VIEW admin_all_queue IS 'Unreviewed all items in newest-first order.';
COMMENT ON VIEW admin_random_queue IS 'Unreviewed all items in random order.';
