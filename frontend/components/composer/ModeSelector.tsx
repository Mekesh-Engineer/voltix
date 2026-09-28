"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Bot,
  Search,
  Code2,
  BarChart3,
  ChevronDown,
  Check,
} from "lucide-react";
import { ComposerMode } from "./types";

interface ModeOption {
  id: ComposerMode;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const MODES: ModeOption[] = [
  {
    id: "auto",
    label: "Auto Mode",
    shortLabel: "Auto",
    desc: "Automatically chooses the best model, tools & workflow",
    icon: Sparkles,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "research",
    label: "Deep Research",
    shortLabel: "Research",
    desc: "Live web research, cross-source verification & citations",
    icon: Search,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "code",
    label: "Code Engine",
    shortLabel: "Code",
    desc: "Python sandbox execution, AST calculation & tests",
    icon: Code2,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "data",
    label: "Data Analysis",
    shortLabel: "Analyze",
    desc: "Tabular data inspection, statistics & chart generation",
    icon: BarChart3,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "agent",
    label: "Autonomous Agent",
    shortLabel: "Agent",
    desc: "Multi-step planning, tool coordination & verification",
    icon: Bot,
    color: "text-blue-600 dark:text-blue-400",
  },
];

interface ModeSelectorProps {
  selectedMode: ComposerMode;
  onSelectMode: (mode: ComposerMode) => void;
  disabled?: boolean;
}

export function ModeSelector({
  selectedMode,
  onSelectMode,
  disabled = false,
}: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeMode = MODES.find((m) => m.id === selectedMode) || MODES[0];
  const ActiveIcon = activeMode.icon;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`relative inline-block text-left ${isOpen ? "z-50" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-200/80 dark:border-neutral-800 bg-stone-50/80 dark:bg-neutral-800/80 hover:bg-stone-100 dark:hover:bg-neutral-750 text-stone-700 dark:text-neutral-200 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        title="Select Agent Mode"
        aria-expanded={isOpen}
      >
        <ActiveIcon className={`w-3.5 h-3.5 ${activeMode.color}`} />
        <span>{activeMode.shortLabel}</span>
        <ChevronDown className="w-3 h-3 text-stone-400 dark:text-neutral-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-72 rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 border-b border-stone-100 dark:border-neutral-800 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500">
              Agent Operating Mode
            </span>
          </div>

          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {MODES.map((option) => {
              const Icon = option.icon;
              const isSelected = option.id === selectedMode;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelectMode(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                      : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon className={`w-4 h-4 ${option.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 dark:text-neutral-500 leading-snug mt-0.5">
                      {option.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
