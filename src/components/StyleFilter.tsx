"use client";

import { StoryStyle, STYLE_LABELS } from "@/types";

interface StyleFilterProps {
  current: StoryStyle;
}

const styles: StoryStyle[] = ["short", "medium", "long"];

export default function StyleFilter({ current }: StyleFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      {styles.map((style) => (
        <a
          key={style}
          href={`/style/${style}`}
          className={`px-4 py-2 rounded-lg font-bold transition-all duration-300 ${
            current === style
              ? "bg-horror-red text-white"
              : "bg-horror-dark/50 text-gray-400 hover:bg-horror-dark hover:text-white border border-horror-red/30"
          }`}
        >
          {STYLE_LABELS[style]}
        </a>
      ))}
    </div>
  );
}
