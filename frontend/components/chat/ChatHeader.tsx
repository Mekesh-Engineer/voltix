"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Menu,
  Sun,
  Moon,
  Settings as SettingsIcon,
  Search,
  Scale,
  Share2,
  Check,
  ChevronDown,
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { useMounted } from "@/hooks/useMounted";
import { resolveIsDark } from "@/lib/storage";

interface ChatHeaderProps {
  title: string;
  theme: "system" | "light" | "dark";
  onThemeToggle: (theme: "system" | "light" | "dark") => void;
  onOpenSettings: () => void;
  onToggleSidebarMobile: () => void;
  modelName?: string;
  onOpenCommandPalette?: () => void;
  currentTokens?: number;
  maxTokens?: number;
  ollamaActive?: boolean;
}

export function ChatHeader({
  title,
  theme,
  onThemeToggle,
  onOpenSettings,
  onToggleSidebarMobile,
  modelName = "Qwen 2.5 7B",
  onOpenCommandPalette,
  currentTokens = 0,
  maxTokens = 8192,
  ollamaActive = true,
}: ChatHeaderProps) {
  const [copiedShare, setCopiedShare] = useState(false);
  const mounted = useMounted();

  const handleShare = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const isDark = mounted ? resolveIsDark(theme) : false;
  const nextTheme = isDark ? "light" : "dark";
  const safeMax = Math.max(maxTokens, 1);
  const percentage = Math.min(Math.round((currentTokens / safeMax) * 100), 100);

  return (
    <header className="h-14 border-b border-stone-200/70 dark:border-white/[0.08] bg-white/85 dark:bg-[#0c0d12]/85 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 md:px-5 transition-all select-none">
      {/* Left: Mobile Drawer & Model Pill & Chat Title */}
      <div className="flex items-center gap-2 sm:gap-3 truncate min-w-0">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          className="md:hidden p-1.5 rounded-xl text-stone-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none"
          title="Open menu"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model Badge Pill */}
        <div className="flex items-center gap-2 rounded-full border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-stone-800 dark:text-neutral-200 shadow-2xs">
          <span className="relative flex h-2 w-2 shrink-0">
            {ollamaActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                ollamaActive ? "bg-emerald-500" : "bg-stone-400"
              }`}
            />
          </span>
          <span className="font-bold tracking-tight text-stone-900 dark:text-white">
            {modelName}
          </span>
          <ChevronDown className="h-3 w-3 text-stone-400 dark:text-neutral-500" />
        </div>

        {/* Separator & Title */}
        <div className="hidden sm:flex items-center gap-2 truncate">
          <span className="text-stone-300 dark:text-neutral-700 font-mono text-xs">/</span>
          <h1
            className="font-medium text-xs text-stone-500 dark:text-neutral-400 truncate max-w-[130px] md:max-w-xs"
            title={title}
          >
            {title || "New Chat"}
          </h1>
        </div>
      </div>

      {/* Center: Context Meter & Ollama Beacon */}
      <div className="hidden md:flex items-center gap-3.5 px-3 py-1 rounded-full bg-stone-100/70 dark:bg-white/[0.03] border border-stone-200/60 dark:border-white/[0.05]">
        <div
          className="flex items-center gap-2 text-xs font-mono"
          title={`Context Usage: ~${currentTokens.toLocaleString()} / ${safeMax.toLocaleString()} tokens (${percentage}%)`}
        >
          <div className="w-16 h-1.5 bg-stone-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentage > 85
                  ? "bg-rose-500"
                  : percentage > 60
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-blue-500 to-cyan-400"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-stone-700 dark:text-neutral-300">
            {percentage}%
          </span>
          <span className="text-[10px] text-stone-400 dark:text-neutral-500 hidden lg:inline">
            (~{currentTokens} tok)
          </span>
        </div>

        <div className="w-px h-3 bg-stone-300 dark:bg-white/15" />

        <div
          className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-neutral-400"
          title={ollamaActive ? "Ollama Connected" : "Ollama Offline"}
        >
          <span className="relative flex h-2 w-2">
            {ollamaActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                ollamaActive ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="text-[11px] font-mono font-medium">
            {ollamaActive ? "Ollama Active" : "Ollama Standby"}
          </span>
        </div>
      </div>

      {/* Right: Actions, Studio, Share, Theme, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] text-stone-600 dark:text-neutral-400 text-xs hover:text-stone-900 dark:hover:text-white transition-all shadow-2xs"
            title="Open command palette"
          >
            <Search className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500" />
            <kbd className="text-[10px] font-mono bg-stone-100 dark:bg-neutral-800 px-1 py-0.2 rounded border border-stone-200 dark:border-neutral-700">
              ⌘K
            </kbd>
          </button>
        )}

        <Link
          href="/studio"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-500/20 dark:border-cyan-500/20 bg-blue-50/60 dark:bg-cyan-500/10 text-blue-700 dark:text-cyan-300 hover:bg-blue-100/80 dark:hover:bg-cyan-500/20 text-xs font-semibold transition-all shadow-2xs group"
          title="Open Model Studio Arena"
        >
          <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 transition-transform duration-200 group-hover:rotate-12" />
          <span className="hidden sm:inline">Studio</span>
        </Link>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none"
          title="Share conversation link"
          aria-label="Share conversation link"
        >
          {copiedShare ? (
            <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in-50 duration-150" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => onThemeToggle(nextTheme)}
          className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none group"
          title={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
          aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
        >
          {mounted && isDark ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-12" />
          )}
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none group"
          title="Open Settings"
          aria-label="Open Settings"
        >
          <SettingsIcon className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
        </button>
      </div>
    </header>
  );
}
