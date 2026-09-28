"use client";

import React, { useState, useRef, useEffect } from "react";
import { Lock, Cloud, Sparkles, ChevronDown, Check } from "lucide-react";
import { PrivacyMode } from "./types";

interface PrivacySelectorProps {
  privacyMode: PrivacyMode;
  onSelectPrivacy: (mode: PrivacyMode) => void;
  disabled?: boolean;
}

const PRIVACY_OPTIONS: {
  id: PrivacyMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "auto",
    label: "Auto Privacy",
    desc: "Balance speed, privacy and cloud reasoning capabilities",
    icon: Sparkles,
  },
  {
    id: "local",
    label: "Local Only",
    desc: "100% on-device inference via Ollama. No data leaves machine",
    icon: Lock,
  },
  {
    id: "cloud",
    label: "Cloud Allowed",
    desc: "Permit cloud routing for ultra-deep reasoning tasks",
    icon: Cloud,
  },
];

export function PrivacySelector({
  privacyMode,
  onSelectPrivacy,
  disabled = false,
}: PrivacySelectorProps) {
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

  const current = PRIVACY_OPTIONS.find((p) => p.id === privacyMode) || PRIVACY_OPTIONS[0];
  const Icon = current.icon;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
        title={`Privacy: ${current.label}`}
        aria-expanded={isOpen}
      >
        <Icon className={`w-3.5 h-3.5 ${privacyMode === "local" ? "text-emerald-500" : ""}`} />
        <span className="hidden md:inline">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-stone-400 dark:text-neutral-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-64 rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500 border-b border-stone-100 dark:border-neutral-800 mb-1">
            Privacy & Governance
          </div>

          <div className="space-y-0.5">
            {PRIVACY_OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              const isSelected = opt.id === privacyMode;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelectPrivacy(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                      : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300"
                  }`}
                >
                  <OptIcon className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-stone-400 dark:text-neutral-500 mt-0.5">
                      {opt.desc}
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
