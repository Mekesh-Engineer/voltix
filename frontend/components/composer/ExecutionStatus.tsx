"use client";

import React, { useState } from "react";
import { Square, Pause, Play, Brain, ChevronDown, ChevronUp, Bot, CheckCircle2 } from "lucide-react";

interface ExecutionStatusProps {
  isRunning: boolean;
  isPaused: boolean;
  statusText: string | null;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  phase?: string;
  ensembleLevel?: string;
  specialists?: string[];
}

export function ExecutionStatus({
  isRunning,
  isPaused,
  statusText,
  onStop,
  onPause,
  onResume,
  phase,
  specialists = ["Planner", "Specialist Workers", "Verifier"],
}: ExecutionStatusProps) {
  const [showTimeline, setShowTimeline] = useState(false);

  if (!isRunning && !statusText) return null;

  const displayStatus =
    statusText || (isPaused ? "Aetherion execution paused" : phase || "Aetherion fleet executing goal...");

  return (
    <div className="bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 rounded-t-2xl animate-in fade-in duration-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        {/* Left: Agent state indicator & safe progress */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
            {isPaused ? (
              <Pause className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Brain className="w-3.5 h-3.5 animate-pulse text-blue-600 dark:text-blue-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-900 dark:text-neutral-100 flex items-center gap-1.5">
                <span>Aetherion Command Active</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  FLEET
                </span>
              </span>
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isPaused ? "bg-amber-500" : "bg-blue-500 animate-ping"
                }`}
              />
            </div>
            <p className="text-[11px] text-stone-600 dark:text-neutral-400 truncate mt-0.2 font-mono">
              {displayStatus}
            </p>
          </div>
        </div>

        {/* Right: Controls (Timeline Toggle / Pause / Resume / Stop) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white/80 dark:bg-neutral-800/80 border border-stone-200/80 dark:border-neutral-700/80 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200 transition-colors shadow-2xs"
            title="Inspect Aetherion Fleet Timeline"
          >
            <Bot className="w-3 h-3" />
            <span className="hidden md:inline">Fleet</span>
            {showTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onPause && onResume && (
            <button
              type="button"
              onClick={isPaused ? onResume : onPause}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 text-stone-700 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-neutral-750 transition-colors shadow-2xs"
              title={isPaused ? "Resume execution" : "Pause execution"}
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3 fill-current text-emerald-500" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 text-amber-500" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs"
            title="Stop execution (Esc)"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Expanded Multi-Agent Fleet Timeline Drawer (Section 38 & 39) */}
      {showTimeline && (
        <div className="px-3.5 py-2 border-t border-blue-100/60 dark:border-blue-900/30 bg-blue-50/40 dark:bg-neutral-900/60 text-[11px] space-y-1.5 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-stone-500 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
            <span>Specialist Agents Coordination</span>
            <span className="font-mono">Verification: ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {specialists.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center gap-1 px-2 py-0.8 rounded-md bg-white dark:bg-neutral-800 border border-blue-200/50 dark:border-neutral-700 text-stone-700 dark:text-neutral-300 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>{spec}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1 px-2 py-0.8 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Independent Auditor</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
