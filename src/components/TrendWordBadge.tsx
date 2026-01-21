"use client";

import { TrendWord } from "@/types";

interface TrendWordBadgeProps {
  trendWord: TrendWord;
  onClick?: () => void;
}

export default function TrendWordBadge({
  trendWord,
  onClick,
}: TrendWordBadgeProps) {
  const { word, current_count, growth_rate } = trendWord;

  // 成長率に応じた色
  const getGrowthColor = (rate: number) => {
    if (rate >= 200) return "text-yellow-400";
    if (rate >= 100) return "text-orange-400";
    if (rate >= 50) return "text-horror-crimson";
    return "text-gray-400";
  };

  // 成長率に応じた炎の数
  const getFireCount = (rate: number) => {
    if (rate >= 200) return 3;
    if (rate >= 100) return 2;
    if (rate >= 50) return 1;
    return 0;
  };

  const fireCount = getFireCount(growth_rate);

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 bg-horror-dark/80 border border-horror-red/30 rounded-lg hover:border-horror-crimson/50 transition-all duration-300"
    >
      <span className="font-bold text-white">{word}</span>
      <span className="text-xs text-gray-400">({current_count})</span>
      {fireCount > 0 && (
        <span className="flex">
          {Array.from({ length: fireCount }).map((_, i) => (
            <span key={i}>🔥</span>
          ))}
        </span>
      )}
      <span className={`text-xs font-bold ${getGrowthColor(growth_rate)}`}>
        +{growth_rate.toFixed(0)}%
      </span>
    </button>
  );
}
