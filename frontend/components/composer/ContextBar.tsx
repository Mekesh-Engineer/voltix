"use client";

import React from "react";
import { X, Sparkles, ShieldCheck, Database, Zap, Brain, Rocket } from "lucide-react";
import { ComposerMode, PrivacyMode, ExecutionProfile } from "./types";

interface ContextBarProps {
  mode: ComposerMode;
  onResetMode?: () => void;
  profile?: ExecutionProfile;
  activeTools?: string[];
  onRemoveTool?: (toolId: string) => void;
  privacyMode: PrivacyMode;
  tokenCount?: number;
  maxTokens?: number;
}

export function ContextBar({
  mode,
  onResetMode,
  profile,
  privacyMode,
  tokenCount = 0,
  maxTokens = 8192,
}: ContextBarProps) {
  const percentage = Math.min(Math.round((tokenCount / maxTokens) * 100), 100);
  const isHighContext = percentage > 80;

  // Only show chips if user customized mode, profile, or privacy, rather than permanently taking vertical space
  const isCustomProfile = profile && profile !== "balanced";
  const isCustomPrivacy = privacyMode !== "auto";
  const hasChips = mode !== "auto" || isCustomProfile || isCustomPrivacy;

  if (!hasChips && tokenCount === 0) return null;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1 bg-stone-50/50 dark:bg-neutral-850/50 border-b border-stone-100 dark:border-neutral-800 text-xs rounded-t-2xl">
      {/* Left: Active context chips */}
      <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto no-scrollbar py-0.5">
        {/* Mode Chip if not default */}
        {mode !== "auto" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            <Sparkles className="w-2.5 h-2.5" />
            <span className="capitalize">{mode} Mode</span>
            {onResetMode && (
              <button
                type="button"
                onClick={onResetMode}
                className="hover:text-blue-900 dark:hover:text-white p-0.5 ml-0.5"
                title="Reset to Auto Mode"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        )}

        {/* Execution Profile Chip if non-balanced */}
        {isCustomProfile && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            {profile === "fast" && <Zap className="w-2.5 h-2.5 text-amber-500" />}
            {profile === "deep" && <Brain className="w-2.5 h-2.5 text-blue-500" />}
            {profile === "max" && <Rocket className="w-2.5 h-2.5 text-rose-500" />}
            <span className="capitalize">{profile} Profile</span>
          </span>
        )}

        {/* Local Privacy Chip */}
        {privacyMode === "local" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>Local Inference Only</span>
          </span>
        )}
      </div>

      {/* Right: Context budget indicator */}
      {tokenCount > 0 && (
        <div
          className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
            isHighContext
              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold"
              : "text-stone-400 dark:text-neutral-500"
          }`}
          title={`Context Usage: ${tokenCount} / ${maxTokens} tokens (${percentage}%)`}
        >
          <Database className="w-2.5 h-2.5" />
          <span>Context {percentage}%</span>
        </div>
      )}
    </div>
  );
}
