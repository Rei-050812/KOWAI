import { KaidanBlueprintData, BlueprintSearchResult } from "@/types";

/**
 * 汎用怪談Blueprint
 *
 * フォールバック用：キーワードにマッチするBlueprintがない場合に使用
 * - 怪異は1種類
 * - 原因説明は原則しないが、ending_mode="partial_explanation"で1点だけ明かすことは許可
 * - 日常ディテールや情景評価を過剰に入れない
 * - 洒落怖寄せの「短いセリフ」は使用可（説明セリフは禁止）
 */
export const GENERIC_BLUEPRINT_DATA: KaidanBlueprintData = {
  anomaly: "日常の中に紛れ込んだ、説明できない違和感。それは人の形をしていたり、音だったり、気配だったりする。正体は分からない。",
  normal_rule: "語り手は普通の日常を送っている。特別な能力も知識もない一般人。周囲も普通。",
  irreversible_point: "「おかしい」と気づいた瞬間、もう元の日常には戻れないと直感する。逃げても、忘れようとしても、何かが変わってしまった。",
  reader_understands: "何かがおかしいこと。語り手が恐怖を感じていること。",
  reader_cannot_understand: "それが何なのか。なぜ起きたのか。これからどうなるのか。",
  constraints: {
    no_explanations: true,
    single_anomaly_only: true,
    no_emotion_words: true,
    no_clean_resolution: true,
    daily_details_min: 2,
  },
  allowed_subgenres: ["心霊", "異世界", "ヒトコワ", "禁忌"],
  detail_bank: ["時計の音", "蛍光灯の明かり", "エアコンの音", "窓の外の音"],
  ending_style: "前提が崩れたまま終わる。解決も説明もしない。",
  ending_mode: "open",
};

/**
 * 汎用Blueprintの仮想ID（DBには存在しない）
 * 負の値を使用してDB上のIDと区別
 */
export const GENERIC_BLUEPRINT_ID = -1;

/**
 * 汎用BlueprintをBlueprintSearchResult形式で取得
 */
export function getGenericBlueprint(): BlueprintSearchResult {
  return {
    id: GENERIC_BLUEPRINT_ID,
    title: "汎用怪談Blueprint",
    blueprint: GENERIC_BLUEPRINT_DATA,
    tags: ["汎用", "フォールバック"],
    quality_score: 60, // 汎用なので中程度
    similarity: 0,
  };
}

/**
 * 汎用Blueprintかどうかを判定
 */
export function isGenericBlueprint(blueprintId: number): boolean {
  return blueprintId === GENERIC_BLUEPRINT_ID;
}
