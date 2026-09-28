"use client";

import React from "react";
import { Link2, Code, Image as ImageIcon, X } from "lucide-react";

export interface PasteDetection {
  type: "url" | "code" | "image";
  content: string;
}

interface PasteBannerProps {
  detection: PasteDetection | null;
  onApplyAction: (prefix: string) => void;
  onDismiss: () => void;
}

export function PasteBanner({
  detection,
  onApplyAction,
  onDismiss,
}: PasteBannerProps) {
  if (!detection) return null;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 text-xs animate-in fade-in slide-in-from-top-1 duration-150 rounded-t-2xl">
      <div className="flex items-center gap-2 min-w-0">
        {detection.type === "url" && <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
        {detection.type === "code" && <Code className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
        {detection.type === "image" && <ImageIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />}

        <span className="font-medium text-stone-800 dark:text-neutral-200 truncate">
          {detection.type === "url" && "URL detected"}
          {detection.type === "code" && "Code snippet detected"}
          {detection.type === "image" && "Image pasted"}
        </span>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 ml-1">
          {detection.type === "url" && (
            <>
              <button
                type="button"
                onClick={() => onApplyAction("Research this link and summarize its key insights: ")}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
              >
                Research Link
              </button>
              <button
                type="button"
                onClick={() => onApplyAction("Extract key information from: ")}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-neutral-800 text-stone-700 dark:text-neutral-300 border border-stone-200 dark:border-neutral-700 hover:bg-stone-50 transition-colors"
              >
                Extract Content
              </button>
            </>
          )}

          {detection.type === "code" && (
            <>
              <button
                type="button"
                onClick={() => onApplyAction("Explain this code step-by-step and identify optimizations:\n\n")}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
              >
                Explain Code
              </button>
              <button
                type="button"
                onClick={() => onApplyAction("Debug and fix any issues in this code:\n\n")}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-neutral-800 text-stone-700 dark:text-neutral-300 border border-stone-200 dark:border-neutral-700 hover:bg-stone-50 transition-colors"
              >
                Debug & Fix
              </button>
            </>
          )}

          {detection.type === "image" && (
            <button
              type="button"
              onClick={() => onApplyAction("Analyze this image and describe its structure and details: ")}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
            >
              Analyze Image
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-white"
        title="Dismiss suggestion"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
