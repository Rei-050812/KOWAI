"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KaidanBlueprintData } from "@/types";

// 定数
const MAX_CHARS_NORMAL = 8000;
const LONG_TEXT_THRESHOLD = 10000;
const MAX_CHARS_ABSOLUTE = 50000;

// sessionStorageキー（Blueprintとタグのみ保存。本文は絶対に保存しない）
const BLUEPRINT_STORAGE_KEY = "kowai_temp_blueprint";
const TAGS_STORAGE_KEY = "kowai_temp_tags";

export default function AdminIngestPage() {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [blueprint, setBlueprint] = useState<KaidanBlueprintData | null>(null);
  const [extractedTags, setExtractedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [processingInfo, setProcessingInfo] = useState<{
    mode: string;
    chunks: number;
  } | null>(null);

  const charCount = sourceText.length;
  const isLongMode = charCount >= LONG_TEXT_THRESHOLD;
  const isOverLimit = charCount > MAX_CHARS_ABSOLUTE;

  // 本文クリア
  const handleClearText = useCallback(() => {
    setSourceText("");
    setBlueprint(null);
    setExtractedTags([]);
    setProcessingInfo(null);
    setStatus({ type: "idle", message: "" });
  }, []);

  // Blueprint変換
  const handleExtract = async () => {
    if (!sourceText.trim()) {
      setStatus({ type: "error", message: "本文を入力してください" });
      return;
    }

    if (isOverLimit) {
      setStatus({ type: "error", message: `${MAX_CHARS_ABSOLUTE}文字を超えています` });
      return;
    }

    setStatus({ type: "loading", message: "変換中..." });
    setBlueprint(null);
    setExtractedTags([]);
    setProcessingInfo(null);

    try {
      const response = await fetch("/api/blueprints/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_text: sourceText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "変換に失敗しました");
      }

      setBlueprint(data.blueprint);
      setExtractedTags(data.tags || []);
      setProcessingInfo({ mode: data.mode, chunks: data.chunks });
      setStatus({
        type: "success",
        message: `変換完了（${data.mode === "long" ? `長文モード: ${data.chunks}チャンク` : "通常モード"}）`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "エラーが発生しました",
      });
    }
  };

  // Blueprint管理画面へ送る
  const handleSendToBlueprints = () => {
    if (!blueprint) return;

    // sessionStorageに一時保存（Blueprintとタグのみ。本文は絶対に保存しない）
    try {
      sessionStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(blueprint));
      sessionStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(extractedTags));
      router.push("/admin/blueprints");
    } catch {
      setStatus({ type: "error", message: "一時保存に失敗しました" });
    }
  };

  // JSONをクリップボードにコピー
  const handleCopyJson = async () => {
    if (!blueprint) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2));
      setStatus({ type: "success", message: "JSONをコピーしました" });
    } catch {
      setStatus({ type: "error", message: "コピーに失敗しました" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Blueprint変換</h1>
        <p className="text-gray-400 mb-6">
          怪談本文からBlueprint（構造的な設計図）を抽出します。
        </p>

        {/* 注意文 */}
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <p className="text-yellow-300 text-sm">
            ⚠️ 本文は保存されません。変換後は破棄されます。
          </p>
          <p className="text-yellow-300/80 text-xs mt-1">
            保存されるのはBlueprint（設計図）のみです。本文はサーバーにもログにも残りません。
          </p>
        </div>

        {/* 本文入力エリア */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">
              怪談本文
            </label>
            <div className="flex items-center gap-4">
              {isLongMode && (
                <span className="text-xs px-2 py-1 bg-purple-700 rounded">
                  長文モード
                </span>
              )}
              <span
                className={`text-sm ${
                  isOverLimit
                    ? "text-red-400"
                    : charCount > MAX_CHARS_NORMAL
                    ? "text-yellow-400"
                    : "text-gray-400"
                }`}
              >
                {charCount.toLocaleString()} / {MAX_CHARS_ABSOLUTE.toLocaleString()}
              </span>
            </div>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="怪談の本文をここに貼り付けてください..."
            rows={15}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-sans text-sm focus:outline-none focus:border-red-500 resize-y"
          />
          {charCount > MAX_CHARS_NORMAL && charCount <= LONG_TEXT_THRESHOLD && (
            <p className="text-yellow-400 text-xs mt-1">
              {MAX_CHARS_NORMAL}文字を超えています。{LONG_TEXT_THRESHOLD}文字以上で長文モードになります。
            </p>
          )}
          {isLongMode && !isOverLimit && (
            <p className="text-purple-400 text-xs mt-1">
              長文モード: 自動分割して処理します（{Math.ceil(charCount / 7000)}チャンク程度）
            </p>
          )}
        </div>

        {/* 操作ボタン */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleExtract}
            disabled={status.type === "loading" || isOverLimit || !sourceText.trim()}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {status.type === "loading" ? "変換中..." : "Blueprintに変換"}
          </button>
          <button
            onClick={handleClearText}
            disabled={status.type === "loading"}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            本文をクリア
          </button>
        </div>

        {/* ステータス表示 */}
        {status.type !== "idle" && (
          <div
            className={`mb-6 p-4 rounded-lg ${
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

        {/* Blueprint出力 */}
        {blueprint && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">抽出されたBlueprint</h2>
                {processingInfo && (
                  <span className="text-xs text-gray-400">
                    {processingInfo.mode === "long"
                      ? `長文モード（${processingInfo.chunks}チャンク統合）`
                      : "通常モード"}
                  </span>
                )}
              </div>
              <div className="relative">
                <pre className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                  {JSON.stringify(blueprint, null, 2)}
                </pre>
                <button
                  onClick={handleCopyJson}
                  className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  コピー
                </button>
              </div>
            </div>

            {/* 抽出されたタグ */}
            {extractedTags.length > 0 && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h3 className="font-bold text-blue-400 mb-2">抽出されたタグ</h3>
                <div className="flex flex-wrap gap-2">
                  {extractedTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-900/50 border border-blue-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 主要フィールドのプレビュー */}
            <div className="p-4 bg-gray-800 rounded-lg space-y-3">
              <h3 className="font-bold text-red-400">構造プレビュー</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">怪異の核:</span>
                  <p className="text-white">{blueprint.anomaly || "(未設定)"}</p>
                </div>
                <div>
                  <span className="text-gray-400">通常の前提:</span>
                  <p className="text-white">{blueprint.normal_rule || "(未設定)"}</p>
                </div>
                <div>
                  <span className="text-gray-400">不可逆の確定:</span>
                  <p className="text-white">{blueprint.irreversible_point || "(未設定)"}</p>
                </div>
                <div>
                  <span className="text-gray-400">結末スタイル:</span>
                  <p className="text-white">{blueprint.ending_style || "(未設定)"}</p>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-4">
              <button
                onClick={handleSendToBlueprints}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Blueprint管理画面へ送る →
              </button>
            </div>
          </div>
        )}

        {/* ヘルプ */}
        <div className="mt-12 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-bold mb-4">使い方</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>怪談の本文を上のテキストエリアに貼り付けます</li>
            <li>「Blueprintに変換」ボタンをクリックします</li>
            <li>AIが本文から構造（Blueprint）を抽出します</li>
            <li>抽出結果を確認し、「Blueprint管理画面へ送る」で保存画面に遷移します</li>
            <li>管理画面でタイトルやタグを設定して保存します</li>
          </ol>
          <div className="mt-4 p-3 bg-gray-700/50 rounded">
            <p className="text-xs text-gray-400">
              <strong>長文モード:</strong> 10,000文字以上の本文は自動的に分割して処理されます。
              各パートからBlueprintを抽出し、最後に1つに統合します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
