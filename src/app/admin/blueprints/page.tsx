"use client";

import { useCallback, useState, useEffect } from "react";
import { KaidanBlueprintData, StyleBlueprint, StyleBlueprintData, StyleViolation } from "@/types";
import { scoreBlueprint, deductionsToWarnings } from "@/lib/blueprint-scoring";
import { useAdminAuth } from "../AdminAuthContext";

type Tab = "kaidan" | "style";

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
  const { token } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("kaidan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // KaidanBlueprint一覧
  const [kaidanList, setKaidanList] = useState<KaidanBlueprintRow[]>([]);

  // StyleBlueprint一覧
  const [styleList, setStyleList] = useState<StyleBlueprint[]>([]);

  // StyleBlueprintバリデーション
  const [styleViolations, setStyleViolations] = useState<StyleViolation[]>([]);
  const [styleWarnings, setStyleWarnings] = useState<StyleViolation[]>([]);

  // StyleBlueprint編集
  const [editingStyleId, setEditingStyleId] = useState<number | null>(null);
  const [editStyleData, setEditStyleData] =
    useState<StyleBlueprintData>(EMPTY_STYLE_DATA);
  const [editStyleQuality, setEditStyleQuality] = useState(70);

  // StyleBlueprint新規作成（単体）
  const [creatingNewStyle, setCreatingNewStyle] = useState(false);
  const [newStyleData, setNewStyleData] = useState<StyleBlueprintData>(EMPTY_STYLE_DATA);
  const [newStyleQuality, setNewStyleQuality] = useState(70);

  // KaidanBlueprint新規作成（単体）
  const [creatingNewKaidan, setCreatingNewKaidan] = useState(false);
  const [newKaidanTitle, setNewKaidanTitle] = useState("");
  const [newKaidanTags, setNewKaidanTags] = useState("");
  const [newKaidanJson, setNewKaidanJson] = useState(JSON.stringify(DEFAULT_BLUEPRINT, null, 2));
  const [newKaidanScore, setNewKaidanScore] = useState(100);
  const [newKaidanWarnings, setNewKaidanWarnings] = useState<
    { field: string; message: string; severity: string; deduction: number }[]
  >([]);

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

  // ログイン時・タブ切り替え時に自動読み込み
  useEffect(() => {
    if (token) {
      handleLoad();
    }
  }, [token, tab, handleLoad]);

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

  // --- StyleBlueprint単体の新規保存 ---
  const handleSaveNewStyle = useCallback(async () => {
    setLoading(true);
    setStyleViolations([]);
    setStyleWarnings([]);
    setError(null);
    try {
      const res = await fetch("/api/admin/style-blueprints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          styleData: newStyleData,
          qualityScore: newStyleQuality,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.violations && data.violations.length > 0) {
          setStyleViolations(data.violations);
          setStyleWarnings(data.warnings || []);
        }
        throw new Error(data.error);
      }
      setCreatingNewStyle(false);
      setNewStyleData(EMPTY_STYLE_DATA);
      setNewStyleQuality(70);
      await loadStyle();
      setSuccess(`文体「${newStyleData.archetype_name}」を登録しました`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [newStyleData, newStyleQuality, token, loadStyle]);

  // --- KaidanBlueprint単体の新規保存 ---
  const handleSaveNewKaidan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const blueprint = JSON.parse(newKaidanJson);
      const res = await fetch("/api/blueprints/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newKaidanTitle,
          tags: newKaidanTags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t),
          blueprint,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存に失敗");
      setCreatingNewKaidan(false);
      setNewKaidanTitle("");
      setNewKaidanTags("");
      setNewKaidanJson(JSON.stringify(DEFAULT_BLUEPRINT, null, 2));
      setNewKaidanScore(100);
      setNewKaidanWarnings([]);
      await loadKaidan();
      setSuccess(`構造「${newKaidanTitle}」を登録しました（スコア: ${data.quality_score}）`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [newKaidanTitle, newKaidanTags, newKaidanJson, loadKaidan]);

  // --- KaidanBlueprint自動採点（新規登録フォーム用） ---
  const handleAutoScoreNewKaidan = useCallback(() => {
    try {
      const bp = JSON.parse(newKaidanJson) as KaidanBlueprintData;
      const result = scoreBlueprint(bp);
      setNewKaidanScore(result.score);
      setNewKaidanWarnings(deductionsToWarnings(result.deductions));
      setSuccess(`採点完了: ${result.score}点`);
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError("JSONの形式が不正です");
      setNewKaidanScore(0);
    }
  }, [newKaidanJson]);


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
    <div className="text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Blueprint 管理</h1>
        </div>

        {/* メッセージ */}
        {error && <div className="p-3 bg-red-900/40 text-red-300 rounded">{error}</div>}
        {success && <div className="p-3 bg-green-900/40 text-green-300 rounded">{success}</div>}

        {/* タブ */}
        <div className="flex gap-2 border-b border-gray-700 pb-2">
          {([
            ["kaidan", "構造（KaidanBlueprint）"],
            ["style", "文体（StyleBlueprint）"],
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
            {creatingNewKaidan ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">構造を新規登録</h2>
                <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">タイトル *</label>
                    <input
                      type="text"
                      value={newKaidanTitle}
                      onChange={(e) => setNewKaidanTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                      placeholder="例: 鏡の向こう側パターン"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">タグ（カンマ区切り）</label>
                    <input
                      type="text"
                      value={newKaidanTags}
                      onChange={(e) => setNewKaidanTags(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                      placeholder="例: 鏡, 目撃系, 心霊"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm text-gray-300">Blueprint JSON *</label>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${newKaidanScore >= 70 ? "text-green-400" : newKaidanScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          {newKaidanScore}点
                        </span>
                        <button type="button" onClick={handleAutoScoreNewKaidan} className="text-xs px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded">
                          自動採点
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={newKaidanJson}
                      onChange={(e) => setNewKaidanJson(e.target.value)}
                      rows={14}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded font-mono text-sm"
                    />
                  </div>

                  {newKaidanWarnings.length > 0 && (
                    <div className="space-y-1">
                      {newKaidanWarnings.map((w, i) => (
                        <div key={i} className={`p-2 rounded text-sm ${w.severity === "error" ? "bg-red-900/50 text-red-300" : "bg-yellow-900/50 text-yellow-300"}`}>
                          [{w.field}] {w.message} <span className="text-xs">(-{w.deduction}点)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNewKaidan}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                    disabled={loading || !newKaidanTitle.trim()}
                  >
                    {loading ? "保存中..." : "登録"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingNewKaidan(false);
                      setNewKaidanTitle("");
                      setNewKaidanTags("");
                      setNewKaidanJson(JSON.stringify(DEFAULT_BLUEPRINT, null, 2));
                      setNewKaidanScore(100);
                      setNewKaidanWarnings([]);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={() => setCreatingNewKaidan(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    disabled={!token}
                  >
                    + 新規登録
                  </button>
                </div>
                {kaidanList.length === 0 && !loading && (
                  <div className="text-gray-400 text-sm">{token ? "「読み込み」ボタンを押してデータを取得してください。" : "サイドバーから認証してください。"}</div>
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
              </>
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
            ) : creatingNewStyle ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">文体を新規登録</h2>
                {renderStyleForm(newStyleData, setNewStyleData, newStyleQuality, setNewStyleQuality)}
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveNewStyle} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm" disabled={loading || !newStyleData.archetype_name.trim()}>
                    {loading ? "保存中..." : "登録"}
                  </button>
                  <button type="button" onClick={() => { setCreatingNewStyle(false); setNewStyleData(EMPTY_STYLE_DATA); setStyleViolations([]); setStyleWarnings([]); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">キャンセル</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={() => setCreatingNewStyle(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    disabled={!token}
                  >
                    + 新規登録
                  </button>
                </div>
                {styleList.length === 0 && !loading && (
                  <div className="text-gray-400 text-sm">{token ? "「読み込み」ボタンを押してデータを取得してください。" : "サイドバーから認証してください。"}</div>
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

      </div>
    </div>
  );
}
