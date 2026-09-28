"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
  hasNewContent?: boolean;
}

export function ScrollToBottom({
  visible,
  onClick,
  hasNewContent = false,
}: ScrollToBottomProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-stone-700 shadow-lg backdrop-blur-xs transition-all hover:bg-stone-50 dark:border-neutral-700 dark:bg-neutral-800/95 dark:text-neutral-200 dark:hover:bg-neutral-750"
      aria-label="Scroll to latest message"
    >
      <ChevronDown className="h-3.5 w-3.5" />
      <span>Latest</span>
      {hasNewContent && (
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
      )}
    </button>
  );
}
