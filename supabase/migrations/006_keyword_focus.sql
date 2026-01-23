-- =============================================
-- キーワード主役化チェック用カラム追加
-- =============================================

-- generation_logsテーブルにキーワード主役化チェック関連カラムを追加
ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS keyword_focus_ok BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS keyword_focus_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS keyword_focus_retry_count INT NOT NULL DEFAULT 0;

-- コメント
COMMENT ON COLUMN generation_logs.keyword_focus_ok IS 'キーワード主役化チェック結果（キーワードが怪異の核として機能しているか）';
COMMENT ON COLUMN generation_logs.keyword_focus_count IS 'キーワードの出現回数（Phase B + C）';
COMMENT ON COLUMN generation_logs.keyword_focus_retry_count IS 'キーワード主役化のための再生成回数';

-- =============================================
-- 品質監視用ビュー更新
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
  -- キーワード主役化チェック
  SUM(CASE WHEN NOT keyword_focus_ok THEN 1 ELSE 0 END) AS keyword_focus_failed_count,
  SUM(keyword_focus_retry_count) AS total_keyword_focus_retries,
  AVG(keyword_focus_count) AS avg_keyword_focus_count,
  -- リトライ合計
  SUM(retry_count_phase_a + retry_count_phase_b + retry_count_phase_c) AS total_phase_retries
FROM generation_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

COMMENT ON VIEW generation_quality_stats IS '日別品質統計。重複除去・多様性ガード・クライマックスチェック・キーワード主役化チェックの発動状況を監視';
