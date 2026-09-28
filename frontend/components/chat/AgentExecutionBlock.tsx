"use client";

import React, { useState } from "react";
import {
  Bot,
  Layers,
  Search,
  Code2,
  BarChart3,
  Cpu,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Download,
} from "lucide-react";
import { AgentStepUI, AgentArtifactUI, AgentPlanUI } from "@/types/chat";

interface AgentExecutionBlockProps {
  plan?: AgentPlanUI;
  steps?: AgentStepUI[];
  artifacts?: AgentArtifactUI[];
  model?: string;
  phase?: string;
  isStreaming?: boolean;
}

export function AgentExecutionBlock({
  steps = [],
  artifacts = [],
  model,
  phase,
  isStreaming,
}: AgentExecutionBlockProps) {
  const [isBlockExpanded, setIsBlockExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  if (!steps || steps.length === 0) return null;

  const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
  const progressPercent = steps.length ? Math.round((completedSteps / steps.length) * 100) : 0;
  const isFinished = !isStreaming && (completedSteps === steps.length || steps.some((s) => s.status === "FAILED"));

  const toggleStep = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSubagentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "research":
        return <Search className="w-3.5 h-3.5 text-emerald-400" />;
      case "coding":
        return <Code2 className="w-3.5 h-3.5 text-cyan-400" />;
      case "data":
        return <BarChart3 className="w-3.5 h-3.5 text-amber-400" />;
      case "math":
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      case "document":
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-stone-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c0f17] shadow-sm overflow-hidden transition-all duration-200 animate-in fade-in">
      {/* Block Top Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 bg-stone-50/80 dark:bg-[#0e1422] border-b border-stone-200/60 dark:border-white/[0.06] cursor-pointer select-none"
        onClick={() => setIsBlockExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-cyan-500/15 border border-blue-500/20 text-blue-600 dark:text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-bold text-stone-900 dark:text-white tracking-wide">
              Autonomous Execution
            </span>
            <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300">
              RUNTIME 2.0
            </span>
            {phase && !isFinished && (
              <span className="hidden md:inline-block px-1.5 py-0.2 text-[9.5px] rounded-md bg-stone-100 dark:bg-neutral-800/80 text-stone-600 dark:text-neutral-300 truncate max-w-[150px]">
                {phase}
              </span>
            )}
            {model && (
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] rounded-full bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-neutral-300 font-mono">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                {model}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress pill */}
          <span className="text-[11px] font-medium text-stone-500 dark:text-neutral-400">
            {completedSteps}/{steps.length} Steps ({progressPercent}%)
          </span>

          <span
            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
              isFinished
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 animate-pulse"
            }`}
          >
            {isFinished ? "COMPLETED" : "RUNNING"}
          </span>

          <button
            type="button"
            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors"
            title={isBlockExpanded ? "Collapse timeline" : "Expand timeline"}
          >
            {isBlockExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-stone-100 dark:bg-neutral-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Collapsible Content */}
      {isBlockExpanded && (
        <div className="p-3 space-y-2.5 bg-stone-50/40 dark:bg-transparent">
          {/* Steps Timeline */}
          <div className="space-y-1.5">
            {steps.map((s) => {
              const isExp = expandedSteps[s.id];
              return (
                <div
                  key={s.id || s.step_number}
                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                    s.status === "RUNNING"
                      ? "bg-cyan-50/60 dark:bg-cyan-950/20 border-cyan-500/40 shadow-2xs"
                      : s.status === "COMPLETED"
                      ? "bg-white dark:bg-[#0b101b] border-stone-200/80 dark:border-white/[0.05]"
                      : s.status === "FAILED"
                      ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-500/30"
                      : "bg-stone-50/60 dark:bg-neutral-900/30 border-stone-200/40 dark:border-neutral-800/50 opacity-65"
                  }`}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleStep(s.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full text-[10px] font-bold bg-stone-200 dark:bg-neutral-800 text-stone-700 dark:text-neutral-300 shrink-0">
                        {s.step_number}
                      </span>
                      <span className="p-1 rounded bg-stone-100 dark:bg-neutral-800 shrink-0">
                        {getSubagentIcon(s.agent_type)}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold text-stone-900 dark:text-white block truncate text-[12.5px]">
                          {s.title}
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-neutral-500 uppercase tracking-wider">
                          {s.agent_type} · {s.tool_name || "Direct Reasoning"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {s.duration_ms > 0 && (
                        <span className="text-[10px] font-mono text-stone-400 dark:text-neutral-500">
                          {Math.round(s.duration_ms)}ms
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.2 text-[9.5px] font-bold rounded-full uppercase tracking-wider ${
                          s.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : s.status === "RUNNING"
                            ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 animate-pulse"
                            : s.status === "FAILED"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            : "bg-stone-200/80 dark:bg-neutral-800 text-stone-500 dark:text-neutral-400"
                        }`}
                      >
                        {s.status}
                      </span>
                      {isExp ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Step Details */}
                  {isExp && (
                    <div className="mt-2.5 pt-2.5 border-t border-stone-200/60 dark:border-white/[0.06] space-y-2 text-xs">
                      {s.description && (
                        <p className="text-stone-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                          {s.description}
                        </p>
                      )}
                      {s.output !== undefined && s.output !== null && (
                        <div className="p-2 rounded-lg bg-stone-100 dark:bg-[#080d17] border border-stone-200/80 dark:border-white/[0.05] font-mono text-[11px] text-stone-800 dark:text-neutral-200 overflow-x-auto max-h-36">
                          {typeof s.output === "object"
                            ? JSON.stringify(s.output, null, 2)
                            : String(s.output)}
                        </div>
                      )}
                      {s.verification ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium pt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            Verified with{" "}
                            {Math.round(
                              ((s.verification as { confidence_score?: number })?.confidence_score ?? 0.95) * 100
                            )}
                            % confidence
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Generated Deliverables & Artifacts */}
          {artifacts && artifacts.length > 0 && (
            <div className="mt-3 p-2.5 rounded-xl bg-blue-50/50 dark:bg-cyan-950/20 border border-blue-200/60 dark:border-cyan-500/20 space-y-2">
              <span className="text-[10.5px] font-bold text-blue-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Generated Deliverables & Artifacts ({artifacts.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {artifacts.map((art, idx) => (
                  <div
                    key={art.artifact_id || idx}
                    className="p-2 rounded-lg bg-white dark:bg-[#0c1220] border border-stone-200 dark:border-white/[0.08] flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="truncate mr-2">
                      <span className="font-semibold text-stone-900 dark:text-white block truncate text-[11.5px]">
                        {art.name}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-neutral-500 uppercase">
                        {art.file_type} · {art.size_bytes}B
                      </span>
                    </div>
                    {art.artifact_id ? (
                      <a
                        href={`/api/artifacts/${art.artifact_id}/download`}
                        download={art.name}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-[10.5px] transition-colors shrink-0 shadow-2xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
