/**
 * 連続多様性ガード
 * 直近の怪談と舞台/人物/流れが似すぎないように制御
 */

// =============================================
// 型定義
// =============================================

export type SettingType = 'island' | 'mountain' | 'urban' | 'indoor' | 'rural' | 'coastal' | 'underground' | 'transport' | 'other';
export type CastType = 'solo' | 'duo' | 'group' | 'crowd';
export type FlowType = 'explore_in' | 'stay' | 'commute' | 'visit' | 'escape' | 'return' | 'other';

export interface StoryMeta {
  setting: SettingType;
  cast: CastType;
  flow: FlowType;
}

export interface DiversityCheckResult {
  shouldRetry: boolean;
  reason: string | null;
}

// =============================================
// キーワード辞書
// =============================================

const SETTING_KEYWORDS: Record<SettingType, string[]> = {
  island: ['島', '離島', '無人島', '船', '港', '漁村', 'フェリー'],
  mountain: ['山', '登山', '山小屋', '峠', '森', '林', '渓谷', 'キャンプ', 'トレッキング', '山道'],
  urban: ['都会', '都市', 'ビル', 'マンション', 'アパート', '駅', '電車', '地下鉄', 'オフィス', '繁華街', '商店街'],
  indoor: ['部屋', '家', '自宅', '実家', '祖父母', '旅館', 'ホテル', '病院', '学校', '教室', '廊下', '階段'],
  rural: ['田舎', '村', '集落', '農村', '田んぼ', '畑', '農家', '過疎', '廃村'],
  coastal: ['海', '浜', '海岸', '砂浜', '灯台', '防波堤', '漁港'],
  underground: ['地下', 'トンネル', '洞窟', '地下室', '地下道', '防空壕', '坑道'],
  transport: ['車', '車内', 'タクシー', 'バス', '電車内', '飛行機', '新幹線', '夜行'],
  other: [],
};

const CAST_KEYWORDS: Record<CastType, string[]> = {
  solo: ['一人', '独り', '俺は', '私は', '僕は', '一人で', '単独'],
  duo: ['二人', '友人と', '彼女と', '彼と', '妻と', '夫と', '母と', '父と', '兄と', '姉と', '弟と', '妹と'],
  group: ['三人', '四人', '五人', 'グループ', '仲間', 'サークル', '部活', 'メンバー', '友人たち'],
  crowd: ['大勢', '人混み', '集団', '村人', '住民', 'たくさんの人'],
};

const FLOW_KEYWORDS: Record<FlowType, string[]> = {
  explore_in: ['入った', '踏み込んだ', '奥へ', '探検', '探索', '潜入', '侵入', '立ち入った'],
  stay: ['泊まった', '宿泊', '滞在', '住んで', '暮らして', '過ごして'],
  commute: ['通って', '通勤', '通学', '毎日', '日課', 'いつもの'],
  visit: ['訪れた', '行った', '来た', '遊びに', '帰省', '見に行った', '訪問'],
  escape: ['逃げた', '走った', '脱出', '逃走', '逃れた', '飛び出した'],
  return: ['戻った', '帰った', '帰路', '帰り道', '引き返した'],
  other: [],
};

// =============================================
// 特徴抽出
// =============================================

/**
 * テキストから舞台を判定
 */
function detectSetting(text: string): SettingType {
  const lowerText = text.toLowerCase();

  for (const [setting, keywords] of Object.entries(SETTING_KEYWORDS)) {
    if (setting === 'other') continue;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return setting as SettingType;
      }
    }
  }

  return 'other';
}

/**
 * テキストから人物構成を判定
 */
function detectCast(text: string): CastType {
  // 優先度順にチェック（crowdが最優先、soloが最後）
  for (const keyword of CAST_KEYWORDS.crowd) {
    if (text.includes(keyword)) return 'crowd';
  }
  for (const keyword of CAST_KEYWORDS.group) {
    if (text.includes(keyword)) return 'group';
  }
  for (const keyword of CAST_KEYWORDS.duo) {
    if (text.includes(keyword)) return 'duo';
  }

  // デフォルトはsolo
  return 'solo';
}

/**
 * テキストから流れを判定
 */
function detectFlow(text: string): FlowType {
  for (const [flow, keywords] of Object.entries(FLOW_KEYWORDS)) {
    if (flow === 'other') continue;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return flow as FlowType;
      }
    }
  }

  return 'other';
}

/**
 * ストーリーからメタ情報を抽出
 */
export function extractStoryMeta(storyText: string): StoryMeta {
  return {
    setting: detectSetting(storyText),
    cast: detectCast(storyText),
    flow: detectFlow(storyText),
  };
}

// =============================================
// 多様性チェック
// =============================================

/**
 * 直近のメタと比較して多様性ガードを発動すべきか判定
 */
export function shouldTriggerDiversityGuard(
  currentMeta: StoryMeta,
  recentMetas: StoryMeta[]
): DiversityCheckResult {
  if (recentMetas.length === 0) {
    return { shouldRetry: false, reason: null };
  }

  // 直近1件と完全一致チェック
  const lastMeta = recentMetas[0];
  if (
    currentMeta.setting === lastMeta.setting &&
    currentMeta.cast === lastMeta.cast &&
    currentMeta.flow === lastMeta.flow
  ) {
    return {
      shouldRetry: true,
      reason: 'same_combo',
    };
  }

  // 直近3件で同じ舞台が続いているかチェック
  const settingCount = recentMetas.slice(0, 3).filter(m => m.setting === currentMeta.setting).length;
  if (settingCount >= 2 && currentMeta.setting !== 'other') {
    return {
      shouldRetry: true,
      reason: 'same_setting',
    };
  }

  // 直近3件で同じ人物構成が続いているかチェック
  const castCount = recentMetas.slice(0, 3).filter(m => m.cast === currentMeta.cast).length;
  if (castCount >= 2) {
    return {
      shouldRetry: true,
      reason: 'same_cast',
    };
  }

  // 直近3件で同じ流れが続いているかチェック
  const flowCount = recentMetas.slice(0, 3).filter(m => m.flow === currentMeta.flow).length;
  if (flowCount >= 2 && currentMeta.flow !== 'other') {
    return {
      shouldRetry: true,
      reason: 'same_flow',
    };
  }

  return { shouldRetry: false, reason: null };
}

/**
 * 多様性ガードで回避すべき特徴をプロンプト用に生成
 */
export function buildDiversityAvoidanceHint(recentMetas: StoryMeta[]): string {
  if (recentMetas.length === 0) return '';

  const recentSettings = [...new Set(recentMetas.slice(0, 3).map(m => m.setting).filter(s => s !== 'other'))];
  const recentCasts = [...new Set(recentMetas.slice(0, 3).map(m => m.cast))];
  const recentFlows = [...new Set(recentMetas.slice(0, 3).map(m => m.flow).filter(f => f !== 'other'))];

  const hints: string[] = [];

  if (recentSettings.length > 0) {
    const settingNames: Record<SettingType, string> = {
      island: '島', mountain: '山', urban: '都市', indoor: '屋内',
      rural: '田舎', coastal: '海辺', underground: '地下', transport: '乗り物', other: ''
    };
    hints.push(`舞台は直近と異なるもの（${recentSettings.map(s => settingNames[s]).join('、')}以外）`);
  }

  if (recentCasts.length > 0) {
    const castNames: Record<CastType, string> = {
      solo: '一人', duo: '二人', group: 'グループ', crowd: '大勢'
    };
    hints.push(`人物構成は直近と異なるもの（${recentCasts.map(c => castNames[c]).join('、')}以外）`);
  }

  return hints.length > 0 ? `\n\n多様性確保のため: ${hints.join('、')}` : '';
}
