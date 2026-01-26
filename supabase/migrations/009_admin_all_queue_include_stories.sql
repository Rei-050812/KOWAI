-- =============================================
-- Include past stories without generation_logs in admin_all_queue
-- =============================================

CREATE OR REPLACE VIEW admin_all_queue AS
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

CREATE OR REPLACE VIEW admin_random_queue AS
SELECT * FROM admin_all_queue
ORDER BY random();

COMMENT ON VIEW admin_all_queue IS 'Unreviewed items incl. stories without generation_logs (newest-first).';
COMMENT ON VIEW admin_random_queue IS 'Unreviewed items incl. stories without generation_logs (random).';
