"use client";

import React, { useState } from "react";
import { Check, Copy, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface MessageActionsProps {
  content: string;
  onRegenerate?: () => void;
}

export function MessageActions({ content, onRegenerate }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);

  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleReaction = (type: "like" | "dislike") => {
    setReaction((prev) => (prev === type ? null : type));
  };

  return (
    <div className="flex items-center gap-1 mt-2.5 text-stone-400 dark:text-neutral-500">
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-neutral-800 hover:text-stone-700 dark:hover:text-neutral-300 transition-colors focus:outline-none"
        title="Copy response"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-neutral-800 hover:text-stone-700 dark:hover:text-neutral-300 transition-colors focus:outline-none"
          title="Regenerate response"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        type="button"
        onClick={() => toggleReaction("like")}
        className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none ${
          reaction === "like" ? "text-blue-600 dark:text-blue-400" : "hover:text-stone-700 dark:hover:text-neutral-300"
        }`}
        title="Good response"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => toggleReaction("dislike")}
        className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none ${
          reaction === "dislike" ? "text-rose-600 dark:text-rose-400" : "hover:text-stone-700 dark:hover:text-neutral-300"
        }`}
        title="Bad response"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
