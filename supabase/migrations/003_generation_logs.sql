-- =============================================
-- 3フェーズ生成ログテーブル
-- 生成ごとにBlueprint情報・各フェーズのプロンプト/出力を保存
-- フォールバック情報も記録
-- =============================================

CREATE TABLE IF NOT EXISTS generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  -- Blueprint情報
  -- used_blueprint_id は汎用Blueprint（-1）の場合もあるため BIGINT（NULLABLEにしない）
  used_blueprint_id BIGINT NOT NULL,
  used_blueprint_title TEXT NOT NULL,
  used_blueprint_quality_score INT NOT NULL,

  -- フォールバック情報
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_reason TEXT NOT NULL DEFAULT 'hit' CHECK (fallback_reason IN ('hit', 'near', 'generic')),

  -- 生成設定
  generation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 例: {"topK": 1, "minQuality": 70, "model": "claude-sonnet-4-20250514"}

  -- Phase A: opening
  phase_a_prompt TEXT NOT NULL,
  phase_a_text TEXT NOT NULL,

  -- Phase B: disturbance
  phase_b_prompt TEXT NOT NULL,
  phase_b_text TEXT NOT NULL,

  -- Phase C: irreversible_point
  phase_c_prompt TEXT NOT NULL,
  phase_c_text TEXT NOT NULL,

  -- 最終出力
  final_story TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_generation_logs_story_id ON generation_logs(story_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_blueprint_id ON generation_logs(used_blueprint_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_created_at ON generation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_logs_fallback ON generation_logs(fallback_used, fallback_reason);

-- コメント
COMMENT ON TABLE generation_logs IS '3フェーズ生成のログ。Blueprint選択からPhase A/B/Cの各プロンプト・出力を記録';
COMMENT ON COLUMN generation_logs.used_blueprint_id IS 'Blueprint ID（汎用Blueprint使用時は -1）';
COMMENT ON COLUMN generation_logs.fallback_used IS 'フォールバックを使用したかどうか';
COMMENT ON COLUMN generation_logs.fallback_reason IS 'Blueprint選択結果: hit=厳格マッチ, near=緩いマッチ, generic=汎用Blueprint';
COMMENT ON COLUMN generation_logs.generation_config IS '生成設定 (topK, minQuality, model)';
COMMENT ON COLUMN generation_logs.phase_a_prompt IS 'Phase A (opening) のプロンプト';
COMMENT ON COLUMN generation_logs.phase_a_text IS 'Phase A (opening) の生成テキスト';
COMMENT ON COLUMN generation_logs.phase_b_prompt IS 'Phase B (disturbance) のプロンプト';
COMMENT ON COLUMN generation_logs.phase_b_text IS 'Phase B (disturbance) の生成テキスト';
COMMENT ON COLUMN generation_logs.phase_c_prompt IS 'Phase C (irreversible_point) のプロンプト';
COMMENT ON COLUMN generation_logs.phase_c_text IS 'Phase C (irreversible_point) の生成テキスト';
COMMENT ON COLUMN generation_logs.final_story IS '3フェーズを連結した最終怪談本文';

-- =============================================
-- フォールバック統計用ビュー（運用監視用）
-- =============================================

CREATE OR REPLACE VIEW generation_fallback_stats AS
SELECT
  fallback_reason,
  fallback_used,
  COUNT(*) AS count,
  DATE_TRUNC('day', created_at) AS day
FROM generation_logs
GROUP BY fallback_reason, fallback_used, DATE_TRUNC('day', created_at)
ORDER BY day DESC, fallback_reason;

COMMENT ON VIEW generation_fallback_stats IS '日別フォールバック統計。hit/near/genericの使用状況を監視';
