-- =============================================
-- 品質改善：重複除去/多様性ガード/クライマックスチェック
-- =============================================

-- 1. storiesテーブルにstory_metaカラムを追加（多様性ガード用）
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS story_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN stories.story_meta IS 'ストーリーのメタ情報 (setting, cast, flow) - 多様性ガード用';

-- インデックス（メタ情報での検索用）
CREATE INDEX IF NOT EXISTS idx_stories_story_meta ON stories USING GIN (story_meta);

-- 2. generation_logsテーブルに品質改善関連カラムを追加

-- 重複除去ログ
ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS dedupe_applied BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dedupe_target TEXT DEFAULT NULL CHECK (dedupe_target IN ('A-B', 'B-C', NULL)),
ADD COLUMN IF NOT EXISTS dedupe_method TEXT DEFAULT NULL CHECK (dedupe_method IN ('trim_head', NULL));

-- 多様性ガードログ
ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS diversity_guard_triggered BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS diversity_guard_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS diversity_retry_count INT NOT NULL DEFAULT 0;

-- Phase C クライマックスチェック
ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS ending_peak_ok BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ending_retry_count INT NOT NULL DEFAULT 0;

-- コメント
COMMENT ON COLUMN generation_logs.dedupe_applied IS '冒頭重複除去が適用されたか';
COMMENT ON COLUMN generation_logs.dedupe_target IS '重複除去対象: A-B または B-C';
COMMENT ON COLUMN generation_logs.dedupe_method IS '重複除去方法: trim_head';
COMMENT ON COLUMN generation_logs.diversity_guard_triggered IS '多様性ガードが発動したか';
COMMENT ON COLUMN generation_logs.diversity_guard_reason IS '多様性ガード発動理由: same_setting, same_cast, same_flow, same_combo';
COMMENT ON COLUMN generation_logs.diversity_retry_count IS '多様性ガードによる再生成回数';
COMMENT ON COLUMN generation_logs.ending_peak_ok IS 'Phase Cクライマックスチェック結果';
COMMENT ON COLUMN generation_logs.ending_retry_count IS 'Phase Cクライマックス再生成回数';

-- =============================================
-- 品質監視用ビュー
-- =============================================

CREATE OR REPLACE VIEW generation_quality_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS total_generations,
  -- 重複除去
  SUM(CASE WHEN dedupe_applied THEN 1 ELSE 0 END) AS dedupe_applied_count,
  -- 多様性ガード
  SUM(CASE WHEN diversity_guard_triggered THEN 1 ELSE 0 END) AS diversity_triggered_count,
  SUM(diversity_retry_count) AS total_diversity_retries,
  -- クライマックスチェック
  SUM(CASE WHEN NOT ending_peak_ok THEN 1 ELSE 0 END) AS ending_peak_failed_count,
  SUM(ending_retry_count) AS total_ending_retries,
  -- リトライ合計
  SUM(retry_count_phase_a + retry_count_phase_b + retry_count_phase_c) AS total_phase_retries
FROM generation_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

COMMENT ON VIEW generation_quality_stats IS '日別品質統計。重複除去・多様性ガード・クライマックスチェックの発動状況を監視';
