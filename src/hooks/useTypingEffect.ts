"use client";

import { useState, useEffect, useCallback } from "react";

interface UseTypingEffectOptions {
  speed?: number; // ミリ秒/文字
  startDelay?: number; // 開始までの遅延
}

interface UseTypingEffectReturn {
  displayedText: string;
  isComplete: boolean;
  isTyping: boolean;
  progress: number; // 0-100
  skip: () => void; // スキップ機能
}

const DEFAULT_SPEED = 50;
const DEFAULT_START_DELAY = 500;

export function useTypingEffect(
  text: string,
  options: UseTypingEffectOptions = {}
): UseTypingEffectReturn {
  const { speed = DEFAULT_SPEED, startDelay = DEFAULT_START_DELAY } = options;

  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [shouldSkip, setShouldSkip] = useState(false);

  const skip = useCallback(() => {
    setShouldSkip(true);
  }, []);

  useEffect(() => {
    if (!text) {
      setIsComplete(true);
      return;
    }

    // スキップされた場合
    if (shouldSkip) {
      setDisplayedText(text);
      setIsComplete(true);
      setIsTyping(false);
      return;
    }

    let currentIndex = 0;
    let intervalId: NodeJS.Timeout;

    // 開始遅延
    const startTimeout = setTimeout(() => {
      setIsTyping(true);

      intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(intervalId);
          setIsComplete(true);
          setIsTyping(false);
        }
      }, speed);
    }, startDelay);

    // クリーンアップ
    return () => {
      clearTimeout(startTimeout);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [text, speed, startDelay, shouldSkip]);

  const progress = text ? (displayedText.length / text.length) * 100 : 100;

  return {
    displayedText,
    isComplete,
    isTyping,
    progress,
    skip,
  };
}
