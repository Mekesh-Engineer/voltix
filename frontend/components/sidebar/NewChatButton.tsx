"use client";

import React from "react";
import { Plus } from "lucide-react";

interface NewChatButtonProps {
  onClick: () => void;
  minified?: boolean;
}

export function NewChatButton({ onClick, minified = false }: NewChatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Start new chat"
      className={`group relative w-full flex items-center gap-2.5 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
        minified
          ? "justify-center p-2 text-stone-700 dark:text-neutral-300 hover:bg-stone-200/70 dark:hover:bg-neutral-800"
          : "px-3 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm shadow-blue-500/25 hover:shadow-md hover:shadow-blue-500/35 border border-white/10 active:scale-[0.98]"
      }`}
      title="Create new conversation (⌘N / Ctrl+N)"
    >
      <div
        className={`flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:rotate-90 ${
          minified
            ? "w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30"
            : "w-5 h-5 rounded-lg bg-white/20 text-white backdrop-blur-xs"
        }`}
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
      </div>
      {!minified && (
        <>
          <span className="truncate flex-1 text-left font-semibold tracking-tight">
            New Chat
          </span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-white/80 bg-black/20 rounded border border-white/15">
            ⌘N
          </kbd>
        </>
      )}
    </button>
  );
}
