"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  Play,
  Square,
  Gauge,
  Layers,
  Sun,
  Moon,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { useTheme } from "@/hooks/useTheme";
import { streamChat } from "@/lib/streaming";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

interface ModelRunState {
  isStreaming: boolean;
  content: string;
  status: string | null;
  ttft_ms?: number;
  tokens_per_sec?: number;
  total_tokens?: number;
  duration_ms?: number;
  error?: string | null;
}

const INITIAL_RUN_STATE: ModelRunState = {
  isStreaming: false,
  content: "",
  status: null,
};

const BENCHMARK_PRESETS = [
  { id: "attention", label: "Attention", prompt: "Explain how transformer attention mechanisms work." },
  { id: "coding", label: "Coding", prompt: "Compare Python and Rust for building high-throughput network microservices." },
  { id: "reasoning", label: "Reasoning", prompt: "Analyze the trade-offs of microservices vs monolithic architectures under 100k req/sec load." },
  { id: "long-context", label: "Long Context", prompt: "Synthesize the architectural evolution of agentic reasoning models and distributed tool calling." },
  { id: "agentic", label: "Agentic", prompt: "Plan and orchestrate a multi-agent system with sandboxed execution and independent auditing." },
];

export default function StudioPage() {
  const { models, loading } = useModels();
  const { isDark, toggleTheme, mounted } = useTheme();

  const [modelA, setModelA] = useState("aetherion");
  const [modelB, setModelB] = useState("gpt-oss:120b-cloud");
  const [activePreset, setActivePreset] = useState<string>("coding");
  const [prompt, setPrompt] = useState(
    "Compare Python and Rust for building high-throughput network microservices."
  );

  const [stateA, setStateA] = useState<ModelRunState>(INITIAL_RUN_STATE);
  const [stateB, setStateB] = useState<ModelRunState>(INITIAL_RUN_STATE);

  const abortA = useRef<AbortController | null>(null);
  const abortB = useRef<AbortController | null>(null);

  const isRunning = stateA.isStreaming || stateB.isStreaming;

  const handleRunComparison = () => {
    if (!prompt.trim() || isRunning) return;

    // Reset states
    setStateA({ ...INITIAL_RUN_STATE, isStreaming: true, status: "Connecting..." });
    setStateB({ ...INITIAL_RUN_STATE, isStreaming: true, status: "Connecting..." });

    const objA = models.find((m) => m.id === modelA);
    const objB = models.find((m) => m.id === modelB);

    const startA = Date.now();
    let firstTokenA: number | null = null;
    let tokensA = 0;
    let accA = "";

    abortA.current = streamChat(
      {
        message: prompt,
        model: modelA,
        provider: objA?.provider || "assistant",
        toolsEnabled: false,
      },
      {
        onToken: (tok) => {
          if (!firstTokenA) firstTokenA = Date.now();
          tokensA += 1;
          accA += tok;
          setStateA((prev) => ({
            ...prev,
            content: accA,
            status: null,
            ttft_ms: firstTokenA ? firstTokenA - startA : undefined,
          }));
        },
        onMetrics: (m) => {
          setStateA((prev) => ({
            ...prev,
            ttft_ms: m.time_to_first_token_ms,
            tokens_per_sec: m.tokens_per_sec,
            total_tokens: m.total_tokens,
          }));
        },
        onDone: () => {
          const totalTime = Date.now() - startA;
          setStateA((prev) => ({
            ...prev,
            isStreaming: false,
            duration_ms: totalTime,
            tokens_per_sec: prev.tokens_per_sec || Math.round((tokensA / (totalTime / 1000)) * 10) / 10,
            total_tokens: prev.total_tokens || tokensA,
          }));
        },
        onError: (err) => {
          setStateA((prev) => ({ ...prev, isStreaming: false, error: err }));
        },
      }
    );

    const startB = Date.now();
    let firstTokenB: number | null = null;
    let tokensB = 0;
    let accB = "";

    abortB.current = streamChat(
      {
        message: prompt,
        model: modelB,
        provider: objB?.provider || "ollama",
        toolsEnabled: false,
      },
      {
        onToken: (tok) => {
          if (!firstTokenB) firstTokenB = Date.now();
          tokensB += 1;
          accB += tok;
          setStateB((prev) => ({
            ...prev,
            content: accB,
            status: null,
            ttft_ms: firstTokenB ? firstTokenB - startB : undefined,
          }));
        },
        onMetrics: (m) => {
          setStateB((prev) => ({
            ...prev,
            ttft_ms: m.time_to_first_token_ms,
            tokens_per_sec: m.tokens_per_sec,
            total_tokens: m.total_tokens,
          }));
        },
        onDone: () => {
          const totalTime = Date.now() - startB;
          setStateB((prev) => ({
            ...prev,
            isStreaming: false,
            duration_ms: totalTime,
            tokens_per_sec: prev.tokens_per_sec || Math.round((tokensB / (totalTime / 1000)) * 10) / 10,
            total_tokens: prev.total_tokens || tokensB,
          }));
        },
        onError: (err) => {
          setStateB((prev) => ({ ...prev, isStreaming: false, error: err }));
        },
      }
    );
  };

  const handleStop = () => {
    if (abortA.current) {
      abortA.current.abort();
      abortA.current = null;
    }
    if (abortB.current) {
      abortB.current.abort();
      abortB.current = null;
    }
    setStateA((prev) => ({ ...prev, isStreaming: false }));
    setStateB((prev) => ({ ...prev, isStreaming: false }));
  };

  const modelObjA = models.find((m) => m.id === modelA);
  const modelObjB = models.find((m) => m.id === modelB);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-stone-50/70 dark:bg-[#070b14] font-sans antialiased text-stone-900 dark:text-neutral-100">
      {/* Studio Header (Section 9 & 57) */}
      <header className="h-14 border-b border-stone-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#0b1220]/90 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl border border-stone-200/80 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-150 shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Chat</span>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-stone-900 dark:text-white">
                Studio
              </h1>
              <span className="rounded-full bg-blue-500/10 dark:bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Evaluation Arena
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-stone-500 dark:text-neutral-400">
              Compare intelligence, latency and execution performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs active:scale-95 transition-all"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop Both</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunComparison}
              disabled={!prompt.trim() || loading}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-xs hover:shadow-sm active:scale-95 transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run Parallel Benchmark</span>
            </button>
          )}

          <button
            type="button"
            suppressHydrationWarning
            onClick={toggleTheme}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none group border border-stone-200/60 dark:border-white/10"
            title={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
            aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
          >
            {mounted && isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-12" />
            )}
          </button>
        </div>
      </header>

      {/* Benchmark Prompt Input Bar & Presets (Section 30) */}
      <div className="border-b border-stone-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-[#0b1220]/60 p-3 shrink-0 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setActivePreset("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isRunning) handleRunComparison();
              }}
              placeholder="Enter benchmark prompt to send to both models simultaneously..."
              className="w-full rounded-xl border border-stone-200/90 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-white/10 dark:bg-[#0f172a] dark:text-neutral-100 shadow-2xs font-mono transition-all"
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs overflow-x-auto w-full md:w-auto py-0.5">
            <span className="text-[11px] font-bold text-stone-400 dark:text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
              Presets
            </span>
            {BENCHMARK_PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setActivePreset(preset.id);
                    setPrompt(preset.prompt);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "border border-stone-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] text-stone-600 dark:text-neutral-300 hover:border-blue-300 dark:hover:border-blue-700/60 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dual Arena Viewport (Section 27 & 29) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200/80 dark:divide-white/[0.08] overflow-hidden">
        {/* Model A Column */}
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#0b1220]">
          {/* Header & Metrics A */}
          <div className="p-3 border-b border-stone-200/80 dark:border-white/[0.08] bg-stone-50/70 dark:bg-[#0f172a]/70 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Model A
              </span>
              <select
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                disabled={isRunning}
                className="rounded-lg border border-stone-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-stone-800 dark:border-white/10 dark:bg-[#162238] dark:text-neutral-100 focus:outline-none focus:border-blue-500"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>

              {/* Status Indicator */}
              <span className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-neutral-400 font-medium">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    stateA.isStreaming
                      ? "bg-blue-500 animate-pulse"
                      : stateA.error
                      ? "bg-rose-500"
                      : stateA.content
                      ? "bg-emerald-500"
                      : "bg-emerald-500"
                  }`}
                />
                <span>
                  {stateA.isStreaming ? "Working" : stateA.error ? "Offline" : stateA.content ? "Complete" : "Ready"}
                </span>
              </span>
            </div>

            {/* Metrics Chips A */}
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              {stateA.ttft_ms !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 font-semibold">
                  <Zap className="h-3 w-3 text-blue-500" />
                  {stateA.ttft_ms}ms TTFT
                </span>
              )}
              {stateA.tokens_per_sec !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/[0.05] text-stone-600 dark:text-neutral-300 border border-stone-200/60 dark:border-white/10">
                  <Gauge className="h-3 w-3 text-stone-400" />
                  {stateA.tokens_per_sec} tok/s
                </span>
              )}
              {stateA.total_tokens !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/[0.05] text-stone-600 dark:text-neutral-300 border border-stone-200/60 dark:border-white/10">
                  <Layers className="h-3 w-3 text-stone-400" />
                  {stateA.total_tokens} tok
                </span>
              )}
            </div>
          </div>

          {/* Response Feed A */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs">
            {stateA.error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 mb-3 shadow-2xs">
                {stateA.error}
              </div>
            )}
            {stateA.status && (
              <div className="text-blue-600 dark:text-blue-400 font-mono italic animate-pulse flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>{stateA.status}</span>
              </div>
            )}
            {stateA.content ? (
              <MarkdownRenderer content={stateA.content} />
            ) : (
              !stateA.isStreaming && (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 dark:text-neutral-600 italic gap-2 py-16">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <span>Press &quot;Run Parallel Benchmark&quot; to test {modelObjA?.name || "Model A"}</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Model B Column */}
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#0b1220]">
          {/* Header & Metrics B */}
          <div className="p-3 border-b border-stone-200/80 dark:border-white/[0.08] bg-stone-50/70 dark:bg-[#0f172a]/70 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                Model B
              </span>
              <select
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                disabled={isRunning}
                className="rounded-lg border border-stone-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-stone-800 dark:border-white/10 dark:bg-[#162238] dark:text-neutral-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>

              {/* Status Indicator */}
              <span className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-neutral-400 font-medium">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    stateB.isStreaming
                      ? "bg-slate-500 animate-pulse"
                      : stateB.error
                      ? "bg-rose-500"
                      : stateB.content
                      ? "bg-emerald-500"
                      : "bg-emerald-500"
                  }`}
                />
                <span>
                  {stateB.isStreaming ? "Working" : stateB.error ? "Offline" : stateB.content ? "Complete" : "Ready"}
                </span>
              </span>
            </div>

            {/* Metrics Chips B */}
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              {stateB.ttft_ms !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/[0.05] text-stone-700 dark:text-neutral-300 border border-stone-200/60 dark:border-white/10 font-semibold">
                  <Zap className="h-3 w-3 text-stone-500" />
                  {stateB.ttft_ms}ms TTFT
                </span>
              )}
              {stateB.tokens_per_sec !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/[0.05] text-stone-600 dark:text-neutral-300 border border-stone-200/60 dark:border-white/10">
                  <Gauge className="h-3 w-3 text-stone-400" />
                  {stateB.tokens_per_sec} tok/s
                </span>
              )}
              {stateB.total_tokens !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/[0.05] text-stone-600 dark:text-neutral-300 border border-stone-200/60 dark:border-white/10">
                  <Layers className="h-3 w-3 text-stone-400" />
                  {stateB.total_tokens} tok
                </span>
              )}
            </div>
          </div>

          {/* Response Feed B */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs">
            {stateB.error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 mb-3 shadow-2xs">
                {stateB.error}
              </div>
            )}
            {stateB.status && (
              <div className="text-stone-600 dark:text-neutral-400 font-mono italic animate-pulse flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-ping" />
                <span>{stateB.status}</span>
              </div>
            )}
            {stateB.content ? (
              <MarkdownRenderer content={stateB.content} />
            ) : (
              !stateB.isStreaming && (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 dark:text-neutral-600 italic gap-2 py-16">
                  <div className="w-10 h-10 rounded-2xl bg-stone-500/10 flex items-center justify-center text-stone-500 border border-stone-500/20">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <span>Press &quot;Run Parallel Benchmark&quot; to test {modelObjB?.name || "Model B"}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

