"use client";

import React, { useState, useRef, useEffect } from "react";
import { Zap, Scale, Brain, Rocket, ChevronDown, Check } from "lucide-react";
import { ExecutionProfile } from "./types";

interface ProfileOption {
  id: ExecutionProfile;
  label: string;
  badge: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const PROFILES: ProfileOption[] = [
  {
    id: "fast",
    label: "Fast Profile",
    badge: "⚡ Fast",
    desc: "Minimal latency, direct inference for immediate answers",
    icon: Zap,
    color: "text-amber-500 dark:text-amber-400",
  },
  {
    id: "balanced",
    label: "Balanced Profile",
    badge: "⚖️ Balanced",
    desc: "Default balanced intelligence, speed, and tool usage",
    icon: Scale,
    color: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "deep",
    label: "Deep Reasoning",
    badge: "🧠 Deep",
    desc: "Multi-step reasoning, research sources, and verification",
    icon: Brain,
    color: "text-purple-500 dark:text-purple-400",
  },
  {
    id: "max",
    label: "Aetherion Max",
    badge: "🚀 Max",
    desc: "Full multi-agent swarm, parallel debate, and verified deliverables",
    icon: Rocket,
    color: "text-rose-500 dark:text-rose-400",
  },
];

interface ExecutionProfileSelectorProps {
  selectedProfile: ExecutionProfile;
  onSelectProfile: (profile: ExecutionProfile) => void;
  disabled?: boolean;
}

export function ExecutionProfileSelector({
  selectedProfile,
  onSelectProfile,
  disabled = false,
}: ExecutionProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = PROFILES.find((p) => p.id === selectedProfile) || PROFILES[1];
  const Icon = active.icon;

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
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border border-stone-200/80 dark:border-neutral-800 bg-stone-50/80 dark:bg-neutral-800/80 hover:bg-stone-100 dark:hover:bg-neutral-750 text-stone-700 dark:text-neutral-200 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        title={`Aetherion Execution Profile: ${active.label}`}
        aria-expanded={isOpen}
      >
        <Icon className={`w-3.5 h-3.5 ${active.color}`} />
        <span className="hidden sm:inline">{active.badge}</span>
        <ChevronDown className="w-3 h-3 text-stone-400 dark:text-neutral-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-72 rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 border-b border-stone-100 dark:border-neutral-800 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500">
              Aetherion Execution Profile
            </span>
            <span className="text-[9px] font-mono font-medium text-blue-500">
              ADAPTIVE
            </span>
          </div>

          <div className="space-y-0.5">
            {PROFILES.map((option) => {
              const OptIcon = option.icon;
              const isSelected = option.id === selectedProfile;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelectProfile(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                      : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <OptIcon className={`w-4 h-4 ${option.color}`} />
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
