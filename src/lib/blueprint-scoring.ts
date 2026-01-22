/**
 * Blueprint品質採点ロジック（フロント・バックエンド共通）
 *
 * 採点方式: 減点方式（100点満点からルール違反ごとに減点）
 * このファイルがスコア算出の「正」となる
 */

import { KaidanBlueprintData } from "@/types";

// 採点結果
export interface ScoringResult {
  score: number;           // 最終スコア (0-100)
  deductions: Deduction[]; // 減点項目リスト
  totalDeduction: number;  // 合計減点
}

// 減点項目
export interface Deduction {
  field: string;
  message: string;
  points: number;
  severity: "error" | "warning";
}

/**
 * Blueprintを採点し、スコアと減点理由を返す
 * これがスコア算出の唯一の正規ロジック
 */
export function scoreBlueprint(blueprint: KaidanBlueprintData): ScoringResult {
  const deductions: Deduction[] = [];

  // ===== 重大なルール違反 (error) =====

  // anomalyが空または短すぎる (-30)
  if (!blueprint.anomaly || blueprint.anomaly.trim().length < 5) {
    deductions.push({
      field: "anomaly",
      message: "怪異の核が未設定または短すぎます（5文字以上必要）",
      points: 30,
      severity: "error",
    });
  }

  // normal_ruleが空または短すぎる (-20)
  if (!blueprint.normal_rule || blueprint.normal_rule.trim().length < 5) {
    deductions.push({
      field: "normal_rule",
      message: "通常時の前提が未設定または短すぎます（5文字以上必要）",
      points: 20,
      severity: "error",
    });
  }

  // irreversible_pointが空または短すぎる (-25)
  if (!blueprint.irreversible_point || blueprint.irreversible_point.trim().length < 5) {
    deductions.push({
      field: "irreversible_point",
      message: "不可逆の確定点が未設定または短すぎます（5文字以上必要）",
      points: 25,
      severity: "error",
    });
  }

  // single_anomaly_onlyがfalse (-30)
  if (!blueprint.constraints?.single_anomaly_only) {
    deductions.push({
      field: "constraints.single_anomaly_only",
      message: "single_anomaly_onlyがfalseです（必須：true）",
      points: 30,
      severity: "error",
    });
  }

  // ===== 軽微なルール違反 (warning) =====

  // no_explanationsがfalse (-10)
  if (!blueprint.constraints?.no_explanations) {
    deductions.push({
      field: "constraints.no_explanations",
      message: "no_explanationsがfalseです（推奨：true）",
      points: 10,
      severity: "warning",
    });
  }

  // reader_understandsが空 (-5)
  if (!blueprint.reader_understands || blueprint.reader_understands.trim().length < 3) {
    deductions.push({
      field: "reader_understands",
      message: "読者が理解できることが未設定です",
      points: 5,
      severity: "warning",
    });
  }

  // reader_cannot_understandが空 (-5)
  if (!blueprint.reader_cannot_understand || blueprint.reader_cannot_understand.trim().length < 3) {
    deductions.push({
      field: "reader_cannot_understand",
      message: "読者が理解できないことが未設定です",
      points: 5,
      severity: "warning",
    });
  }

  // ending_styleが空 (-5)
  if (!blueprint.ending_style || blueprint.ending_style.trim().length < 3) {
    deductions.push({
      field: "ending_style",
      message: "結末スタイルが未設定です",
      points: 5,
      severity: "warning",
    });
  }

  // detail_bankが少ない (-3)
  if (!blueprint.detail_bank || blueprint.detail_bank.length < 3) {
    deductions.push({
      field: "detail_bank",
      message: "日常ディテールバンクが3つ未満です",
      points: 3,
      severity: "warning",
    });
  }

  // allowed_subgenresが空 (-2)
  if (!blueprint.allowed_subgenres || blueprint.allowed_subgenres.length === 0) {
    deductions.push({
      field: "allowed_subgenres",
      message: "許可サブジャンルが未設定です",
      points: 2,
      severity: "warning",
    });
  }

  // 合計減点を計算
  const totalDeduction = deductions.reduce((sum, d) => sum + d.points, 0);

  // 最終スコア (0-100にclamp)
  const score = Math.max(0, Math.min(100, 100 - totalDeduction));

  return {
    score,
    deductions,
    totalDeduction,
  };
}

/**
 * 減点項目をValidationWarning形式に変換（フロント互換用）
 */
export function deductionsToWarnings(deductions: Deduction[]) {
  return deductions.map(d => ({
    field: d.field,
    message: d.message,
    severity: d.severity,
    deduction: d.points,
  }));
}
