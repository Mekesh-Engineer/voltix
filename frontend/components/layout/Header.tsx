"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Sun,
  Moon,
  Settings as SettingsIcon,
  Search,
  Download,
  Share2,
  Check,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  HardDrive,
  MoreHorizontal,
} from "lucide-react";

import { ModelInfo } from "@/types/model";
import { copyToClipboard } from "@/lib/utils";
import { useMounted } from "@/hooks/useMounted";
import { resolveIsDark } from "@/lib/storage";

interface HeaderProps {
  title: string;
  theme: "system" | "light" | "dark";
  onThemeToggle: (theme: "system" | "light" | "dark") => void;
  onOpenSettings: () => void;
  onOpenCommandPalette?: () => void;
  onToggleSidebarMobile: () => void;
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  ollamaActive: boolean;
  currentTokens?: number;
  maxTokens?: number;
  onExportMarkdown?: () => void;
  onExportJson?: () => void;
  onOpenAgentControl?: () => void;
  onOpenArtifacts?: () => void;
  isAgentRunning?: boolean;
}

export function Header({
  title,
  theme,
  onThemeToggle,
  onOpenSettings,
  onOpenCommandPalette,
  onToggleSidebarMobile,
  models,
  selectedModel,
  onSelectModel,
  ollamaActive,
  currentTokens = 0,
  maxTokens = 8192,
  onExportMarkdown,
  onExportJson,
  onOpenArtifacts,
}: HeaderProps) {

  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const mounted = useMounted();

  const modelPickerRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modelPickerRef.current &&
        !modelPickerRef.current.contains(event.target as Node)
      ) {
        setModelPickerOpen(false);
      }
      if (
        moreRef.current &&
        !moreRef.current.contains(event.target as Node)
      ) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeModel = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel || "Default Model",
    provider: "ollama",
    category: "Local" as const,
    available: ollamaActive,
    description: "LOCAL · FAST",
    contextWindow: maxTokens,
  };

  const isDark = mounted ? resolveIsDark(theme) : false;
  const nextTheme = isDark ? "light" : "dark";

  const handleShare = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  // Token context calculation
  const safeMax = Math.max(activeModel.contextWindow || maxTokens, 1);
  const percentage = Math.min(Math.round((currentTokens / safeMax) * 100), 100);

  const parseTags = (desc?: string): string[] => {
    if (!desc) return [];
    return desc
      .split("·")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "LOCAL":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "CLOUD":
        return "bg-blue-500/10 text-blue-600 dark:text-cyan-400 border-blue-500/20";
      case "CODING":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "VISION":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "REASONING":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "AGENTS":
      case "ADVANCED AGENTS":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/20";
      case "FAST":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      case "LONG CONTEXT":
        return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
      default:
        return "bg-stone-500/10 text-stone-600 dark:text-neutral-400 border-stone-500/20";
    }
  };

  return (
    <header className="h-14 border-b border-stone-200/70 dark:border-white/[0.08] bg-white/85 dark:bg-[#0c0d12]/85 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 md:px-5 transition-all select-none">
      {/* Left: Mobile Drawer, Intelligent Model Selector Pill & Chat Title */}
      <div className="flex items-center gap-2 sm:gap-3 truncate min-w-0">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          className="md:hidden p-1.5 rounded-xl text-stone-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none"
          aria-label="Open navigation sidebar"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Intelligent Model Selector Pill */}
        <div className="relative shrink-0" ref={modelPickerRef}>
          <button
            type="button"
            onClick={() => setModelPickerOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-white/[0.04] hover:bg-stone-100 dark:hover:bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-stone-800 dark:text-neutral-200 transition-all duration-150 shadow-2xs hover:shadow-xs group focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            aria-expanded={modelPickerOpen}
            aria-label="Select active AI model"
          >
            {/* Real-time Connection Beacon */}
            <span className="relative flex h-2 w-2 shrink-0">
              {activeModel.available && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  activeModel.available ? "bg-emerald-500" : "bg-stone-400"
                }`}
              />
            </span>

            {/* Model Name */}
            <span className="font-bold tracking-tight text-stone-900 dark:text-white">
              {activeModel.name}
            </span>

            {/* Explicit Execution Location Chip (Section 8) */}
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                activeModel.category === "Cloud"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              }`}
            >
              <span>{activeModel.category === "Cloud" ? "☁ Cloud" : "● Local · Ollama"}</span>
            </span>

            <ChevronDown
              className={`h-3 w-3 text-stone-400 dark:text-neutral-500 transition-transform duration-200 ${
                modelPickerOpen ? "rotate-180 text-blue-600 dark:text-cyan-400" : ""
              }`}
            />
          </button>

          {/* Futuristic Model Selection Dropdown */}
          {modelPickerOpen && (
            <div className="absolute left-0 mt-2 z-50 w-72 rounded-2xl border border-stone-200/80 dark:border-white/10 bg-white/95 dark:bg-[#12141a]/95 backdrop-blur-xl shadow-2xl p-2 animate-in fade-in duration-150 divide-y divide-stone-100 dark:divide-white/[0.06]">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-neutral-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-blue-500 dark:text-cyan-400" />
                  <span>Configured Models</span>
                </span>
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{ollamaActive ? "Ollama Ready" : "Standby"}</span>
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto py-1.5 space-y-1 scrollbar-thin">
                {models.map((m) => {
                  const isSelected = m.id === selectedModel;
                  const tags = parseTags(m.description);

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(m.id);
                        setModelPickerOpen(false);
                      }}
                      className={`flex w-full items-start justify-between rounded-xl p-2.5 text-xs text-left transition-all group border ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-cyan-500/10 border-blue-200/60 dark:border-cyan-500/30 text-stone-900 dark:text-white"
                          : "hover:bg-stone-100/70 dark:hover:bg-white/[0.04] border-transparent text-stone-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold tracking-tight truncate">
                            {m.name}
                          </span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              m.available ? "bg-emerald-500" : "bg-stone-300 dark:bg-neutral-600"
                            }`}
                          />
                        </div>

                        {tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className={`text-[9px] font-semibold px-1 py-0.2 rounded border uppercase tracking-wider ${getTagColor(
                                  tag
                                )}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-md bg-blue-600 dark:bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center: Top Navigation Tabs (Chat | Studio) */}
        <nav className="flex items-center gap-1 ml-2 px-1 py-0.5 rounded-xl bg-stone-100/80 dark:bg-white/[0.04] border border-stone-200/60 dark:border-white/[0.06]">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-[#162238] text-blue-600 dark:text-blue-400 shadow-2xs border border-blue-500/20"
          >
            <span>Chat</span>
          </Link>
          <Link
            href="/studio"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-stone-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span>Studio</span>
          </Link>
        </nav>

        {/* Separator Slash & Chat Title */}
        <div className="hidden sm:flex items-center gap-2 truncate ml-1">
          <span className="text-stone-300 dark:text-neutral-700 font-mono text-xs">/</span>
          <h1
            className="font-medium text-xs text-stone-500 dark:text-neutral-400 truncate max-w-[130px] md:max-w-xs"
            title={title}
          >
            {title || "New Chat"}
          </h1>
        </div>
      </div>

      {/* Center: Dynamic Context Meter Capsule */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100/70 dark:bg-white/[0.03] border border-stone-200/60 dark:border-white/[0.05]">
        <div
          className="flex items-center gap-2 text-xs font-mono"
          title={`Context Usage: ${currentTokens.toLocaleString()} / ${safeMax.toLocaleString()} tokens (${percentage}%)`}
        >
          <span className="text-[11px] text-stone-500 dark:text-neutral-400 font-medium">Context</span>
          <div className="w-14 h-1.5 bg-stone-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentage > 85
                  ? "bg-rose-500"
                  : percentage > 60
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-stone-700 dark:text-neutral-300">
            {percentage}%
          </span>
          <span className="text-[10px] text-stone-400 dark:text-neutral-500 hidden xl:inline">
            ({currentTokens.toLocaleString()} / {safeMax.toLocaleString()})
          </span>
        </div>
      </div>

      {/* Right: Actions (Search, More Menu, Theme, Settings) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Cmd+K trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] text-stone-600 dark:text-neutral-400 text-xs hover:text-stone-900 dark:hover:text-white hover:border-blue-400/50 dark:hover:border-blue-500/30 transition-all duration-150 shadow-2xs"
            title="Open command palette (Ctrl+K or ⌘K)"
            aria-label="Open command palette"
          >
            <Search className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500" />
            <kbd className="text-[10px] font-mono bg-stone-100 dark:bg-neutral-800 px-1 py-0.2 rounded border border-stone-200 dark:border-neutral-700">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Consolidated More Menu (Export, Artifacts, Share) */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none"
            title="More workspace actions"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {moreOpen && (
            <div className="absolute right-0 mt-2 z-50 w-52 rounded-2xl border border-stone-200/80 dark:border-white/10 bg-white/95 dark:bg-[#12141a]/95 backdrop-blur-xl p-1.5 shadow-2xl animate-in fade-in duration-100 space-y-0.5">
              {onOpenArtifacts && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenArtifacts();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors"
                >
                  <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                  <span>Artifacts Workspace</span>
                </button>
              )}
              {onExportMarkdown && (
                <button
                  type="button"
                  onClick={() => {
                    onExportMarkdown();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-stone-400" />
                  <span>Export Markdown (.md)</span>
                </button>
              )}
              {onExportJson && (
                <button
                  type="button"
                  onClick={() => {
                    onExportJson();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-stone-400" />
                  <span>Export JSON (.json)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleShare();
                  setMoreOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-400" />
                <span>{copiedShare ? "Link Copied!" : "Share Link"}</span>
              </button>
            </div>
          )}
        </div>

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

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none group"
          title="System Settings & LLM Configuration"
          aria-label="Settings"
        >
          <SettingsIcon className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
        </button>
      </div>
    </header>
  );
}
