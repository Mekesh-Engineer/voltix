"use client";

import React, { useState } from "react";
import {
  Bot,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  FileText,
  Search,
  Code2,
  BarChart3,
  Layers,
  Sparkles,
} from "lucide-react";
import { AgentStepUI, AgentArtifactUI } from "@/hooks/useAgent";


interface AgentControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  isPaused: boolean;
  goal: string;
  phase: string;
  model: string;
  steps: AgentStepUI[];
  artifacts: AgentArtifactUI[];
  runtimeSeconds: number;
  finalOutput?: string;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onStartNewTask: (goal: string) => void;
}

export function AgentControlCenter({
  isOpen,
  onClose,
  isRunning,
  isPaused,
  goal,
  phase,
  model,
  steps,
  artifacts,
  runtimeSeconds,
  finalOutput,
  onPause,
  onResume,
  onCancel,
  onStartNewTask,
}: AgentControlCenterProps) {
  const [taskInput, setTaskInput] = useState("");
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
  const progressPercent = steps.length ? Math.round((completedSteps / steps.length) * 100) : 0;

  const toggleStep = (id: string) => {

    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getSubagentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "research":
        return <Search className="w-4 h-4 text-emerald-400" />;
      case "coding":
        return <Code2 className="w-4 h-4 text-cyan-400" />;
      case "data":
        return <BarChart3 className="w-4 h-4 text-amber-400" />;
      case "math":
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case "document":
        return <FileText className="w-4 h-4 text-blue-400" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">Voltix Agent Control Center</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  Runtime 2.0
                </span>
              </div>
              <p className="text-xs text-neutral-400">Autonomous planning, multi-tool execution, and evidence verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Active Mission Telemetry Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1">Current Phase</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"}`} />
                <span className="text-xs font-semibold text-neutral-200 truncate">{phase || "IDLE"}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1">Routed Model</span>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-white truncate">{model || "Auto-Routing"}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1">Progress</span>
              <span className="text-xs font-semibold text-neutral-200">
                {steps.length > 0 ? `${completedSteps} / ${steps.length} Steps (${progressPercent}%)` : "No Active Steps"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1">Execution Timer</span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(runtimeSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Goal & Progress bar */}
          {goal && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-300">Objective: <span className="text-white font-semibold">{goal}</span></span>
                <div className="flex items-center gap-2">
                  {isRunning && !isPaused && (
                    <button
                      onClick={onPause}
                      className="px-2.5 py-1 text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1"
                    >
                      <Pause className="w-3 h-3" /> Pause
                    </button>
                  )}
                  {isRunning && isPaused && (
                    <button
                      onClick={onResume}
                      className="px-2.5 py-1 text-xs rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Resume
                    </button>
                  )}
                  {isRunning && (
                    <button
                      onClick={onCancel}
                      className="px-2.5 py-1 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" /> Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Visual Agent Timeline (Section 45) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Autonomous Plan & Execution Timeline
            </h3>

            {steps.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-neutral-800 text-neutral-500 text-xs">
                No active plan steps. Launch an autonomous objective below.
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((s) => {
                  const isExp = expandedSteps[s.id];
                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border transition-all ${
                        s.status === "RUNNING"
                          ? "bg-cyan-950/20 border-cyan-500/40 shadow-sm"
                          : s.status === "COMPLETED"
                          ? "bg-neutral-950/60 border-neutral-800/80"
                          : s.status === "FAILED"
                          ? "bg-rose-950/20 border-rose-500/30"
                          : "bg-neutral-950/30 border-neutral-900 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleStep(s.id)}>
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300">
                            {s.step_number}
                          </span>
                          <span className="p-1 rounded bg-neutral-800/80">{getSubagentIcon(s.agent_type)}</span>
                          <div>
                            <span className="text-xs font-medium text-white block">{s.title}</span>
                            <span className="text-[10px] text-neutral-400">{s.agent_type.toUpperCase()} • {s.tool_name || "Direct Reasoning"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {s.duration_ms > 0 && (
                            <span className="text-[10px] font-mono text-neutral-400">{s.duration_ms}ms</span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-full uppercase ${
                              s.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : s.status === "RUNNING"
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse"
                                : s.status === "FAILED"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {s.status}
                          </span>
                          {isExp ? <ChevronUp className="w-3.5 h-3.5 text-neutral-500" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />}
                        </div>
                      </div>

                      {/* Expanded output and verification details */}
                      {isExp && (
                        <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-2 text-xs">
                          {s.description && <p className="text-neutral-400 text-[11px]">{s.description}</p>}
                          {s.output !== undefined && s.output !== null && (
                            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-40">
                              {typeof s.output === "object" ? JSON.stringify(s.output, null, 2) : String(s.output)}
                            </div>
                          )}
                          {s.verification ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified with {Math.round(((s.verification as { confidence_score?: number }).confidence_score ?? 1) * 100)}% confidence</span>
                            </div>
                          ) : null}
                        </div>

                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generated Artifacts Section */}
          {artifacts && artifacts.length > 0 && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-cyan-500/30 space-y-2">
              <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" /> Generated Deliverables & Artifacts ({artifacts.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {artifacts.map((art) => (
                  <div key={art.artifact_id || art.name} className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="truncate">
                      <span className="font-semibold text-white block truncate">{art.name}</span>
                      <span className="text-[10px] text-neutral-400 uppercase">{art.file_type} • {art.size_bytes}B</span>
                    </div>
                    {art.artifact_id && (
                      <a
                        href={`/api/artifacts/${art.artifact_id}/download`}
                        download={art.name}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-cyan-600 text-neutral-300 hover:text-white transition-colors text-[11px]"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Grounded Synthesis Result */}
          {finalOutput && (

            <div className="p-4 rounded-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-cyan-500/20 space-y-2">
              <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Grounded Synthesis Output
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{finalOutput}</p>
            </div>
          )}

          {/* Launch New Autonomous Mission Input */}
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <span className="text-xs font-medium text-neutral-300">Launch Autonomous Objective</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Research quantum algorithms, analyze test data, and produce report..."
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && taskInput.trim() && !isRunning) {
                    onStartNewTask(taskInput.trim());
                    setTaskInput("");
                  }
                }}
                disabled={isRunning}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <button
                onClick={() => {
                  if (taskInput.trim() && !isRunning) {
                    onStartNewTask(taskInput.trim());
                    setTaskInput("");
                  }
                }}
                disabled={isRunning || !taskInput.trim()}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> Execute
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
