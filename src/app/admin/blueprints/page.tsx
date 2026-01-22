"use client";

import { useState, useEffect } from "react";
import { KaidanBlueprintData, QualityScoreBreakdown, ValidationWarning } from "@/types";

// デフォルトのBlueprint構造
const DEFAULT_BLUEPRINT: KaidanBlueprintData = {
  anomaly: "",
  normal_rule: "",
  irreversible_point: "",
  reader_understands: "",
  reader_cannot_understand: "",
  constraints: {
    no_explanations: true,
    single_anomaly_only: true,
    no_emotion_words: true,
    no_clean_resolution: true,
    daily_details_min: 3,
  },
  allowed_subgenres: ["心霊", "異世界", "ヒトコワ", "禁忌"],
  detail_bank: ["生活音", "匂い", "時間帯", "天候", "生活用品"],
  ending_style: "前提が壊れた状態で停止（結末は描かない）",
};

// デフォルトの採点内訳
const DEFAULT_BREAKDOWN: QualityScoreBreakdown = {
  single_anomaly: 30,
  normal_rule_clarity: 20,
  irreversible_point_clarity: 25,
  no_explanations: 15,
  reusability: 10,
};

// 自動採点（機械チェック）
function autoValidate(blueprint: KaidanBlueprintData): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // anomalyが空または短すぎる
  if (!blueprint.anomaly || blueprint.anomaly.trim().length < 5) {
    warnings.push({
      field: "anomaly",
      message: "怪異の核が未設定または短すぎます",
      severity: "error",
      deduction: 30,
    });
  }

  // normal_ruleが空または短すぎる
  if (!blueprint.normal_rule || blueprint.normal_rule.trim().length < 5) {
    warnings.push({
      field: "normal_rule",
      message: "通常時の前提が未設定または短すぎます",
      severity: "error",
      deduction: 20,
    });
  }

  // irreversible_pointが空または短すぎる
  if (!blueprint.irreversible_point || blueprint.irreversible_point.trim().length < 5) {
    warnings.push({
      field: "irreversible_point",
      message: "不可逆の確定点が未設定または短すぎます",
      severity: "error",
      deduction: 25,
    });
  }

  // single_anomaly_onlyがfalse
  if (!blueprint.constraints?.single_anomaly_only) {
    warnings.push({
      field: "constraints.single_anomaly_only",
      message: "single_anomaly_onlyがfalseです（必須：true）",
      severity: "error",
      deduction: 30,
    });
  }

  // no_explanationsがfalse
  if (!blueprint.constraints?.no_explanations) {
    warnings.push({
      field: "constraints.no_explanations",
      message: "no_explanationsがfalseです（推奨：true）",
      severity: "warning",
      deduction: 10,
    });
  }

  // reader_understandsが空
  if (!blueprint.reader_understands || blueprint.reader_understands.trim().length < 3) {
    warnings.push({
      field: "reader_understands",
      message: "読者が理解できることが未設定です",
      severity: "warning",
      deduction: 5,
    });
  }

  // reader_cannot_understandが空
  if (!blueprint.reader_cannot_understand || blueprint.reader_cannot_understand.trim().length < 3) {
    warnings.push({
      field: "reader_cannot_understand",
      message: "読者が理解できないことが未設定です",
      severity: "warning",
      deduction: 5,
    });
  }

  // ending_styleが空
  if (!blueprint.ending_style || blueprint.ending_style.trim().length < 3) {
    warnings.push({
      field: "ending_style",
      message: "結末スタイルが未設定です",
      severity: "warning",
      deduction: 5,
    });
  }

  // detail_bankが少ない
  if (!blueprint.detail_bank || blueprint.detail_bank.length < 3) {
    warnings.push({
      field: "detail_bank",
      message: "日常ディテールバンクが3つ未満です",
      severity: "warning",
      deduction: 3,
    });
  }

  // allowed_subgenresが空
  if (!blueprint.allowed_subgenres || blueprint.allowed_subgenres.length === 0) {
    warnings.push({
      field: "allowed_subgenres",
      message: "許可サブジャンルが未設定です",
      severity: "warning",
      deduction: 2,
    });
  }

  return warnings;
}

// タグを自動生成
function generateTags(blueprint: KaidanBlueprintData): string[] {
  const tags: string[] = [];

  // anomalyから抽出（最初の10文字程度をキーワードとして）
  if (blueprint.anomaly) {
    const anomalyWords = blueprint.anomaly.slice(0, 20).split(/[、。\s]+/).filter(w => w.length >= 2);
    tags.push(...anomalyWords.slice(0, 3));
  }

  // allowed_subgenresから
  if (blueprint.allowed_subgenres) {
    tags.push(...blueprint.allowed_subgenres);
  }

  // detail_bankから主要なものを
  if (blueprint.detail_bank) {
    tags.push(...blueprint.detail_bank.slice(0, 3));
  }

  // 重複除去
  return [...new Set(tags)];
}

export default function AdminBlueprintsPage() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [blueprintJson, setBlueprintJson] = useState(
    JSON.stringify(DEFAULT_BLUEPRINT, null, 2)
  );

  // 採点内訳
  const [breakdown, setBreakdown] = useState<QualityScoreBreakdown>(DEFAULT_BREAKDOWN);
  const [qualityScore, setQualityScore] = useState(100);

  // 自動採点結果
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);

  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });

  // 内訳が変わったら合計を再計算
  useEffect(() => {
    const total =
      breakdown.single_anomaly +
      breakdown.normal_rule_clarity +
      breakdown.irreversible_point_clarity +
      breakdown.no_explanations +
      breakdown.reusability;
    setQualityScore(Math.min(100, Math.max(0, total)));
  }, [breakdown]);

  const handleBreakdownChange = (key: keyof QualityScoreBreakdown, value: number) => {
    const maxValues: Record<keyof QualityScoreBreakdown, number> = {
      single_anomaly: 30,
      normal_rule_clarity: 20,
      irreversible_point_clarity: 25,
      no_explanations: 15,
      reusability: 10,
    };
    setBreakdown(prev => ({
      ...prev,
      [key]: Math.min(maxValues[key], Math.max(0, value)),
    }));
  };

  const handleAutoValidate = () => {
    try {
      const blueprint = JSON.parse(blueprintJson) as KaidanBlueprintData;
      const result = autoValidate(blueprint);
      setWarnings(result);

      if (result.length === 0) {
        setStatus({ type: "success", message: "検証OK：問題は見つかりませんでした" });
      } else {
        const errors = result.filter(w => w.severity === "error");
        const warns = result.filter(w => w.severity === "warning");
        setStatus({
          type: errors.length > 0 ? "error" : "success",
          message: `エラー: ${errors.length}件, 警告: ${warns.length}件`,
        });
      }
    } catch {
      setStatus({ type: "error", message: "JSONの形式が不正です" });
      setWarnings([]);
    }
  };

  const handleAutoGenerateTags = () => {
    try {
      const blueprint = JSON.parse(blueprintJson) as KaidanBlueprintData;
      const autoTags = generateTags(blueprint);
      setTags(autoTags.join(", "));
      setStatus({ type: "success", message: `${autoTags.length}個のタグを自動生成しました` });
    } catch {
      setStatus({ type: "error", message: "JSONの形式が不正です" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "保存中..." });

    try {
      const blueprint = JSON.parse(blueprintJson);

      const response = await fetch("/api/blueprints/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t),
          quality_score: qualityScore,
          score_breakdown: breakdown,
          blueprint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "保存に失敗しました");
      }

      setStatus({ type: "success", message: `保存完了 (ID: ${data.id}, スコア: ${data.quality_score})` });
      // フォームリセット
      setTitle("");
      setTags("");
      setBreakdown(DEFAULT_BREAKDOWN);
      setBlueprintJson(JSON.stringify(DEFAULT_BLUEPRINT, null, 2));
      setWarnings([]);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "エラーが発生しました",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Blueprint管理</h1>
        <p className="text-gray-400 mb-8">
          怪談生成のための設計図（Blueprint）を登録します。
          <br />
          ※本文は保存禁止。抽象化された構造データのみを登録してください。
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium mb-2">
              タイトル <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="例: 鏡の向こう側パターン"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
            />
          </div>

          {/* タグ */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                タグ（カンマ区切り）
              </label>
              <button
                type="button"
                onClick={handleAutoGenerateTags}
                className="text-xs px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded"
              >
                自動生成
              </button>
            </div>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例: 鏡, 目撃系, 心霊"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
            />
          </div>

          {/* 採点内訳 */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-bold mb-4">
              品質スコア: <span className="text-red-400">{qualityScore}</span>/100
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Single Anomaly */}
              <div>
                <label className="block text-sm mb-1">
                  怪異の単一性: {breakdown.single_anomaly}/30
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={breakdown.single_anomaly}
                  onChange={(e) => handleBreakdownChange("single_anomaly", Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Normal Rule Clarity */}
              <div>
                <label className="block text-sm mb-1">
                  通常時の前提が明確: {breakdown.normal_rule_clarity}/20
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={breakdown.normal_rule_clarity}
                  onChange={(e) => handleBreakdownChange("normal_rule_clarity", Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Irreversible Point Clarity */}
              <div>
                <label className="block text-sm mb-1">
                  不可逆の確定が明確: {breakdown.irreversible_point_clarity}/25
                </label>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={breakdown.irreversible_point_clarity}
                  onChange={(e) => handleBreakdownChange("irreversible_point_clarity", Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* No Explanations */}
              <div>
                <label className="block text-sm mb-1">
                  説明に逃げていない: {breakdown.no_explanations}/15
                </label>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={breakdown.no_explanations}
                  onChange={(e) => handleBreakdownChange("no_explanations", Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Reusability */}
              <div>
                <label className="block text-sm mb-1">
                  転用可能性: {breakdown.reusability}/10
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={breakdown.reusability}
                  onChange={(e) => handleBreakdownChange("reusability", Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Blueprint JSON */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                Blueprint JSON <span className="text-red-400">*</span>
              </label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={handleAutoValidate}
                  className="text-xs px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded"
                >
                  自動採点
                </button>
              </div>
            </div>
            <textarea
              value={blueprintJson}
              onChange={(e) => setBlueprintJson(e.target.value)}
              required
              rows={18}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          {/* 警告表示 */}
          {warnings.length > 0 && (
            <div className="p-4 bg-gray-800 rounded-lg space-y-2">
              <h4 className="font-bold text-yellow-400">検証結果</h4>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`p-2 rounded text-sm ${
                    w.severity === "error"
                      ? "bg-red-900/50 text-red-300"
                      : "bg-yellow-900/50 text-yellow-300"
                  }`}
                >
                  <span className="font-mono text-xs">[{w.field}]</span> {w.message}
                  <span className="ml-2 text-xs">(-{w.deduction}点)</span>
                </div>
              ))}
            </div>
          )}

          {/* ステータス表示 */}
          {status.type !== "idle" && (
            <div
              className={`p-4 rounded-lg ${
                status.type === "success"
                  ? "bg-green-900/50 text-green-300"
                  : status.type === "error"
                  ? "bg-red-900/50 text-red-300"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              {status.message}
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={status.type === "loading"}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {status.type === "loading" ? "保存中..." : `Blueprintを保存（スコア: ${qualityScore}）`}
          </button>
        </form>

        {/* 採点基準の説明 */}
        <div className="mt-12 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-bold mb-4">採点基準</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-red-400">Single Anomaly (0-30)</dt>
              <dd className="text-gray-400">怪異は必ず1種類のみ。途中で増えない</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-red-400">Normal Rule Clarity (0-20)</dt>
              <dd className="text-gray-400">通常時の前提が明確（読者が迷わない）</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-red-400">Irreversible Point (0-25)</dt>
              <dd className="text-gray-400">世界の前提が不可逆に確定する事実が明確</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-red-400">No Explanations (0-15)</dt>
              <dd className="text-gray-400">正体・原因・仕組みの説明に逃げていない</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-red-400">Reusability (0-10)</dt>
              <dd className="text-gray-400">固有事例すぎず、別シチュに転用可能</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-500">
            ※生成時はquality_score 70以上のBlueprintが優先されます
          </p>
        </div>
      </div>
    </div>
  );
}
