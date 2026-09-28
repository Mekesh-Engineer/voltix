"use client";

import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { CitationItem } from "@/types/chat";

interface SourceListProps {
  citations: CitationItem[];
}

export function SourceList({ citations }: SourceListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="my-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-2xs"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>{citations.length} {citations.length === 1 ? "source cited" : "sources cited"}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2.5 p-3.5 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/60 dark:bg-neutral-850/60 space-y-2">
          {citations.map((c) => (
            <div
              key={c.id}
              className="p-2.5 rounded-lg border border-stone-200/70 dark:border-neutral-700/70 bg-white dark:bg-neutral-800 text-xs shadow-2xs"
            >
              <div className="flex items-center justify-between font-semibold text-stone-800 dark:text-neutral-200 mb-1">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{c.filename}</span>
                </span>
                <span className="text-[11px] text-stone-400 dark:text-neutral-500 font-mono">
                  Score: {c.score}
                </span>
              </div>
              <p className="text-stone-600 dark:text-neutral-400 italic line-clamp-3 leading-relaxed">
                &quot;{c.snippet}&quot;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
