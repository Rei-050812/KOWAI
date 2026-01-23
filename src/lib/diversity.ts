/**
 * 連続多様性ガード
 * 直近の怪談と舞台/人物/流れが似すぎないように制御
 * + 語彙クールダウン制御
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
  // 語彙クールダウン用：抽出した特徴的な名詞
  notableNouns?: string[];
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
    notableNouns: extractNotableNouns(storyText),
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

// =============================================
// 語彙クールダウン制御
// =============================================

/**
 * 特徴的な名詞（小道具・道具・場所・物体）のパターン
 * 怪談で繰り返し使われやすい名詞を抽出
 */
const NOTABLE_NOUN_PATTERNS = [
  // 観察道具
  /双眼鏡/g, /望遠鏡/g, /カメラ/g, /ビデオカメラ/g, /スマホ/g, /携帯/g,
  // 照明
  /懐中電灯/g, /ライト/g, /ランタン/g, /蝋燭/g, /ろうそく/g,
  // 乗り物
  /自転車/g, /バイク/g, /オートバイ/g, /車/g, /タクシー/g, /バス/g,
  // 通信
  /電話/g, /インターホン/g, /チャイム/g, /ベル/g,
  // 家具・建具
  /鏡/g, /時計/g, /テレビ/g, /ラジオ/g, /冷蔵庫/g,
  /ドア/g, /扉/g, /窓/g, /カーテン/g, /障子/g, /襖/g,
  // 収納
  /押入れ/g, /クローゼット/g, /箪笥/g, /タンス/g, /引き出し/g,
  // 場所・建物
  /井戸/g, /池/g, /川/g, /橋/g, /トンネル/g, /洞窟/g,
  /神社/g, /寺/g, /墓地/g, /墓/g, /祠/g, /鳥居/g,
  /廃墟/g, /廃屋/g, /空き家/g, /廃病院/g, /廃校/g,
  // 自然物
  /木/g, /森/g, /林/g, /山/g, /海/g, /湖/g,
  // 物品
  /人形/g, /ぬいぐるみ/g, /写真/g, /絵/g, /手紙/g, /日記/g,
  /箱/g, /壺/g, /お札/g, /御札/g, /お守り/g,
  // 身体部位（怪異の特徴）
  /目/g, /手/g, /足/g, /顔/g, /髪/g, /指/g,
  // 音
  /足音/g, /物音/g, /笑い声/g, /泣き声/g, /囁き/g,
];

/**
 * テキストから特徴的な名詞を抽出
 */
export function extractNotableNouns(text: string): string[] {
  const nouns: string[] = [];

  for (const pattern of NOTABLE_NOUN_PATTERNS) {
    // パターンをリセット（グローバルフラグ対策）
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) {
      nouns.push(...matches);
    }
  }

  // 重複排除して出現回数でソート
  const nounCounts = new Map<string, number>();
  for (const noun of nouns) {
    nounCounts.set(noun, (nounCounts.get(noun) || 0) + 1);
  }

  // 出現回数が多い順にソートして返す
  return [...nounCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([noun]) => noun);
}

/**
 * 語彙クールダウンチェック結果
 */
export interface VocabCooldownResult {
  avoidList: string[];
  detected: boolean;
}

/**
 * 直近のストーリーから高頻度名詞を抽出してクールダウンリストを生成
 * @param recentMetas 直近のストーリーメタ情報
 * @param maxItems 最大項目数
 */
export function buildVocabCooldownList(
  recentMetas: StoryMeta[],
  maxItems: number = 5
): VocabCooldownResult {
  if (recentMetas.length === 0) {
    return { avoidList: [], detected: false };
  }

  // 直近のストーリーから名詞を集計
  const nounCounts = new Map<string, number>();

  for (const meta of recentMetas) {
    if (meta.notableNouns) {
      for (const noun of meta.notableNouns) {
        nounCounts.set(noun, (nounCounts.get(noun) || 0) + 1);
      }
    }
  }

  // 2回以上出現した名詞をクールダウン対象に
  const frequentNouns = [...nounCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([noun]) => noun);

  return {
    avoidList: frequentNouns,
    detected: frequentNouns.length > 0,
  };
}

/**
 * 語彙クールダウン用のプロンプトヒントを生成
 */
export function buildVocabCooldownHint(avoidList: string[]): string {
  if (avoidList.length === 0) return '';

  return `\n\n【語彙多様性】直近で頻出した以下の語彙は可能な限り避け、別の表現・道具を使ってください: ${avoidList.join('、')}`;
}
