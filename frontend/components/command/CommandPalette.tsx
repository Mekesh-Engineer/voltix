"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MessageSquare,
  Sparkles,
  Scale,
  Settings as SettingsIcon,
  Sun,
  Moon,
} from "lucide-react";
import { Conversation } from "@/types/conversation";
import { ModelInfo } from "@/types/model";
import { resolveIsDark } from "@/lib/storage";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenSettings: () => void;
  theme: "system" | "light" | "dark";
  onThemeToggle: (theme: "system" | "light" | "dark") => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  conversations,
  onSelectConversation,
  onNewChat,
  models,
  selectedModel,
  onSelectModel,
  onOpenSettings,
  theme,
  onThemeToggle,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredConversations = conversations.filter(
    (c) => c.title.toLowerCase().includes(q) || (c.lastMessagePreview && c.lastMessagePreview.toLowerCase().includes(q))
  ).slice(0, 5);

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity dark:bg-black/60"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl transition-all dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        {/* Search Input */}
        <div className="flex items-center border-b border-stone-200 px-4 py-3 dark:border-neutral-800">
          <Search className="h-4 w-4 text-stone-400 mr-2.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search conversations, or switch models..."
            className="flex-1 bg-transparent text-sm placeholder:text-stone-400 focus:outline-none dark:text-neutral-100"
          />
          <kbd className="hidden sm:inline-block rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Quick AI & Workspace Actions (Section 26) */}
          <div>
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-neutral-500">
              AI Commands & Actions
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-stone-700 hover:bg-blue-50 dark:text-neutral-300 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">✦ Ask Aetherion (New Chat)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  router.push("/studio");
                  onClose();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-stone-700 hover:bg-blue-50 dark:text-neutral-300 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Scale className="h-4 w-4 text-blue-500" />
                <span>Open Studio Arena</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-stone-700 hover:bg-blue-50 dark:text-neutral-300 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <SettingsIcon className="h-4 w-4 text-stone-400" />
                <span>Configure Settings & API Keys</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const isDark = resolveIsDark(theme);
                  onThemeToggle(isDark ? "light" : "dark");
                  onClose();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-stone-700 hover:bg-blue-50 dark:text-neutral-300 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {resolveIsDark(theme) ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
                <span>Toggle {resolveIsDark(theme) ? "Light" : "Dark"} Theme</span>
              </button>
            </div>
          </div>

          {/* Models */}
          {filteredModels.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500">
                Models
              </div>
              <div className="space-y-0.5">
                {filteredModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(m.id);
                      onClose();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      m.id === selectedModel
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                        : "text-stone-700 hover:bg-stone-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Sparkles className="h-3.5 w-3.5 text-stone-400" />
                      <span className="truncate">{m.name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 dark:text-neutral-500 capitalize">
                      {m.provider}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversations */}
          {filteredConversations.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500">
                Conversations
              </div>
              <div className="space-y-0.5">
                {filteredConversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectConversation(c.id);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-stone-700 hover:bg-stone-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="h-3.5 w-3.5 text-stone-400" />
                      <span className="truncate">{c.title}</span>
                    </div>
                    {c.isPinned && (
                      <span className="text-[10px] text-amber-500 font-medium">Pinned</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
