"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  Zap,
  Brain,
  Rocket,
  Lock,
  Cloud,
  Sparkles,
  Check,
  Slash,
  AtSign,
} from "lucide-react";
import { ExecutionProfile, PrivacyMode } from "./types";

interface AdvancedMenuProps {
  profile: ExecutionProfile;
  onSelectProfile: (profile: ExecutionProfile) => void;
  privacyMode: PrivacyMode;
  onSelectPrivacy: (mode: PrivacyMode) => void;
  onTriggerSlash?: () => void;
  onTriggerMention?: () => void;
  disabled?: boolean;
}

const PROFILES: {
  id: ExecutionProfile;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "balanced",
    label: "Balanced",
    desc: "Default intelligent routing & single-turn execution",
    icon: Sparkles,
  },
  {
    id: "fast",
    label: "Fast Response",
    desc: "Minimal latency, direct synthesis without extra loops",
    icon: Zap,
  },
  {
    id: "deep",
    label: "Deep Reasoning",
    desc: "Extended reasoning steps & self-checking verification",
    icon: Brain,
  },
  {
    id: "max",
    label: "Aetherion Max",
    desc: "Multi-agent swarm coordination & verified deliverables",
    icon: Rocket,
  },
];

const PRIVACY_MODES: {
  id: PrivacyMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "auto",
    label: "Auto Privacy",
    desc: "Intelligently balances speed, local privacy & cloud capability",
    icon: Sparkles,
  },
  {
    id: "local",
    label: "Local Only",
    desc: "Strictly runs on local Ollama daemon. No data leaves device",
    icon: Lock,
  },
  {
    id: "cloud",
    label: "Cloud Allowed",
    desc: "Permits cloud routing for ultra-deep reasoning tasks",
    icon: Cloud,
  },
];

export function AdvancedMenu({
  profile,
  onSelectProfile,
  privacyMode,
  onSelectPrivacy,
  onTriggerSlash,
  onTriggerMention,
  disabled = false,
}: AdvancedMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const isCustomized = profile !== "balanced" || privacyMode !== "auto";

  return (
    <div
      className={`relative inline-block text-left ${isOpen ? "z-50" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
          isCustomized
            ? "border border-blue-500/30 bg-blue-50/80 text-blue-700 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-300"
            : "text-stone-500 hover:text-stone-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800"
        }`}
        title="Advanced Execution & Privacy Settings"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Advanced</span>
        {isCustomized && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-80 max-w-[92vw] rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[min(520px,65vh)] overflow-y-auto space-y-3">
          {/* Header */}
          <div className="px-1.5 pt-1 pb-1.5 border-b border-stone-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-neutral-500">
              Execution & Governance
            </span>
            <span className="text-[10px] text-stone-400 dark:text-neutral-500">
              Advanced Controls
            </span>
          </div>

          {/* Section: Reasoning / Execution Profile */}
          <div className="space-y-1">
            <span className="px-1.5 text-[10px] font-semibold text-stone-500 dark:text-neutral-400 uppercase tracking-wider">
              Reasoning Profile
            </span>
            <div className="grid grid-cols-1 gap-1">
              {PROFILES.map((p) => {
                const Icon = p.icon;
                const isSelected = p.id === profile;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProfile(p.id)}
                    className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium border border-blue-200/80 dark:border-blue-800/40"
                        : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300 border border-transparent"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{p.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-neutral-400 leading-tight">
                        {p.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Privacy Mode */}
          <div className="space-y-1 pt-1 border-t border-stone-100 dark:border-neutral-800">
            <span className="px-1.5 text-[10px] font-semibold text-stone-500 dark:text-neutral-400 uppercase tracking-wider">
              Privacy & Data Routing
            </span>
            <div className="grid grid-cols-1 gap-1">
              {PRIVACY_MODES.map((pm) => {
                const Icon = pm.icon;
                const isSelected = pm.id === privacyMode;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => onSelectPrivacy(pm.id)}
                    className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium border border-blue-200/80 dark:border-blue-800/40"
                        : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300 border border-transparent"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{pm.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-neutral-400 leading-tight">
                        {pm.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Quick Shortcuts */}
          {(onTriggerSlash || onTriggerMention) && (
            <div className="pt-1.5 border-t border-stone-100 dark:border-neutral-800 flex items-center justify-between px-1">
              <span className="text-[10px] text-stone-400 dark:text-neutral-500">Shortcuts</span>
              <div className="flex items-center gap-1.5">
                {onTriggerSlash && (
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerSlash();
                      setIsOpen(false);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-neutral-300 hover:text-blue-600 text-[11px]"
                  >
                    <Slash className="w-3 h-3" />
                    <span>Commands</span>
                  </button>
                )}
                {onTriggerMention && (
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerMention();
                      setIsOpen(false);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-neutral-300 hover:text-blue-600 text-[11px]"
                  >
                    <AtSign className="w-3 h-3" />
                    <span>Mention</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
