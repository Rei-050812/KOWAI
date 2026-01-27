"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { KaidanBlueprintData, StyleBlueprint, StyleBlueprintData, StyleViolation } from "@/types";
import { scoreBlueprint, deductionsToWarnings } from "@/lib/blueprint-scoring";

type Tab = "kaidan" | "style" | "create";

type KaidanBlueprintRow = {
  id: number;
  title: string;
  tags: string[];
  quality_score: number;
  created_at: string;
};

const EMPTY_STYLE_DATA: StyleBlueprintData = {
  archetype_name: "",
  tone_features: ["", ""],
  narrator_stance: "involved",
  emotion_level: 0,
  sentence_style: "mixed",
  onomatopoeia_usage: "minimal",
  dialogue_style: "functional",
  style_prohibitions: [],
  sample_phrases: [],
};

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
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<Tab>("kaidan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // KaidanBlueprint一覧
  const [kaidanList, setKaidanList] = useState<KaidanBlueprintRow[]>([]);

  // StyleBlueprint一覧
  const [styleList, setStyleList] = useState<StyleBlueprint[]>([]);

  // 新規作成フォーム
  const [createTitle, setCreateTitle] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [createBlueprintJson, setCreateBlueprintJson] = useState(
    JSON.stringify(DEFAULT_BLUEPRINT, null, 2)
  );
  const [createQualityScore, setCreateQualityScore] = useState(100);
  const [createKaidanWarnings, setCreateKaidanWarnings] = useState<
    { field: string; message: string; severity: string; deduction: number }[]
  >([]);

  // StyleBlueprint新規作成
  const [createStyleData, setCreateStyleData] =
    useState<StyleBlueprintData>(EMPTY_STYLE_DATA);
  const [createStyleQuality, setCreateStyleQuality] = useState(70);
  const [styleViolations, setStyleViolations] = useState<StyleViolation[]>([]);
  const [styleWarnings, setStyleWarnings] = useState<StyleViolation[]>([]);
  const [includeStyle, setIncludeStyle] = useState(false);

  // StyleBlueprint編集
  const [editingStyleId, setEditingStyleId] = useState<number | null>(null);
  const [editStyleData, setEditStyleData] =
    useState<StyleBlueprintData>(EMPTY_STYLE_DATA);
  const [editStyleQuality, setEditStyleQuality] = useState(70);

  // sessionStorageからの一時Blueprint
  const [hasTempBlueprint, setHasTempBlueprint] = useState(false);

  // --- データ読み込み ---
  const loadKaidan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blueprints", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKaidanList(data.blueprints || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadStyle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/style-blueprints", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStyleList(data.blueprints || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleLoad = useCallback(() => {
    if (tab === "kaidan") loadKaidan();
    else if (tab === "style") loadStyle();
  }, [tab, loadKaidan, loadStyle]);

  // --- 一時Blueprint読み込み ---
  const handleLoadTemp = useCallback(() => {
    try {
      const storedBp = sessionStorage.getItem("kowai_temp_blueprint");
      const storedTags = sessionStorage.getItem("kowai_temp_tags");
      const storedStyle = sessionStorage.getItem("kowai_temp_style");

      if (storedBp) {
        setCreateBlueprintJson(storedBp);
        if (storedTags) {
          const tags = JSON.parse(storedTags) as string[];
          setCreateTags(tags.join(", "));
        }
        sessionStorage.removeItem("kowai_temp_blueprint");
        sessionStorage.removeItem("kowai_temp_tags");
      }

      if (storedStyle) {
        const style = JSON.parse(storedStyle) as StyleBlueprintData;
        setCreateStyleData(style);
        setIncludeStyle(true);
        sessionStorage.removeItem("kowai_temp_style");
      }

      setHasTempBlueprint(false);
      setTab("create");
      setSuccess("変換データを読み込みました");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("一時データの読み込みに失敗しました");
    }
  }, []);

  // マウント時に一時Blueprintチェック
  useState(() => {
    try {
      const stored = sessionStorage.getItem("kowai_temp_blueprint");
      if (stored) setHasTempBlueprint(true);
    } catch {
      // ignore
    }
  });

  // --- KaidanBlueprint操作 ---
  const handleDeleteKaidan = useCallback(
    async (id: number, title: string) => {
      if (!confirm(`「${title}」を削除しますか？`)) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/blueprints?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        await loadKaidan();
        setSuccess("削除しました");
        setTimeout(() => setSuccess(null), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [token, loadKaidan]
  );

  // --- StyleBlueprint操作 ---
  const handleToggleStyleActive = useCallback(
    async (id: number, currentActive: boolean) => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/style-blueprints", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id, is_active: !currentActive }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        await loadStyle();
        setSuccess(`${currentActive ? "無効" : "有効"}にしました`);
        setTimeout(() => setSuccess(null), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [token, loadStyle]
  );

  const handleDeleteStyle = useCallback(
    async (id: number, name: string) => {
      if (!confirm(`「${name}」を削除しますか？`)) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/style-blueprints?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        await loadStyle();
        setSuccess("削除しました");
        setTimeout(() => setSuccess(null), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [token, loadStyle]
  );

  const handleEditStyle = useCallback((bp: StyleBlueprint) => {
    setEditingStyleId(bp.id);
    setEditStyleData(bp.style_data);
    setEditStyleQuality(bp.quality_score);
  }, []);

  const handleSaveEditStyle = useCallback(async () => {
    if (!editingStyleId) return;
    setLoading(true);
    setStyleViolations([]);
    setStyleWarnings([]);
    try {
      const res = await fetch("/api/admin/style-blueprints", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingStyleId,
          styleData: editStyleData,
          quality_score: editStyleQuality,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.violations) {
          setStyleViolations(data.violations);
          setStyleWarnings(data.warnings || []);
        }
        throw new Error(data.error);
      }
      setEditingStyleId(null);
      await loadStyle();
      setSuccess("更新しました");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [editingStyleId, editStyleData, editStyleQuality, token, loadStyle]);

  // --- 自動採点 ---
  const handleAutoScore = useCallback(() => {
    try {
      const bp = JSON.parse(createBlueprintJson) as KaidanBlueprintData;
      const result = scoreBlueprint(bp);
      setCreateQualityScore(result.score);
      setCreateKaidanWarnings(deductionsToWarnings(result.deductions));
      setSuccess(`採点完了: ${result.score}点`);
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError("JSONの形式が不正です");
      setCreateQualityScore(0);
    }
  }, [createBlueprintJson]);

  // --- 新規保存 ---
  const handleCreate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // KaidanBlueprint保存
      const blueprint = JSON.parse(createBlueprintJson);
      const kaidanRes = await fetch("/api/blueprints/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle,
          tags: createTags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t),
          blueprint,
        }),
      });
      const kaidanData = await kaidanRes.json();
      if (!kaidanRes.ok) throw new Error(kaidanData.error || "Blueprint保存に失敗");

      let styleMsg = "";

      // StyleBlueprint保存（チェック時のみ）
      if (includeStyle && createStyleData.archetype_name.trim()) {
        const styleRes = await fetch("/api/admin/style-blueprints", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            styleData: createStyleData,
            qualityScore: createStyleQuality,
          }),
        });
        const styleData = await styleRes.json();
        if (!styleRes.ok) {
          if (styleData.violations) {
            setStyleViolations(styleData.violations);
            setStyleWarnings(styleData.warnings || []);
          }
          styleMsg = `（文体の保存に失敗: ${styleData.error}）`;
        } else {
          styleMsg = ` + 文体「${createStyleData.archetype_name}」`;
        }
      }

      setSuccess(
        `保存完了 (ID: ${kaidanData.id}, スコア: ${kaidanData.quality_score})${styleMsg}`
      );

      // リセット
      setCreateTitle("");
      setCreateTags("");
      setCreateBlueprintJson(JSON.stringify(DEFAULT_BLUEPRINT, null, 2));
      setCreateQualityScore(100);
      setCreateKaidanWarnings([]);
      setCreateStyleData(EMPTY_STYLE_DATA);
      setIncludeStyle(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [
    createTitle,
    createTags,
    createBlueprintJson,
    includeStyle,
    createStyleData,
    createStyleQuality,
    token,
  ]);

  // --- StyleBlueprint配列フィールド操作 ---
  const updateStyleArray = (
    setter: (fn: (prev: StyleBlueprintData) => StyleBlueprintData) => void,
    field: "tone_features" | "style_prohibitions" | "sample_phrases",
    index: number,
    value: string
  ) => {
    setter((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addStyleArrayItem = (
    setter: (fn: (prev: StyleBlueprintData) => StyleBlueprintData) => void,
    field: "tone_features" | "style_prohibitions" | "sample_phrases"
  ) => {
    setter((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeStyleArrayItem = (
    setter: (fn: (prev: StyleBlueprintData) => StyleBlueprintData) => void,
    field: "tone_features" | "style_prohibitions" | "sample_phrases",
    index: number
  ) => {
    setter((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // --- StyleBlueprintフォームUI ---
  const renderStyleForm = (
    data: StyleBlueprintData,
    setter: (fn: (prev: StyleBlueprintData) => StyleBlueprintData) => void,
    quality: number,
    setQuality: (v: number) => void
  ) => (
    <div className="space-y-4 border border-gray-700 rounded-lg p-4 bg-gray-900/50">
      <h3 className="text-base font-semibold text-blue-400">文体（StyleBlueprint）</h3>

      {/* バリデーションメッセージ */}
      {styleViolations.length > 0 && (
        <div className="p-3 bg-red-900/40 text-red-300 rounded space-y-1">
          {styleViolations.map((v, i) => (
            <div key={i} className="text-sm">・{v.detail}</div>
          ))}
        </div>
      )}
      {styleWarnings.length > 0 && (
        <div className="p-3 bg-yellow-900/40 text-yellow-300 rounded space-y-1">
          {styleWarnings.map((w, i) => (
            <div key={i} className="text-sm">・{w.detail}</div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-300 mb-1">流派名</label>
        <input
          type="text"
          value={data.archetype_name}
          onChange={(e) =>
            setter((prev) => ({ ...prev, archetype_name: e.target.value }))
          }
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          placeholder="例: 実録調"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          品質スコア: {quality}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">語り手の立ち位置</label>
          <select
            value={data.narrator_stance}
            onChange={(e) =>
              setter((prev) => ({
                ...prev,
                narrator_stance: e.target.value as "distant" | "involved" | "detached",
              }))
            }
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value="distant">distant（距離を置く）</option>
            <option value="involved">involved（巻き込まれる）</option>
            <option value="detached">detached（超然）</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            感情レベル: {data.emotion_level}
          </label>
          <select
            value={data.emotion_level}
            onChange={(e) =>
              setter((prev) => ({
                ...prev,
                emotion_level: Number(e.target.value) as 0 | 1 | 2,
              }))
            }
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value={0}>0（感情を排除）</option>
            <option value={1}>1（控えめ）</option>
            <option value={2}>2（やや表出）</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">文体</label>
          <select
            value={data.sentence_style}
            onChange={(e) =>
              setter((prev) => ({
                ...prev,
                sentence_style: e.target.value as "short" | "mixed" | "flowing",
              }))
            }
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value="short">short（短文）</option>
            <option value="mixed">mixed（混合）</option>
            <option value="flowing">flowing（流れる）</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">擬音語</label>
          <select
            value={data.onomatopoeia_usage}
            onChange={(e) =>
              setter((prev) => ({
                ...prev,
                onomatopoeia_usage: e.target.value as "none" | "minimal" | "moderate",
              }))
            }
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value="none">none（使わない）</option>
            <option value="minimal">minimal（最小限）</option>
            <option value="moderate">moderate（適度）</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">会話スタイル</label>
          <select
            value={data.dialogue_style}
            onChange={(e) =>
              setter((prev) => ({
                ...prev,
                dialogue_style: e.target.value as "rare" | "functional" | "natural",
              }))
            }
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value="rare">rare（ほぼなし）</option>
            <option value="functional">functional（機能的）</option>
            <option value="natural">natural（自然）</option>
          </select>
        </div>
      </div>

      {/* 文体の特徴 */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">文体の特徴（最低2つ）</label>
        {data.tone_features.map((f, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input
              type="text"
              value={f}
              onChange={(e) => updateStyleArray(setter, "tone_features", i, e.target.value)}
              className="flex-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
            />
            <button type="button" onClick={() => removeStyleArrayItem(setter, "tone_features", i)} className="px-2 text-red-400 hover:text-red-300">x</button>
          </div>
        ))}
        <button type="button" onClick={() => addStyleArrayItem(setter, "tone_features")} className="text-sm text-blue-400 hover:text-blue-300">+ 追加</button>
      </div>

      {/* 禁止事項 */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">禁止事項</label>
        {data.style_prohibitions.map((p, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input
              type="text"
              value={p}
              onChange={(e) => updateStyleArray(setter, "style_prohibitions", i, e.target.value)}
              className="flex-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
            />
            <button type="button" onClick={() => removeStyleArrayItem(setter, "style_prohibitions", i)} className="px-2 text-red-400 hover:text-red-300">x</button>
          </div>
        ))}
        <button type="button" onClick={() => addStyleArrayItem(setter, "style_prohibitions")} className="text-sm text-blue-400 hover:text-blue-300">+ 追加</button>
      </div>

      {/* サンプルフレーズ */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">サンプルフレーズ</label>
        {data.sample_phrases.map((p, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input
              type="text"
              value={p}
              onChange={(e) => updateStyleArray(setter, "sample_phrases", i, e.target.value)}
              className="flex-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
            />
            <button type="button" onClick={() => removeStyleArrayItem(setter, "sample_phrases", i)} className="px-2 text-red-400 hover:text-red-300">x</button>
          </div>
        ))}
        <button type="button" onClick={() => addStyleArrayItem(setter, "sample_phrases")} className="text-sm text-blue-400 hover:text-blue-300">+ 追加</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Blueprint 管理</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/blueprints/ingest"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            >
              本文から変換
            </Link>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_TOKEN"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
            />
            <button
              type="button"
              onClick={handleLoad}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
              disabled={loading}
            >
              {loading ? "読込中..." : "読み込み"}
            </button>
          </div>
        </div>

        {/* メッセージ */}
        {error && <div className="p-3 bg-red-900/40 text-red-300 rounded">{error}</div>}
        {success && <div className="p-3 bg-green-900/40 text-green-300 rounded">{success}</div>}

        {/* 一時Blueprint通知 */}
        {hasTempBlueprint && (
          <div className="p-4 bg-blue-900/50 border border-blue-600 rounded-lg">
            <p className="text-blue-300 text-sm mb-3">
              変換画面から送られたデータがあります
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={handleLoadTemp} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                フォームに読み込む
              </button>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem("kowai_temp_blueprint");
                  sessionStorage.removeItem("kowai_temp_tags");
                  sessionStorage.removeItem("kowai_temp_style");
                  setHasTempBlueprint(false);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
              >
                破棄する
              </button>
            </div>
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-2 border-b border-gray-700 pb-2">
          {([
            ["kaidan", "構造（KaidanBlueprint）"],
            ["style", "文体（StyleBlueprint）"],
            ["create", "新規登録"],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setError(null);
              }}
              className={`px-4 py-2 rounded-t text-sm ${
                tab === key
                  ? "bg-gray-800 text-white border border-gray-700 border-b-gray-900"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* === 構造タブ === */}
        {tab === "kaidan" && (
          <div>
            {kaidanList.length === 0 && !loading && (
              <div className="text-gray-400 text-sm">データがありません。読み込みボタンを押してください。</div>
            )}
            {kaidanList.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left">
                    <th className="py-2 px-3">ID</th>
                    <th className="py-2 px-3">タイトル</th>
                    <th className="py-2 px-3">タグ</th>
                    <th className="py-2 px-3">品質</th>
                    <th className="py-2 px-3">登録日</th>
                    <th className="py-2 px-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {kaidanList.map((bp) => (
                    <tr key={bp.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-2 px-3 text-gray-400">{bp.id}</td>
                      <td className="py-2 px-3">{bp.title}</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {bp.tags.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={bp.quality_score >= 70 ? "text-green-400" : bp.quality_score >= 50 ? "text-yellow-400" : "text-red-400"}>
                          {bp.quality_score}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs">
                        {new Date(bp.created_at).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteKaidan(bp.id, bp.title)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* === 文体タブ === */}
        {tab === "style" && (
          <div>
            {editingStyleId ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">文体を編集</h2>
                {renderStyleForm(editStyleData, setEditStyleData, editStyleQuality, setEditStyleQuality)}
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveEditStyle} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm" disabled={loading}>保存</button>
                  <button type="button" onClick={() => setEditingStyleId(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">キャンセル</button>
                </div>
              </div>
            ) : (
              <>
                {styleList.length === 0 && !loading && (
                  <div className="text-gray-400 text-sm">データがありません。読み込みボタンを押してください。</div>
                )}
                {styleList.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-left">
                        <th className="py-2 px-3">ID</th>
                        <th className="py-2 px-3">流派名</th>
                        <th className="py-2 px-3">品質</th>
                        <th className="py-2 px-3">使用回数</th>
                        <th className="py-2 px-3">平均評価</th>
                        <th className="py-2 px-3">状態</th>
                        <th className="py-2 px-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {styleList.map((bp) => (
                        <tr key={bp.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-2 px-3 text-gray-400">{bp.id}</td>
                          <td className="py-2 px-3 font-medium">{bp.archetype_name}</td>
                          <td className="py-2 px-3">
                            <span className={bp.quality_score >= 80 ? "text-green-400" : bp.quality_score >= 60 ? "text-yellow-400" : "text-red-400"}>
                              {bp.quality_score}
                            </span>
                          </td>
                          <td className="py-2 px-3">{bp.usage_count}</td>
                          <td className="py-2 px-3">{bp.avg_story_rating ? Number(bp.avg_story_rating).toFixed(1) : "-"}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded text-xs ${bp.is_active ? "bg-green-900/40 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                              {bp.is_active ? "有効" : "無効"}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleEditStyle(bp)} className="text-blue-400 hover:text-blue-300 text-xs">編集</button>
                              <button type="button" onClick={() => handleToggleStyleActive(bp.id, bp.is_active)} className="text-yellow-400 hover:text-yellow-300 text-xs">
                                {bp.is_active ? "無効化" : "有効化"}
                              </button>
                              <button type="button" onClick={() => handleDeleteStyle(bp.id, bp.archetype_name)} className="text-red-400 hover:text-red-300 text-xs">削除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}

        {/* === 新規登録タブ === */}
        {tab === "create" && (
          <div className="space-y-6">
            {/* KaidanBlueprint */}
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50 space-y-4">
              <h3 className="text-base font-semibold text-red-400">構造（KaidanBlueprint）</h3>

              <div>
                <label className="block text-sm text-gray-300 mb-1">タイトル *</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                  placeholder="例: 鏡の向こう側パターン"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">タグ（カンマ区切り）</label>
                <input
                  type="text"
                  value={createTags}
                  onChange={(e) => setCreateTags(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                  placeholder="例: 鏡, 目撃系, 心霊"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-300">Blueprint JSON *</label>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${createQualityScore >= 70 ? "text-green-400" : createQualityScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {createQualityScore}点
                    </span>
                    <button type="button" onClick={handleAutoScore} className="text-xs px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded">
                      自動採点
                    </button>
                  </div>
                </div>
                <textarea
                  value={createBlueprintJson}
                  onChange={(e) => setCreateBlueprintJson(e.target.value)}
                  rows={14}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded font-mono text-sm"
                />
              </div>

              {createKaidanWarnings.length > 0 && (
                <div className="space-y-1">
                  {createKaidanWarnings.map((w, i) => (
                    <div key={i} className={`p-2 rounded text-sm ${w.severity === "error" ? "bg-red-900/50 text-red-300" : "bg-yellow-900/50 text-yellow-300"}`}>
                      [{w.field}] {w.message} <span className="text-xs">(-{w.deduction}点)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* StyleBlueprint追加トグル */}
            <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStyle}
                onChange={(e) => setIncludeStyle(e.target.checked)}
                className="accent-blue-500"
              />
              文体（StyleBlueprint）も一緒に登録する
            </label>

            {includeStyle &&
              renderStyleForm(
                createStyleData,
                setCreateStyleData,
                createStyleQuality,
                setCreateStyleQuality
              )}

            {/* 保存ボタン */}
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || !createTitle.trim()}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-medium"
            >
              {loading ? "保存中..." : `保存${includeStyle ? "（構造 + 文体）" : "（構造のみ）"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
