"use client";

interface HallOfFameBadgeProps {
  size?: "sm" | "md" | "lg";
}

export default function HallOfFameBadge({ size = "sm" }: HallOfFameBadgeProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <span
      className={`${sizeClasses[size]} inline-block`}
      title="殿堂入り"
    >
      👑
    </span>
  );
}
