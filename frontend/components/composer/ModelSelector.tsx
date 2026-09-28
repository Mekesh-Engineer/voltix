"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Cpu, Brain, Layers } from "lucide-react";
import { ModelInfo } from "@/types/model";
import { OllamaIcon } from "@/components/ui/Icons";

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  selectedProvider: string;
  ollamaActive: boolean;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
}

const FLEET_ROLES: Record<string, { role: string; desc: string; color: string }> = {
  "nemotron-3-ultra:cloud": {
    role: "Aetherion-Ultra",
    desc: "Long-horizon master reasoner & enterprise orchestration",
    color: "text-purple-500",
  },
  "nemotron-3-super:cloud": {
    role: "Aetherion-Super",
    desc: "Multi-agent orchestrator & task decomposition",
    color: "text-indigo-500",
  },
  "nemotron-3-nano:30b-cloud": {
    role: "Aetherion-Nano",
    desc: "Fast reasoning, routing & independent verification",
    color: "text-blue-500",
  },
  "gpt-oss:120b-cloud": {
    role: "Aetherion-Reason",
    desc: "Deep reasoning, tool-calling & sandbox code execution",
    color: "text-cyan-500",
  },
  "gemma4:31b-cloud": {
    role: "Aetherion-Vision",
    desc: "Multimodal visual reasoning & document intelligence",
    color: "text-teal-500",
  },
  "qwen2.5:7b": {
    role: "Aetherion-Fast",
    desc: "High-performance local worker for coding & conversation",
    color: "text-emerald-500",
  },
  "qwen2.5:3b": {
    role: "Aetherion-Mini",
    desc: "Ultra-low-latency utility, intent detection & parsing",
    color: "text-amber-500",
  },
};

export function ModelSelector({
  models,
  selectedModel,
  ollamaActive,
  onSelectModel,
  disabled = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvancedEngines, setShowAdvancedEngines] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAetherionUnified =
    selectedModel === "aetherion" || selectedModel === "auto" || selectedModel === "";

  const activeModel = models.find((m) => m.id === selectedModel);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const localModels = models.filter((m) => m.category === "Local" && m.id !== "aetherion");
  const cloudModels = models.filter((m) => m.category === "Cloud" && m.id !== "aetherion");

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-200/80 dark:border-neutral-800 bg-stone-50/80 dark:bg-neutral-800/80 hover:bg-stone-100 dark:hover:bg-neutral-750 text-stone-700 dark:text-neutral-200 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        title="Select AI Model or Unified Aetherion Fleet"
        aria-expanded={isOpen}
      >
        {isAetherionUnified ? (
          <Brain className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        ) : (
          <OllamaIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        )}
        <span className="truncate max-w-[110px] sm:max-w-[130px]">
          {isAetherionUnified ? "Aetherion Fleet" : activeModel?.name || selectedModel}
        </span>
        <ChevronDown className="w-3 h-3 text-stone-400 dark:text-neutral-500 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto bottom-full mb-2 w-84 max-w-[92vw] rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-50 overflow-hidden divide-y divide-stone-100 dark:divide-neutral-800 text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* Header & Status */}
          <div className="p-3 flex items-center justify-between bg-stone-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-stone-900 dark:text-neutral-100 text-[13px]">
                Voltix Aetherion Fleet
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                ollamaActive ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  ollamaActive ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              {ollamaActive ? "Ollama Fleet Online" : "Connecting..."}
            </span>
          </div>

          {/* Unified Aetherion Option (Recommended) */}
          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                onSelectModel("aetherion");
                setIsOpen(false);
              }}
              className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors border ${
                isAetherionUnified
                  ? "border-blue-300 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200"
                  : "border-transparent hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300"
              }`}
            >
              <div className="p-1 rounded-lg bg-blue-600 text-white mt-0.5 shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[13px]">Aetherion</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      RECOMMENDED
                    </span>
                  </div>
                  {isAetherionUnified && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-neutral-400 mt-0.5 leading-snug">
                  Adaptive fleet orchestrating Nemotron Ultra/Super, GPT-OSS, Gemma & Qwen engines dynamically based on task complexity.
                </p>
              </div>
            </button>
          </div>

          {/* Advanced Model Overrides Toggle */}
          <div className="p-2">
            <button
              type="button"
              onClick={() => setShowAdvancedEngines((v) => !v)}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-stone-500 dark:text-neutral-400 hover:text-stone-800 dark:hover:text-neutral-200 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Specialist Engines (Manual Override)
              </span>
              <span className="text-[10px] font-mono">{showAdvancedEngines ? "Hide" : "Show"}</span>
            </button>

            {showAdvancedEngines && (
              <div className="space-y-1 mt-1 max-h-56 overflow-y-auto pr-1">
                {/* Cloud Specialist Engines */}
                {cloudModels.map((m) => {
                  const isSelected = !isAetherionUnified && m.id === selectedModel;
                  const roleInfo = FLEET_ROLES[m.id];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(m.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                          : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <Cpu className={`w-3.5 h-3.5 shrink-0 ${roleInfo?.color || "text-purple-500"}`} />
                          <span className="font-semibold text-xs">{roleInfo?.role || m.name}</span>
                          <span className="text-[9px] font-mono text-stone-400 dark:text-neutral-500">
                            ({m.id})
                          </span>
                        </div>
                        {roleInfo && (
                          <p className="text-[10px] text-stone-400 dark:text-neutral-500 truncate mt-0.2 pl-5">
                            {roleInfo.desc}
                          </p>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}

                {/* Local Specialist Engines */}
                {localModels.map((m) => {
                  const isSelected = !isAetherionUnified && m.id === selectedModel;
                  const roleInfo = FLEET_ROLES[m.id];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(m.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                          : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <OllamaIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-xs">{roleInfo?.role || m.name}</span>
                          <span className="text-[9px] font-mono text-stone-400 dark:text-neutral-500">
                            (Local)
                          </span>
                        </div>
                        {roleInfo && (
                          <p className="text-[10px] text-stone-400 dark:text-neutral-500 truncate mt-0.2 pl-5">
                            {roleInfo.desc}
                          </p>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
