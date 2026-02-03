"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KaidanBlueprintData, StyleBlueprintData } from "@/types";
import { useAdminAuth } from "../../AdminAuthContext";

const MAX_CHARS_NORMAL = 8000;
const LONG_TEXT_THRESHOLD = 10000;
const MAX_CHARS_ABSOLUTE = 50000;

/**
 * 既存の流派名と被らないユニークな名前を生成
 */
function makeUniqueStyleName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  // 番号付きで試す
  let counter = 2;
  while (existingNames.includes(`${baseName} (${counter})`)) {
    counter++;
  }
  return `${baseName} (${counter})`;
}

export default function AdminIngestPage() {
  const router = useRouter();
  const { token } = useAdminAuth();
  const [sourceText, setSourceText] = useState("");
  const [blueprint, setBlueprint] = useState<KaidanBlueprintData | null>(null);
  const [styleData, setStyleData] = useState<StyleBlueprintData | null>(null);
  const [extractedTags, setExtractedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error" | "saving";
    message: string;
  }>({ type: "idle", message: "" });
  const [processingInfo, setProcessingInfo] = useState<{
    mode: string;
    chunks: number;
  } | null>(null);

  // 登録用フォーム（構造）
  const [registerTitle, setRegisterTitle] = useState("");
  const [registerTags, setRegisterTags] = useState("");

  // 登録用フォーム（文体）
  const [registerStyleName, setRegisterStyleName] = useState("");
  const [shouldRegisterStyle, setShouldRegisterStyle] = useState(true);

  // 既存の流派名一覧（重複チェック用）
  const [existingStyleNames, setExistingStyleNames] = useState<string[]>([]);

  const charCount = sourceText.length;
  const isLongMode = charCount >= LONG_TEXT_THRESHOLD;
  const isOverLimit = charCount > MAX_CHARS_ABSOLUTE;

  // ログイン時に既存の流派名を取得
  useEffect(() => {
    if (!token) return;

    const fetchStyleNames = async () => {
      try {
        const res = await fetch("/api/admin/style-blueprints", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const names = (data.blueprints || []).map((bp: { archetype_name: string }) => bp.archetype_name);
          setExistingStyleNames(names);
        }
      } catch {
        // エラーは無視（重複チェックができないだけ）
      }
    };

    fetchStyleNames();
  }, [token]);

  const handleClearText = useCallback(() => {
    setSourceText("");
    setBlueprint(null);
    setStyleData(null);
    setExtractedTags([]);
    setProcessingInfo(null);
    setStatus({ type: "idle", message: "" });
    setRegisterTitle("");
    setRegisterTags("");
    setRegisterStyleName("");
    setShouldRegisterStyle(true);
  }, []);

  const handleExtract = async () => {
    if (!sourceText.trim()) {
      setStatus({ type: "error", message: "本文を入力してください" });
      return;
    }
    if (isOverLimit) {
      setStatus({ type: "error", message: `${MAX_CHARS_ABSOLUTE}文字を超えています` });
      return;
    }

    setStatus({ type: "loading", message: "変換中...（構造 + 文体を抽出）" });
    setBlueprint(null);
    setStyleData(null);
    setExtractedTags([]);
    setProcessingInfo(null);

    try {
      const response = await fetch("/api/blueprints/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: sourceText,
          existing_style_names: existingStyleNames,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "変換に失敗しました");
      }

      setBlueprint(data.blueprint);
      setExtractedTags(data.tags || []);
      setStyleData(data.styleData || null);
      setProcessingInfo({ mode: data.mode, chunks: data.chunks });
      // 文体が抽出された場合、流派名を初期値としてセット（既存と被らないようにする）
      if (data.styleData?.archetype_name) {
        const uniqueName = makeUniqueStyleName(data.styleData.archetype_name, existingStyleNames);
        setRegisterStyleName(uniqueName);
      }
      setStatus({
        type: "success",
        message: `変換完了${data.styleData ? "（構造 + 文体）" : "（構造のみ）"}`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "エラーが発生しました",
      });
    }
  };

  // 抽出結果をそのまま登録
  const handleRegister = async () => {
    if (!blueprint || !registerTitle.trim()) return;

    setStatus({ type: "saving", message: "保存中..." });

    try {
      // 構造Blueprintを保存
      const tags = registerTags
        ? registerTags.split(",").map((t) => t.trim()).filter((t) => t)
        : extractedTags;

      const kaidanRes = await fetch("/api/blueprints/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: registerTitle,
          tags,
          blueprint,
        }),
      });
      const kaidanData = await kaidanRes.json();
      if (!kaidanRes.ok) {
        throw new Error(kaidanData.error || "構造Blueprintの保存に失敗");
      }

      let styleMsg = "";

      // 文体Blueprintも保存（チェックボックスがオンの場合のみ）
      if (styleData && shouldRegisterStyle && registerStyleName.trim()) {
        // 編集された流派名を使用
        const finalStyleData = {
          ...styleData,
          archetype_name: registerStyleName.trim(),
        };
        const styleRes = await fetch("/api/admin/style-blueprints", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            styleData: finalStyleData,
            qualityScore: 70,
          }),
        });
        const styleResult = await styleRes.json();
        if (!styleRes.ok) {
          const detail = styleResult.violations
            ? styleResult.violations.map((v: { detail: string }) => v.detail).join(", ")
            : styleResult.error;
          styleMsg = `（文体の保存に失敗: ${detail}）`;
        } else {
          styleMsg = ` + 文体「${registerStyleName}」`;
        }
      }

      setStatus({
        type: "success",
        message: `登録完了！ 構造ID: ${kaidanData.id}（スコア: ${kaidanData.quality_score}）${styleMsg}`,
      });

      // 少し待ってから管理画面へ遷移
      setTimeout(() => {
        router.push("/admin/blueprints");
      }, 2000);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "登録に失敗しました",
      });
    }
  };

  const handleCopyJson = async () => {
    if (!blueprint) return;
    try {
      const output = styleData
        ? { blueprint, styleData }
        : { blueprint };
      await navigator.clipboard.writeText(JSON.stringify(output, null, 2));
      setStatus({ type: "success", message: "JSONをコピーしました" });
    } catch {
      setStatus({ type: "error", message: "コピーに失敗しました" });
    }
  };

  return (
    <div className="text-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Blueprint変換</h1>
        <p className="text-gray-400 mb-6">
          怪談本文から構造（KaidanBlueprint）と文体（StyleBlueprint）を同時に抽出します。
        </p>

        {/* 注意文 */}
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <p className="text-yellow-300 text-sm">
            本文は保存されません。変換後は破棄されます。
          </p>
          <p className="text-yellow-300/80 text-xs mt-1">
            保存されるのはBlueprint（設計図）のみです。本文はサーバーにもログにも残りません。
          </p>
        </div>

        {/* 本文入力 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">怪談本文</label>
            <div className="flex items-center gap-4">
              {isLongMode && (
                <span className="text-xs px-2 py-1 bg-purple-700 rounded">長文モード</span>
              )}
              <span className={`text-sm ${isOverLimit ? "text-red-400" : charCount > MAX_CHARS_NORMAL ? "text-yellow-400" : "text-gray-400"}`}>
                {charCount.toLocaleString()} / {MAX_CHARS_ABSOLUTE.toLocaleString()}
              </span>
            </div>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="怪談の本文をここに貼り付けてください..."
            rows={15}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-red-500 resize-y"
          />
        </div>

        {/* ボタン */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleExtract}
            disabled={status.type === "loading" || isOverLimit || !sourceText.trim()}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-medium"
          >
            {status.type === "loading" ? "変換中..." : "構造 + 文体を抽出"}
          </button>
          <button
            onClick={handleClearText}
            disabled={status.type === "loading"}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 rounded-lg font-medium"
          >
            クリア
          </button>
        </div>

        {/* ステータス */}
        {status.type !== "idle" && (
          <div className={`mb-6 p-4 rounded-lg ${
            status.type === "success" ? "bg-green-900/50 text-green-300" :
            status.type === "error" ? "bg-red-900/50 text-red-300" :
            "bg-gray-800 text-gray-300"
          }`}>
            {status.message}
          </div>
        )}

        {/* 結果表示 */}
        {blueprint && (
          <div className="space-y-6">
            {/* KaidanBlueprint */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-red-400">構造（KaidanBlueprint）</h2>
                {processingInfo && (
                  <span className="text-xs text-gray-400">
                    {processingInfo.mode === "long" ? `長文モード（${processingInfo.chunks}チャンク）` : "通常モード"}
                  </span>
                )}
              </div>

              {/* 構造プレビュー */}
              <div className="p-4 bg-gray-800 rounded-lg space-y-3 mb-4">
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

              {/* タグ */}
              {extractedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {extractedTags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-900/50 border border-blue-700 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* JSON */}
              <div className="relative">
                <pre className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm overflow-x-auto max-h-[300px] overflow-y-auto">
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

            {/* StyleBlueprint */}
            {styleData && (
              <div>
                <h2 className="text-lg font-bold text-blue-400 mb-2">文体（StyleBlueprint）</h2>

                <div className="p-4 bg-gray-800 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">流派名:</span>
                      <p className="text-white font-medium">{styleData.archetype_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">語り手:</span>
                      <p className="text-white">{styleData.narrator_stance}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">感情レベル:</span>
                      <p className="text-white">{styleData.emotion_level}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">文体:</span>
                      <p className="text-white">{styleData.sentence_style}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">擬音語:</span>
                      <p className="text-white">{styleData.onomatopoeia_usage}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">会話:</span>
                      <p className="text-white">{styleData.dialogue_style}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-400 text-sm">文体の特徴:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {styleData.tone_features.map((f, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">{f}</span>
                      ))}
                    </div>
                  </div>

                  {styleData.style_prohibitions.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-sm">禁止事項:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {styleData.style_prohibitions.map((p, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {styleData.sample_phrases.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-sm">サンプルフレーズ:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {styleData.sample_phrases.map((p, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs italic">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <pre className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm overflow-x-auto max-h-[200px] overflow-y-auto mt-3">
                  {JSON.stringify(styleData, null, 2)}
                </pre>
              </div>
            )}

            {/* 登録フォーム */}
            <div className="p-4 bg-gray-800 border border-green-700 rounded-lg space-y-4">
              <h3 className="text-lg font-bold text-green-400">このまま登録</h3>

              {/* 構造用 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-red-400">構造（KaidanBlueprint）</h4>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">タイトル *</label>
                  <input
                    type="text"
                    value={registerTitle}
                    onChange={(e) => setRegisterTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-green-500"
                    placeholder="例: 鏡の向こう側パターン"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    タグ（カンマ区切り / 空欄なら抽出タグを使用）
                  </label>
                  <input
                    type="text"
                    value={registerTags}
                    onChange={(e) => setRegisterTags(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-green-500"
                    placeholder={extractedTags.join(", ") || "例: 鏡, 目撃系, 心霊"}
                  />
                </div>
              </div>

              {/* 文体用 */}
              {styleData && (
                <div className="space-y-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-blue-400">文体（StyleBlueprint）</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shouldRegisterStyle}
                        onChange={(e) => setShouldRegisterStyle(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                      />
                      <span className="text-sm text-gray-300">文体も登録する</span>
                    </label>
                  </div>
                  {shouldRegisterStyle && (
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">流派名 *</label>
                      <input
                        type="text"
                        value={registerStyleName}
                        onChange={(e) => setRegisterStyleName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                        placeholder="例: 実録調"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  onClick={handleRegister}
                  disabled={status.type === "saving" || !registerTitle.trim() || (styleData && shouldRegisterStyle && !registerStyleName.trim()) || !token}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium"
                >
                  {status.type === "saving" ? "保存中..." : `登録${styleData && shouldRegisterStyle ? "（構造 + 文体）" : "（構造のみ）"}`}
                </button>
                <button
                  onClick={() => router.push("/admin/blueprints")}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                >
                  管理画面へ
                </button>
              </div>

              {!token && (
                <p className="text-yellow-400 text-sm">
                  ※ 登録するには管理画面で認証が必要です
                </p>
              )}
            </div>
          </div>
        )}

        {/* ヘルプ */}
        <div className="mt-12 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-bold mb-4">使い方</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>怪談の本文を上のテキストエリアに貼り付けます</li>
            <li>「構造 + 文体を抽出」ボタンをクリックします</li>
            <li>AIが構造（KaidanBlueprint）と文体（StyleBlueprint）を同時に抽出します</li>
            <li>結果を確認し、タイトルを入力して「登録」をクリックします</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
