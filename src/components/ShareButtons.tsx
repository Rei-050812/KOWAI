'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

interface ShareButtonsProps {
  storyId: string;
  word: string;
  title: string;
  hook: string;
  initialShareCount?: number;
}

export default function ShareButtons({
  storyId,
  word,
  title,
  hook,
  initialShareCount = 0,
}: ShareButtonsProps) {
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [copied, setCopied] = useState(false);

  // 現在のページURL
  const getUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/story/${storyId}`;
    }
    return '';
  };

  // シェア数をインクリメント
  const incrementShareCount = async () => {
    try {
      await fetch(`/api/stories/${storyId}/share`, {
        method: 'POST',
      });
      setShareCount((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  };

  // Xシェア
  const shareToX = () => {
    const url = getUrl();
    const text = `「${word}」から生まれた怪談「${title}」\n\n${hook.slice(0, 60)}${hook.length > 60 ? '...' : ''}\n\n#KOWAI #AI怪談\n`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
    incrementShareCount();
  };

  // LINEシェア
  const shareToLine = () => {
    const url = getUrl();
    const text = `【${title}】\n${hook.slice(0, 60)}...`;
    const shareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
    incrementShareCount();
  };

  // URLコピー
  const copyUrl = async () => {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      incrementShareCount();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* シェア数表示 */}
      {shareCount > 0 && (
        <div className="flex items-center gap-2 text-horror-text-secondary text-sm justify-center">
          <Share2 size={14} />
          <span>{shareCount}回シェアされました</span>
        </div>
      )}

      {/* シェアボタン群 */}
      <div className="flex items-center justify-center gap-4">
        {/* Xシェアボタン */}
        <button
          onClick={shareToX}
          className="flex items-center gap-2 px-6 py-3 bg-black hover:bg-gray-900 text-white rounded-md transition-all duration-300 border border-gray-700 hover:border-gray-500"
          style={{ boxShadow: '0 0 15px rgba(0, 0, 0, 0.3)' }}
        >
          <span className="text-lg">𝕏</span>
          <span className="hidden sm:inline text-sm tracking-wide">シェア</span>
        </button>

        {/* LINEシェアボタン */}
        <button
          onClick={shareToLine}
          className="flex items-center gap-2 px-6 py-3 bg-[#06C755] hover:bg-[#05b34b] text-white rounded-md transition-all duration-300"
          style={{ boxShadow: '0 0 15px rgba(6, 199, 85, 0.2)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          <span className="hidden sm:inline text-sm tracking-wide">LINE</span>
        </button>

        {/* URLコピーボタン */}
        <button
          onClick={copyUrl}
          className={`flex items-center gap-2 px-6 py-3 rounded-md transition-all duration-300 border ${
            copied
              ? 'bg-horror-red/20 text-horror-crimson border-horror-crimson/60'
              : 'bg-horror-dark text-horror-text-secondary border-horror-blood/50 hover:border-horror-crimson/60 hover:text-horror-text'
          }`}
          style={{ boxShadow: copied ? '0 0 20px rgba(165, 42, 42, 0.3)' : '0 0 15px rgba(0, 0, 0, 0.2)' }}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          <span className="hidden sm:inline text-sm tracking-wide">
            {copied ? 'コピー!' : 'URL'}
          </span>
        </button>
      </div>
    </div>
  );
}
