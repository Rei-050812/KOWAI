"use client";

import { RankingType } from "@/types";

interface RankingNavigationProps {
  current: RankingType;
}

const navItems: { id: RankingType; label: string; icon: string; href: string }[] = [
  { id: "hall_of_fame", label: "殿堂入り", icon: "👑", href: "/ranking/hall-of-fame" },
  { id: "weekly", label: "週間", icon: "📅", href: "/ranking/weekly" },
  { id: "monthly", label: "月間", icon: "📆", href: "/ranking/monthly" },
  { id: "hidden_gems", label: "隠れた名作", icon: "💎", href: "/ranking/hidden-gems" },
];

export default function RankingNavigation({ current }: RankingNavigationProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      <a
        href="/ranking"
        className="px-4 py-2 rounded-lg font-bold transition-all duration-300 bg-horror-dark/50 text-gray-400 hover:bg-horror-dark hover:text-white border border-horror-red/30"
      >
        🏠 トップ
      </a>
      {navItems.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg font-bold transition-all duration-300 ${
            current === item.id
              ? "bg-horror-red text-white"
              : "bg-horror-dark/50 text-gray-400 hover:bg-horror-dark hover:text-white border border-horror-red/30"
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </div>
  );
}
