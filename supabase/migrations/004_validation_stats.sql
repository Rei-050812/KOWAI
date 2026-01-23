-- =============================================
-- バリデーション統計カラム追加
-- generation_logsテーブルにリトライ回数・検出フラグを追加
-- =============================================

ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS retry_count_phase_a INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count_phase_b INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count_phase_c INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS keyword_miss_detected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS incomplete_quote_detected BOOLEAN NOT NULL DEFAULT FALSE;

-- コメント
COMMENT ON COLUMN generation_logs.retry_count_phase_a IS 'Phase Aの生成リトライ回数';
COMMENT ON COLUMN generation_logs.retry_count_phase_b IS 'Phase Bの生成リトライ回数';
COMMENT ON COLUMN generation_logs.retry_count_phase_c IS 'Phase Cの生成リトライ回数';
COMMENT ON COLUMN generation_logs.keyword_miss_detected IS 'キーワード欠落が検出されたか（最終結果）';
COMMENT ON COLUMN generation_logs.incomplete_quote_detected IS '未完セリフが検出されたか（最終結果）';

-- =============================================
-- バリデーション統計用ビュー
-- =============================================

CREATE OR REPLACE VIEW generation_validation_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS total_generations,
  SUM(retry_count_phase_a) AS total_retries_phase_a,
  SUM(retry_count_phase_b) AS total_retries_phase_b,
  SUM(retry_count_phase_c) AS total_retries_phase_c,
  SUM(CASE WHEN keyword_miss_detected THEN 1 ELSE 0 END) AS keyword_miss_count,
  SUM(CASE WHEN incomplete_quote_detected THEN 1 ELSE 0 END) AS incomplete_quote_count,
  ROUND(
    AVG(retry_count_phase_a + retry_count_phase_b + retry_count_phase_c)::numeric,
    2
  ) AS avg_total_retries
FROM generation_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

COMMENT ON VIEW generation_validation_stats IS '日別バリデーション統計。リトライ回数・検出率を監視';
