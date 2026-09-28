"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Cpu,
  Sparkles,
  Check,
  Zap,
  Cloud,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ModelInfo } from "@/types/model";

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  ollamaActive: boolean;
  minified?: boolean;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  ollamaActive,
  minified = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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

  const activeModel = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel || "Default Model",
    provider: "ollama",
    category: "Local" as const,
    available: ollamaActive,
    description: "LOCAL · FAST",
  };

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

  if (minified) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-center p-2 rounded-xl text-stone-600 dark:text-neutral-300 hover:bg-stone-200/60 dark:hover:bg-white/[0.08] transition-colors relative ${
            isOpen ? "bg-stone-200/80 dark:bg-white/[0.12]" : ""
          }`}
          title={`Active Model: ${activeModel.name}`}
          aria-label="Select Model"
        >
          <Cpu className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
          <span
            className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
              activeModel.available ? "bg-emerald-500 ring-1 ring-white dark:ring-neutral-900" : "bg-stone-400"
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-full top-0 ml-2 w-72 rounded-2xl border border-stone-200/80 dark:border-white/10 bg-white/95 dark:bg-[#12141a]/95 backdrop-blur-xl shadow-2xl p-2 z-50 animate-in fade-in duration-150 divide-y divide-stone-100 dark:divide-white/[0.06]">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-neutral-500 flex items-center justify-between">
              <span>Select Model</span>
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
                <span>Ollama Online</span>
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto py-1 space-y-1 scrollbar-thin">
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(m.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl transition-colors flex items-center justify-between gap-2 ${
                    m.id === selectedModel
                      ? "bg-blue-50/80 dark:bg-cyan-500/10 text-blue-900 dark:text-white"
                      : "hover:bg-stone-100 dark:hover:bg-white/[0.05] text-stone-700 dark:text-neutral-300"
                  }`}
                >
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate">{m.name}</div>
                    <div className="text-[10px] text-stone-400 dark:text-neutral-500 truncate">
                      {m.description}
                    </div>
                  </div>
                  {m.id === selectedModel && (
                    <Check className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Model Selector Trigger Card */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-stone-100/80 dark:bg-white/[0.03] hover:bg-stone-200/60 dark:hover:bg-white/[0.06] border border-stone-200/60 dark:border-white/[0.06] transition-all duration-200 text-left group focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        aria-expanded={isOpen}
        aria-label="Select AI Model"
      >
        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-cyan-500/10 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0 ring-1 ring-blue-500/20">
            {activeModel.category === "Cloud" ? (
              <Cloud className="w-3.5 h-3.5" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="truncate min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                {activeModel.name}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  activeModel.available ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                }`}
                title={activeModel.available ? "Model Ready" : "Model Offline"}
              />
            </div>
            <div className="flex items-center gap-1 mt-0.5 truncate overflow-hidden">
              {parseTags(activeModel.description).slice(0, 2).map((tag) => (
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
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600 dark:text-cyan-400" : ""
          }`}
        />
      </button>

      {/* Model Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl border border-stone-200/80 dark:border-white/10 bg-white/95 dark:bg-[#12141a]/95 backdrop-blur-xl shadow-2xl z-50 p-2 animate-in fade-in duration-150 divide-y divide-stone-100 dark:divide-white/[0.06]">
          {/* Header Status */}
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-stone-500 dark:text-neutral-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-500 dark:text-cyan-400" />
              <span>Available Models</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{ollamaActive ? "Ollama Connected" : "Local Ready"}</span>
            </div>
          </div>

          {/* Model Items */}
          <div className="max-h-72 overflow-y-auto py-1.5 space-y-1 scrollbar-thin">
            {models.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400">
                <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                No models discovered
              </div>
            ) : (
              models.map((m) => {
                const isSelected = m.id === selectedModel;
                const tags = parseTags(m.description);

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(m.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2.5 group border ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-cyan-500/10 border-blue-200/60 dark:border-cyan-500/30 text-stone-900 dark:text-white"
                        : "hover:bg-stone-100/70 dark:hover:bg-white/[0.04] border-transparent text-stone-700 dark:text-neutral-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold tracking-tight truncate">
                          {m.name}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            m.available ? "bg-emerald-500" : "bg-stone-300 dark:bg-neutral-600"
                          }`}
                        />
                      </div>

                      {/* Capability Tags */}
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
                      <div className="w-5 h-5 rounded-md bg-blue-600 dark:bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
