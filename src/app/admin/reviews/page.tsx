"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "../AdminAuthContext";

type QueueType = "priority" | "all" | "random";

type ReviewItem = {
  log_id?: string;
  story_id: string;
  title?: string;
  hook?: string;
  story?: string;
  final_story?: string;
  story_text?: string;
  created_at: string;
  blueprint_id: number | null;
  target_length?: string;
  ending_type?: string | null;
  priority?: number;
  event_repetition_detected?: boolean;
  action_consistency_issue?: boolean;
  quote_incomplete_detected?: boolean;
  coherence_issue?: boolean;
  retry_total?: number;
  fallback_reason?: string;
};

const ISSUE_OPTIONS = [
  { value: "ending_weak", label: "〆が弱い" },
  { value: "too_similar", label: "既視感/似すぎ" },
  { value: "boring", label: "退屈" },
  { value: "confusing", label: "意味が追えない" },
  { value: "not_scary", label: "怖くない" },
  { value: "repetition", label: "反復・重複がひどい" },
  { value: "length_mismatch", label: "指定の長さと違う" },
  { value: "too_explained", label: "説明が多すぎる" },
  { value: "weak_opening", label: "出だしが弱い/テンプレ" },
  { value: "weak_core", label: "怪異コアが弱い" },
  { value: "ai_tone", label: "AIっぽい" },
];

const QUEUE_LABELS: Record<QueueType, string> = {
  priority: "要注意（優先）",
  all: "全件（新しい順）",
  random: "全件（ランダム）",
};

export default function AdminReviewsPage() {
  const { token } = useAdminAuth();
  const [queueType, setQueueType] = useState<QueueType>("priority");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState<number | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);

  const currentItem = items[currentIndex] || null;
  const total = items.length;

  const storyText = useMemo(() => {
    if (!currentItem) return "";
    return (
      currentItem.story_text ||
      currentItem.final_story ||
      currentItem.story ||
      ""
    );
  }, [currentItem]);

  const resetForm = useCallback(() => {
    setRating(null);
    setIssues([]);
    setNote("");
    setDirty(false);
  }, []);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reviews?limit=50&queue_type=${queueType}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "レビュー一覧の取得に失敗しました");
      }
      setItems(data.items || []);
      setCurrentIndex(0);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "レビュー一覧の取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, [queueType, token, resetForm]);

  // ログイン時・キュー切り替え時に自動読み込み
  useEffect(() => {
    if (token) {
      handleLoad();
    }
  }, [token, queueType, handleLoad]);

  const handleSaveCurrent = useCallback(async () => {
    if (!currentItem) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storyId: currentItem.story_id,
          rating,
          issues,
          note: note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "レビューの保存に失敗しました");
      }
      setItems((prev) => prev.filter((_, idx) => idx !== currentIndex));
      const nextIndex = Math.min(currentIndex, Math.max(0, total - 2));
      setCurrentIndex(nextIndex);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "レビューの保存に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, [currentItem, token, rating, issues, note, currentIndex, total, resetForm]);

  const handleNext = useCallback(() => {
    if (dirty) {
      setError("未保存の変更があります。保存するかキャンセルしてください。");
      return;
    }
    setError(null);
    setCurrentIndex((prev) => Math.min(prev + 1, total - 1));
    resetForm();
  }, [dirty, total, resetForm]);

  const handlePrev = useCallback(() => {
    if (dirty) {
      setError("未保存の変更があります。保存するかキャンセルしてください。");
      return;
    }
    setError(null);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    resetForm();
  }, [dirty, resetForm]);

  const toggleIssue = useCallback((value: string) => {
    setIssues((prev) => {
      const next = prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value];
      return next;
    });
    setDirty(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!currentItem || loading) return;
      if (e.key >= "1" && e.key <= "5") {
        setRating(Number(e.key));
        setDirty(true);
        return;
      }
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveCurrent();
        return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNext();
        return;
      }
      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        handleNext();
        return;
      }
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentItem, loading, handleSaveCurrent, handleNext, handlePrev]);

  return (
    <div className="text-gray-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">管理レビュー</h1>
          <button
            type="button"
            onClick={handleLoad}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
            disabled={loading || !token}
          >
            {loading ? "読み込み中..." : "読み込み"}
          </button>
        </div>

        <div className="flex gap-2">
          {(["priority", "all", "random"] as QueueType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setQueueType(type)}
              className={`px-3 py-1 rounded text-sm ${
                queueType === type
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              {QUEUE_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-400">
          ショートカット: 1-5=評価, S=保存, N/J=次へ, K=前へ
        </div>

        {error && (
          <div className="p-3 bg-red-900/40 text-red-300 rounded">{error}</div>
        )}

        {total === 0 && !loading && (
          <div className="text-sm text-gray-400">
            {token ? "「読み込み」ボタンを押してデータを取得してください。" : "サイドバーから認証してください。"}
          </div>
        )}

        {currentItem && (
          <div className="border border-gray-800 rounded-lg p-5 space-y-4 bg-gray-950/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {currentItem.title || "（無題）"}
                </div>
                <div className="text-sm text-gray-400">
                  {currentItem.hook || ""}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {queueType === "priority" && (
                  <>
                    優先度:{" "}
                    <span className="text-red-300">
                      {currentItem.priority ?? "-"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {storyText}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div>フォールバック: {currentItem.fallback_reason ?? "-"}</div>
              <div>再生成回数: {currentItem.retry_total ?? "-"}</div>
              <div>長さ: {currentItem.target_length ?? "-"}</div>
              <div>終端タイプ: {currentItem.ending_type ?? "-"}</div>
              <div>
                イベント重複: {String(currentItem.event_repetition_detected)}
              </div>
              <div>
                行動不整合: {String(currentItem.action_consistency_issue)}
              </div>
              <div>
                引用不完了: {String(currentItem.quote_incomplete_detected)}
              </div>
              <div>支離滅裂: {String(currentItem.coherence_issue)}</div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-300">評価</label>
              <select
                value={rating === null ? "" : String(rating)}
                onChange={(e) => {
                  const v = e.target.value;
                  setRating(v ? Number(v) : null);
                  setDirty(true);
                }}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              >
                <option value="">未評価</option>
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-400">
                {currentIndex + 1} / {total}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {ISSUE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="text-xs text-gray-300 flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={issues.includes(opt.value)}
                    onChange={() => toggleIssue(opt.value)}
                    className="accent-red-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setDirty(true);
              }}
              placeholder="メモ（任意）"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveCurrent}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                disabled={loading}
              >
                保存
              </button>
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                disabled={loading}
              >
                前へ
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                disabled={loading}
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
