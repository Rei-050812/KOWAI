"use client";

import { useCallback, useState } from "react";

type DashboardData = {
  stories: { total: number; thisWeek: number; thisMonth: number };
  reviews: {
    total: number;
    avgRating: number;
    ratingDistribution: Record<string, number>;
  };
  kaidanBlueprints: { total: number; avgQuality: number };
  styleBlueprints: {
    total: number;
    active: number;
    usageStats: { name: string; count: number }[];
  };
  qualityFlags: {
    eventRepetition: number;
    actionConsistency: number;
    quoteIncomplete: number;
    coherenceIssue: number;
  };
  issuesTrend: { issue: string; count: number }[];
};

const ISSUE_LABELS: Record<string, string> = {
  ending_weak: "〆が弱い",
  too_similar: "既視感/似すぎ",
  boring: "退屈",
  confusing: "意味が追えない",
  not_scary: "怖くない",
  repetition: "反復・重複がひどい",
  length_mismatch: "指定の長さと違う",
  too_explained: "説明が多すぎる",
  weak_opening: "出だしが弱い/テンプレ",
  weak_core: "怪異コアが弱い",
  ai_tone: "AIっぽい",
};

function ratingColor(avg: number): string {
  if (avg >= 4) return "text-green-400";
  if (avg >= 3) return "text-yellow-400";
  if (avg >= 2) return "text-orange-400";
  return "text-red-400";
}

function qualityColor(avg: number): string {
  if (avg >= 70) return "text-green-400";
  if (avg >= 50) return "text-yellow-400";
  return "text-red-400";
}

function flagSeverity(count: number, total: number): string {
  if (total === 0) return "text-gray-400";
  const ratio = count / total;
  if (ratio >= 0.3) return "text-red-400";
  if (ratio >= 0.1) return "text-yellow-400";
  return "text-green-400";
}

function RatingBar({
  rating,
  count,
  max,
}: {
  rating: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-right text-gray-300">{rating}</span>
      <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full bg-red-600 rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-400">{count}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "データの取得に失敗しました");
      }
      setData(json as DashboardData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  const maxRatingCount = data
    ? Math.max(
        ...Object.values(data.reviews.ratingDistribution).map(Number),
        1
      )
    : 1;

  const totalFlaggedLogs = data
    ? data.qualityFlags.eventRepetition +
      data.qualityFlags.actionConsistency +
      data.qualityFlags.quoteIncomplete +
      data.qualityFlags.coherenceIssue
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">統計ダッシュボード</h1>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_TOKEN を入力"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
            />
            <button
              type="button"
              onClick={handleLoad}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
              disabled={loading}
            >
              {loading ? "読み込み中..." : "データ読み込み"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-900/40 text-red-300 rounded">{error}</div>
        )}

        {/* No data placeholder */}
        {!data && !loading && !error && (
          <div className="text-sm text-gray-400">
            トークンを入力して「データ読み込み」を押してください。
          </div>
        )}

        {data && (
          <>
            {/* ===== Top-level stat cards ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total stories */}
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">総ストーリー数</div>
                <div className="text-3xl font-bold">{data.stories.total}</div>
                <div className="text-xs text-gray-500 mt-1">
                  今週 {data.stories.thisWeek} / 今月{" "}
                  {data.stories.thisMonth}
                </div>
              </div>

              {/* Avg rating */}
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">平均レビュー評価</div>
                <div
                  className={`text-3xl font-bold ${ratingColor(data.reviews.avgRating)}`}
                >
                  {data.reviews.avgRating > 0
                    ? data.reviews.avgRating.toFixed(2)
                    : "-"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  レビュー数 {data.reviews.total}
                </div>
              </div>

              {/* Kaidan Blueprints */}
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">
                  怪談Blueprint
                </div>
                <div className="text-3xl font-bold">
                  {data.kaidanBlueprints.total}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  平均品質{" "}
                  <span className={qualityColor(data.kaidanBlueprints.avgQuality)}>
                    {data.kaidanBlueprints.avgQuality}
                  </span>
                </div>
              </div>

              {/* Style Blueprints */}
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">
                  StyleBlueprint
                </div>
                <div className="text-3xl font-bold">
                  {data.styleBlueprints.total}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  有効 {data.styleBlueprints.active} /{" "}
                  {data.styleBlueprints.total}
                </div>
              </div>
            </div>

            {/* ===== Detailed sections ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rating distribution */}
              <div className="p-5 bg-gray-950/40 border border-gray-800 rounded-lg space-y-3">
                <h2 className="text-lg font-semibold">評価分布</h2>
                {["5", "4", "3", "2", "1"].map((r) => (
                  <RatingBar
                    key={r}
                    rating={r}
                    count={data.reviews.ratingDistribution[r] || 0}
                    max={maxRatingCount}
                  />
                ))}
                {data.reviews.total === 0 && (
                  <div className="text-sm text-gray-500">
                    レビューデータがありません
                  </div>
                )}
              </div>

              {/* Quality flags */}
              <div className="p-5 bg-gray-950/40 border border-gray-800 rounded-lg space-y-3">
                <h2 className="text-lg font-semibold">品質フラグ</h2>
                <div className="space-y-2">
                  {[
                    {
                      label: "出来事重複検出",
                      key: "eventRepetition" as const,
                    },
                    {
                      label: "行動不整合検出",
                      key: "actionConsistency" as const,
                    },
                    {
                      label: "引用不完了検出",
                      key: "quoteIncomplete" as const,
                    },
                    {
                      label: "支離滅裂検出",
                      key: "coherenceIssue" as const,
                    },
                  ].map(({ label, key }) => {
                    const count = data.qualityFlags[key];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-300">{label}</span>
                        <span
                          className={`font-mono font-bold ${flagSeverity(count, totalFlaggedLogs || 1)}`}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {totalFlaggedLogs === 0 && (
                  <div className="text-sm text-gray-500">
                    フラグデータがありません
                  </div>
                )}
              </div>

              {/* Issue trends */}
              <div className="p-5 bg-gray-950/40 border border-gray-800 rounded-lg space-y-3">
                <h2 className="text-lg font-semibold">レビュー問題傾向</h2>
                {data.issuesTrend.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    問題データがありません
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.issuesTrend.map(({ issue, count }) => {
                      const maxIssue = data.issuesTrend[0]?.count || 1;
                      const pct = (count / maxIssue) * 100;
                      const barColor =
                        pct >= 80
                          ? "bg-red-600"
                          : pct >= 50
                            ? "bg-yellow-600"
                            : "bg-green-600";
                      return (
                        <div key={issue} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">
                              {ISSUE_LABELS[issue] || issue}
                            </span>
                            <span className="text-gray-400 font-mono">
                              {count}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded overflow-hidden">
                            <div
                              className={`h-full ${barColor} rounded`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Style Blueprint usage */}
              <div className="p-5 bg-gray-950/40 border border-gray-800 rounded-lg space-y-3">
                <h2 className="text-lg font-semibold">
                  StyleBlueprint 使用状況
                </h2>
                {data.styleBlueprints.usageStats.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    StyleBlueprintデータがありません
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                          <th className="pb-2">スタイル名</th>
                          <th className="pb-2 text-right">使用回数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.styleBlueprints.usageStats.map((s, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-800/50"
                          >
                            <td className="py-2 text-gray-200">{s.name}</td>
                            <td className="py-2 text-right font-mono text-gray-300">
                              {s.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
