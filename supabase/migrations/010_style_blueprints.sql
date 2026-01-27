-- =============================================
-- StyleBlueprint: 書き方の流派（アーキタイプ）
-- =============================================

-- 1. style_blueprints テーブル作成
CREATE TABLE IF NOT EXISTS style_blueprints (
  id BIGSERIAL PRIMARY KEY,
  archetype_name TEXT NOT NULL UNIQUE,
  style_data JSONB NOT NULL,
  quality_score INT NOT NULL DEFAULT 70 CHECK (quality_score >= 0 AND quality_score <= 100),
  usage_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  avg_story_rating DECIMAL(3,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. インデックス
CREATE INDEX IF NOT EXISTS idx_style_blueprints_active
ON style_blueprints (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_style_blueprints_selection
ON style_blueprints (is_active, last_used_at, avg_story_rating);

-- 3. updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS trigger_style_blueprints_updated_at ON style_blueprints;
CREATE TRIGGER trigger_style_blueprints_updated_at
  BEFORE UPDATE ON style_blueprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. generation_logs に style_blueprint 関連カラムを追加
ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS style_blueprint_id BIGINT REFERENCES style_blueprints(id);

ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS style_blueprint_name TEXT;

-- 5. RPC: StyleBlueprint選択（使用頻度・評価・品質の複合スコア）
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
      LEAST(
        EXTRACT(EPOCH FROM (NOW() - COALESCE(sb.last_used_at, NOW() - INTERVAL '30 days'))) / 86400 * 2,
        50
      ) +
      COALESCE(sb.avg_story_rating, 3) * 10 +
      sb.quality_score * 0.3
    )::DECIMAL(10,2) AS selection_score
  FROM style_blueprints sb
  WHERE sb.is_active = true
  ORDER BY selection_score DESC
  LIMIT 5;
END;
$$;

-- 6. RPC: StyleBlueprint使用記録
CREATE OR REPLACE FUNCTION record_style_blueprint_usage(
  p_style_id BIGINT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE style_blueprints
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_style_id;
END;
$$;

-- 7. 初期データ（5つの基本流派）- JSON を1行に圧縮
INSERT INTO style_blueprints (archetype_name, style_data, quality_score) VALUES
('実録調', '{"archetype_name":"実録調","tone_features":["時系列を正確に追う","記憶の曖昧さを残す（〜だったと思う）","事実の羅列を優先","主観的な判断を避ける"],"narrator_stance":"involved","emotion_level":0,"sentence_style":"mixed","onomatopoeia_usage":"minimal","dialogue_style":"functional","style_prohibitions":["文学的比喩","感情の直接表現","読者への語りかけ"],"sample_phrases":["〜だったと思う","確か〜だった","今でもはっきり覚えている","〜したはずだ"]}'::JSONB, 80),
('報告書風', '{"archetype_name":"報告書風","tone_features":["箇条書き的な簡潔さ","主観を徹底排除","時刻・場所を明記","事実のみを淡々と"],"narrator_stance":"detached","emotion_level":0,"sentence_style":"short","onomatopoeia_usage":"none","dialogue_style":"rare","style_prohibitions":["形容詞の多用","感想","推測","比喩表現"],"sample_phrases":["〜時頃","〜において","確認した","〜と認められる"]}'::JSONB, 75),
('ぶっきらぼう', '{"archetype_name":"ぶっきらぼう","tone_features":["短い文を連ねる","説明を省略","投げやりなトーン","余計なことは言わない"],"narrator_stance":"detached","emotion_level":0,"sentence_style":"short","onomatopoeia_usage":"minimal","dialogue_style":"functional","style_prohibitions":["丁寧語","長い説明","感情表現","修飾過多"],"sample_phrases":["知らない","そういうことだ","それだけ","以上"]}'::JSONB, 70),
('回想録風', '{"archetype_name":"回想録風","tone_features":["過去形で振り返る","時間の経過を意識させる","今だから言える距離感","当時の自分を客観視"],"narrator_stance":"distant","emotion_level":1,"sentence_style":"flowing","onomatopoeia_usage":"minimal","dialogue_style":"natural","style_prohibitions":["現在形の多用","読者への語りかけ","説明的な解説"],"sample_phrases":["あの頃は","今思えば","当時の私は","それから何年も経った今でも"]}'::JSONB, 75),
('淡々記録', '{"archetype_name":"淡々記録","tone_features":["感情を完全に排除","観察者の視点","事実だけを並べる","判断を下さない"],"narrator_stance":"detached","emotion_level":0,"sentence_style":"mixed","onomatopoeia_usage":"minimal","dialogue_style":"functional","style_prohibitions":["感情語","推測","解釈","比喩"],"sample_phrases":["〜があった","〜を見た","〜と言った","それだけのことだ"]}'::JSONB, 80)
ON CONFLICT (archetype_name) DO NOTHING;
