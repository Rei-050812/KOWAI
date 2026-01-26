-- =============================================
-- Reviews + coherence + admin queue
-- =============================================

-- story reviews
CREATE TABLE IF NOT EXISTS story_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  rating INT NULL CHECK (rating BETWEEN 1 AND 5),
  issues TEXT[] NOT NULL DEFAULT '{}'::text[],
  note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (story_id)
);

CREATE INDEX IF NOT EXISTS idx_story_reviews_story_id ON story_reviews(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reviews_created_at ON story_reviews(created_at DESC);

-- generation_logs: coherence + issue flags + ending control
ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS event_repetition_detected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS action_consistency_issue BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quote_incomplete_detected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coherence_issue BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coherence_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coherence_retry_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ending_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ending_hedge_phrase TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ending_has_hedge BOOLEAN NOT NULL DEFAULT FALSE;

-- admin review queue (unreviewed only)
CREATE OR REPLACE VIEW admin_review_queue AS
SELECT
  s.id AS story_id,
  s.title,
  s.hook,
  s.story,
  gl.final_story,
  gl.created_at,
  s.blueprint_id,
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

COMMENT ON VIEW admin_review_queue IS 'Admin review queue with priority scoring (unreviewed only).';

-- blueprint-level aggregate stats
CREATE OR REPLACE VIEW blueprint_quality_stats AS
SELECT
  gl.used_blueprint_id AS blueprint_id,
  gl.used_blueprint_title AS blueprint_title,
  COUNT(*) AS total_generated,
  ROUND(AVG(sr.rating)::numeric, 2) AS avg_rating,
  AVG(CASE WHEN gl.event_repetition_detected THEN 1 ELSE 0 END) AS event_repetition_rate,
  AVG(CASE WHEN gl.action_consistency_issue THEN 1 ELSE 0 END) AS action_issue_rate,
  AVG(CASE WHEN gl.quote_incomplete_detected THEN 1 ELSE 0 END) AS quote_issue_rate,
  AVG(CASE WHEN gl.coherence_issue THEN 1 ELSE 0 END) AS coherence_issue_rate,
  ROUND(AVG(gl.retry_count_phase_b + gl.retry_count_phase_c)::numeric, 2) AS avg_retry_count,
  AVG(CASE WHEN sr.rating IS NOT NULL AND sr.rating <= 2 THEN 1 ELSE 0 END) AS low_quality_rate
FROM generation_logs gl
LEFT JOIN story_reviews sr ON sr.story_id = gl.story_id
GROUP BY gl.used_blueprint_id, gl.used_blueprint_title;

COMMENT ON VIEW blueprint_quality_stats IS 'Blueprint-level quality aggregates for continuous improvement.';
