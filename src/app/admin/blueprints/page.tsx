"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { KaidanBlueprintData, ValidationWarning } from "@/types";
import { scoreBlueprint, deductionsToWarnings } from "@/lib/blueprint-scoring";

// sessionStorageキー（ingestページと共有）
const BLUEPRINT_STORAGE_KEY = "kowai_temp_blueprint";
const TAGS_STORAGE_KEY = "kowai_temp_tags";

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


export default function AdminBlueprintsPage() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [blueprintJson, setBlueprintJson] = useState(
    JSON.stringify(DEFAULT_BLUEPRINT, null, 2)
  );

  // 品質スコア（自動採点で更新される）
  const [qualityScore, setQualityScore] = useState(100);

  // 自動採点結果
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);

  // 一時Blueprintの有無
  const [hasTempBlueprint, setHasTempBlueprint] = useState(false);

  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });

  // 一時Blueprintの確認（マウント時）
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(BLUEPRINT_STORAGE_KEY);
      if (stored) {
        setHasTempBlueprint(true);
      }
    } catch {
      // sessionStorage未対応環境
    }
  }, []);

  // 一時Blueprintを読み込む
  const handleLoadTempBlueprint = useCallback(() => {
    try {
      const storedBlueprint = sessionStorage.getItem(BLUEPRINT_STORAGE_KEY);
      const storedTags = sessionStorage.getItem(TAGS_STORAGE_KEY);

      if (storedBlueprint) {
        const blueprint = JSON.parse(storedBlueprint) as KaidanBlueprintData;
        setBlueprintJson(JSON.stringify(blueprint, null, 2));

        // タグを読み込む（抽出済みタグがあればそれを使用）
        if (storedTags) {
          const parsedTags = JSON.parse(storedTags) as string[];
          setTags(parsedTags.join(", "));
        }

        // 読み込んだら削除
        sessionStorage.removeItem(BLUEPRINT_STORAGE_KEY);
        sessionStorage.removeItem(TAGS_STORAGE_KEY);
        setHasTempBlueprint(false);
        setStatus({ type: "success", message: "一時Blueprintを読み込みました" });
      }
    } catch {
      setStatus({ type: "error", message: "一時Blueprintの読み込みに失敗しました" });
    }
  }, []);

  // 一時Blueprintを破棄
  const handleDiscardTempBlueprint = useCallback(() => {
    try {
      sessionStorage.removeItem(BLUEPRINT_STORAGE_KEY);
      sessionStorage.removeItem(TAGS_STORAGE_KEY);
      setHasTempBlueprint(false);
      setStatus({ type: "success", message: "一時Blueprintを破棄しました" });
    } catch {
      // ignore
    }
  }, []);

  // 自動採点を実行し、スコアとwarningsを更新
  const handleAutoValidate = useCallback(() => {
    try {
      const blueprint = JSON.parse(blueprintJson) as KaidanBlueprintData;
      const result = scoreBlueprint(blueprint);

      // スコアを更新（これが重要！）
      setQualityScore(result.score);

      // 警告を表示用に変換
      const convertedWarnings = deductionsToWarnings(result.deductions);
      setWarnings(convertedWarnings);

      if (result.deductions.length === 0) {
        setStatus({ type: "success", message: `採点完了: ${result.score}点（問題なし）` });
      } else {
        const errors = result.deductions.filter(d => d.severity === "error");
        const warns = result.deductions.filter(d => d.severity === "warning");
        setStatus({
          type: errors.length > 0 ? "error" : "success",
          message: `採点完了: ${result.score}点（エラー: ${errors.length}件, 警告: ${warns.length}件, 合計減点: -${result.totalDeduction}）`,
        });
      }
    } catch {
      setStatus({ type: "error", message: "JSONの形式が不正です" });
      setWarnings([]);
      setQualityScore(0); // パースエラー時は0点
    }
  }, [blueprintJson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "保存中..." });

    try {
      const blueprint = JSON.parse(blueprintJson);

      // サーバー側で再採点されるため、quality_scoreは参考値として送信
      const response = await fetch("/api/blueprints/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t),
          blueprint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "保存に失敗しました");
      }

      // サーバーから返された確定スコアを表示
      setStatus({ type: "success", message: `保存完了 (ID: ${data.id}, 確定スコア: ${data.quality_score})` });

      // フォームリセット
      setTitle("");
      setTags("");
      setBlueprintJson(JSON.stringify(DEFAULT_BLUEPRINT, null, 2));
      setWarnings([]);
      setQualityScore(100);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Blueprint管理</h1>
          <Link
            href="/admin/ingest"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
          >
            本文から変換 →
          </Link>
        </div>
        <p className="text-gray-400 mb-8">
          怪談生成のための設計図（Blueprint）を登録します。
          <br />
          ※本文は保存禁止。抽象化された構造データのみを登録してください。
        </p>

        {/* 一時Blueprint読み込みバナー */}
        {hasTempBlueprint && (
          <div className="mb-6 p-4 bg-blue-900/50 border border-blue-600 rounded-lg">
            <p className="text-blue-300 text-sm mb-3">
              📥 変換画面から送られた一時Blueprintがあります
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleLoadTempBlueprint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                フォームに読み込む
              </button>
              <button
                type="button"
                onClick={handleDiscardTempBlueprint}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
              >
                破棄する
              </button>
            </div>
          </div>
        )}

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
            <label className="block text-sm font-medium mb-2">
              タグ（カンマ区切り）
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例: 鏡, 目撃系, 心霊"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
            />
          </div>

          {/* 品質スコア表示 */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                品質スコア: <span className={`${qualityScore >= 70 ? "text-green-400" : qualityScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>{qualityScore}</span>/100
              </h3>
              <span className="text-sm text-gray-400">
                {qualityScore >= 70 ? "優先使用" : qualityScore >= 50 ? "通常使用" : "低品質"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ※「自動採点」ボタンでスコアが算出されます。保存時にサーバーで再採点されます。
            </p>
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
