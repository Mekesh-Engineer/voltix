"use client";

import React, { useState } from "react";
import { FileText, Copy, Check } from "lucide-react";
import { CitationItem } from "@/types/chat";
import { copyToClipboard } from "@/lib/utils";

interface SourceInspectorProps {
  citation: CitationItem | null;
  onClose: () => void;
}

export function SourceInspector({ citation, onClose }: SourceInspectorProps) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(citation.snippet);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const scorePercent = Math.round(citation.score * 100);

  return (
    <div className="space-y-4 text-left">
      {/* File Info Card */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5 dark:border-neutral-800 dark:bg-neutral-850">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="font-semibold text-xs text-stone-900 dark:text-neutral-100 truncate">
              {citation.filename}
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {scorePercent}% match
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-neutral-400">
          <span>Source Tag: <span className="font-mono text-stone-700 dark:text-neutral-300">{citation.source}</span></span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-stone-600 hover:bg-stone-200 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy Chunk</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Snippet / Full Text View */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500 mb-2">
          Retrieved Context Chunk
        </h4>
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs font-mono leading-relaxed text-stone-800 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 whitespace-pre-wrap select-text">
          {citation.snippet}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-stone-200 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Close Inspector
        </button>
      </div>
    </div>
  );
}
