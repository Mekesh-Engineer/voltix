"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, MessageSquare, CornerDownLeft } from "lucide-react";
import { Conversation } from "@/types/conversation";

interface SearchChatsProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  minified?: boolean;
}

export function SearchChats({
  conversations,
  onSelectConversation,
  minified = false,
}: SearchChatsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" &&
          (e.target as HTMLElement).tagName !== "INPUT" &&
          (e.target as HTMLElement).tagName !== "TEXTAREA") ||
        ((e.metaKey || e.ctrlKey) && e.key === "k")
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search conversations"
        className={`group w-full flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-neutral-800/60 border border-transparent hover:border-stone-200 dark:hover:border-neutral-700/60 ${
          minified ? "justify-center p-2" : "px-3 py-2"
        }`}
        title="Search chats (⌘K or /)"
      >
        <Search className="w-4 h-4 text-stone-400 dark:text-neutral-500 group-hover:text-blue-500 dark:group-hover:text-cyan-400 transition-colors shrink-0" />
        {!minified && (
          <>
            <span className="truncate flex-1 text-left text-xs text-stone-500 dark:text-neutral-400">
              Search chats...
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-stone-400 dark:text-neutral-500 bg-stone-100 dark:bg-neutral-800/80 px-1.5 py-0.5 rounded border border-stone-200 dark:border-neutral-700/60">
              <span className="text-[9px]">⌘</span>K
            </span>
          </>
        )}
      </button>

      {/* Futuristic Search Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-stone-200/80 dark:border-white/10 bg-white/95 dark:bg-[#12141a]/95 backdrop-blur-xl shadow-2xl overflow-hidden divide-y divide-stone-100 dark:divide-white/[0.06] transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Header */}
            <div className="flex items-center px-4 py-3.5 gap-3 bg-stone-50/50 dark:bg-white/[0.02]">
              <Search className="w-4 h-4 text-blue-500 dark:text-cyan-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all conversation titles..."
                className="w-full bg-transparent border-none outline-none text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-neutral-500 text-sm font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-stone-400 dark:text-neutral-500 border border-stone-200 dark:border-neutral-700 rounded">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto text-stone-300 dark:text-neutral-700 stroke-[1.5] mb-2" />
                  <p className="text-xs text-stone-500 dark:text-neutral-400 font-medium">
                    No conversations found matching &quot;{query}&quot;
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500 flex items-center justify-between">
                    <span>Conversations</span>
                    <span>{filtered.length} found</span>
                  </div>
                  {filtered.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectConversation(c.id);
                        handleClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-cyan-500/10 text-left transition-colors group border border-transparent hover:border-blue-200/50 dark:hover:border-cyan-500/20"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-white/[0.05] group-hover:bg-blue-500/10 dark:group-hover:bg-cyan-500/20 flex items-center justify-center shrink-0 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5 text-stone-500 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-cyan-400" />
                        </div>
                        <span className="text-xs font-medium text-stone-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-cyan-300 truncate">
                          {c.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-stone-400 dark:text-neutral-500 font-mono">Open</span>
                        <CornerDownLeft className="w-3 h-3 text-stone-400 dark:text-neutral-500" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 bg-stone-50/60 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-stone-400 dark:text-neutral-500">
              <span>Quick navigation</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-stone-200/70 dark:bg-neutral-800 px-1 py-0.5 rounded text-[9px]">↑</kbd>
                  <kbd className="font-mono bg-stone-200/70 dark:bg-neutral-800 px-1 py-0.5 rounded text-[9px]">↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-stone-200/70 dark:bg-neutral-800 px-1 py-0.5 rounded text-[9px]">↵</kbd> select
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
