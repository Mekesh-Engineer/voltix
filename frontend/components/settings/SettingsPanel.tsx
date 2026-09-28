"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Moon,
  Sun,
  Monitor,
  Database,
  Wrench,
  Loader2,
  AlertCircle,
  Radio,
  Server,
  Zap,
} from "lucide-react";
import { fetchSettings, updateSettings, testModelProvider } from "@/lib/api";
import { setStoredTheme } from "@/lib/storage";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange?: (theme: "system" | "light" | "dark") => void;
}

interface ProviderTestResult {
  status: "idle" | "testing" | "online" | "offline";
  latency?: number;
  details?: string;
  models?: string[];
}

export function SettingsPanel({ isOpen, onClose, onThemeChange }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"general" | "ai" | "memory" | "advanced">("general");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [ollamaUrl, setOllamaUrl] = useState("http://127.0.0.1:11434");

  // Ollama test status
  const [testResult, setTestResult] = useState<ProviderTestResult>({ status: "idle" });

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const s = await fetchSettings();
          setTheme(s.theme);
          setTemperature(s.temperature);
          setMaxTokens(s.maxTokens);
          setMemoryEnabled(s.memoryEnabled);
          setRagEnabled(s.ragEnabled);
          setToolsEnabled(s.toolsEnabled);
          setOllamaUrl(s.ollamaBaseUrl);
          if (s.ollamaStatus !== undefined) {
            setTestResult({
              status: s.ollamaStatus ? "online" : "offline",
              details: s.ollamaStatus ? "Connected to Ollama service" : "Daemon unreachable",
            });
          }
        } catch (e) {
          console.warn("Failed to load settings:", e);
        }
      })();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestOllama = async () => {
    setTestResult({ status: "testing" });
    try {
      const res = await testModelProvider("ollama", ollamaUrl);
      setTestResult({
        status: res.status as "online" | "offline",
        latency: res.latency_ms,
        details: res.details,
        models: res.available_models,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestResult({
        status: "offline",
        details: msg,
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        theme,
        temperature,
        maxTokens,
        memoryEnabled,
        ragEnabled,
        toolsEnabled,
        ollama_base_url: ollamaUrl || undefined,
      });
      setStoredTheme(theme);
      onThemeChange?.(theme);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e) {
      console.error("Save settings error:", e);
    }
  };

  const renderOllamaStatusBadge = () => {
    if (testResult.status === "testing") {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-medium">
          <Loader2 className="w-3 h-3 animate-spin" /> Ping...
        </span>
      );
    }
    if (testResult.status === "online") {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Online {testResult.latency ? `(${testResult.latency}ms)` : ""}
        </span>
      );
    }
    if (testResult.status === "offline") {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-mono font-medium">
          <AlertCircle className="w-3 h-3" /> Offline
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-neutral-800 text-stone-500 dark:text-neutral-400 text-xs font-mono">
        <Radio className="w-3 h-3" /> Standby
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-850 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-neutral-750">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">Voltix Settings</h2>
              <p className="text-xs text-stone-500 dark:text-neutral-400">Configured permanently with Ollama AI Engine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body with Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-52 border-r border-stone-100 dark:border-neutral-750 p-2.5 space-y-1 bg-stone-50/50 dark:bg-neutral-900/40">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === "general"
                  ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-stone-600 dark:text-neutral-400 hover:bg-stone-100/60 dark:hover:bg-neutral-800/60"
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>General & UI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === "ai"
                  ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-stone-600 dark:text-neutral-400 hover:bg-stone-100/60 dark:hover:bg-neutral-800/60"
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Ollama AI Engine</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("memory")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === "memory"
                  ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-stone-600 dark:text-neutral-400 hover:bg-stone-100/60 dark:hover:bg-neutral-800/60"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Memory & RAG</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("advanced")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === "advanced"
                  ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-stone-600 dark:text-neutral-400 hover:bg-stone-100/60 dark:hover:bg-neutral-800/60"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Tools & Limits</span>
            </button>
          </div>

          {/* Tab Pane */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "general" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("system");
                        setStoredTheme("system");
                        onThemeChange?.("system");
                      }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-colors ${
                        theme === "system"
                          ? "border-blue-600 bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-semibold"
                          : "border-stone-200 dark:border-neutral-700 text-stone-600 dark:text-neutral-400 hover:border-stone-300 dark:hover:border-neutral-600"
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span>System</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("light");
                        setStoredTheme("light");
                        onThemeChange?.("light");
                      }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-colors ${
                        theme === "light"
                          ? "border-blue-600 bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-semibold"
                          : "border-stone-200 dark:border-neutral-700 text-stone-600 dark:text-neutral-400 hover:border-stone-300 dark:hover:border-neutral-600"
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("dark");
                        setStoredTheme("dark");
                        onThemeChange?.("dark");
                      }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-colors ${
                        theme === "dark"
                          ? "border-blue-600 bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-semibold"
                          : "border-stone-200 dark:border-neutral-700 text-stone-600 dark:text-neutral-400 hover:border-stone-300 dark:hover:border-neutral-600"
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Sampling Temperature ({temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[11px] text-stone-400 mt-1 font-mono">
                    <span>Precise (0.0)</span>
                    <span>Balanced (0.7)</span>
                    <span>Creative (1.5)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-4">
                {/* Dedicated Ollama Provider Card */}
                <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent p-4 dark:border-blue-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
                          Ollama AI Service (Permanent Engine)
                        </h3>
                        <p className="text-[11px] text-stone-500 dark:text-neutral-400">
                          Primary LLM service for local & private inference
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderOllamaStatusBadge()}
                      <button
                        type="button"
                        onClick={handleTestOllama}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-white dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 hover:bg-stone-50 dark:hover:bg-neutral-700 transition-colors shadow-2xs"
                      >
                        Ping Daemon
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-700 dark:text-neutral-300">
                      Ollama API Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-stone-900 dark:text-white outline-none focus:border-blue-500 text-xs font-mono shadow-2xs"
                    />
                    <p className="text-[11px] text-stone-500 dark:text-neutral-400">
                      Default local daemon runs on port <code className="font-mono text-blue-600 dark:text-blue-400">11434</code>. Remote Ollama hosts are also supported.
                    </p>
                  </div>

                  {testResult.models && testResult.models.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-neutral-700/60">
                      <p className="text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-2">
                        Detected Ollama Models ({testResult.models.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {testResult.models.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-1 rounded-md text-[11px] font-mono bg-stone-100 dark:bg-neutral-800 text-stone-700 dark:text-neutral-300 border border-stone-200 dark:border-neutral-700"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Permanent Sole Provider Guarantee Box */}
                <div className="rounded-xl border border-stone-200/80 dark:border-neutral-750 bg-stone-50/60 dark:bg-neutral-800/30 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-stone-800 dark:text-neutral-200">
                        Sole Engine Architecture
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        Voltix runs 100% locally and privately through Ollama. All external cloud APIs (OpenAI, Gemini, Anthropic) have been permanently decommissioned.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "memory" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/50 dark:bg-neutral-800/40">
                  <div>
                    <h4 className="font-semibold text-stone-800 dark:text-neutral-200 text-sm">Conversation Memory</h4>
                    <p className="text-xs text-stone-500 dark:text-neutral-400">Remember context across multi-turn exchanges within each chat.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={memoryEnabled}
                    onChange={(e) => setMemoryEnabled(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/50 dark:bg-neutral-800/40">
                  <div>
                    <h4 className="font-semibold text-stone-800 dark:text-neutral-200 text-sm">RAG Knowledge Retrieval</h4>
                    <p className="text-xs text-stone-500 dark:text-neutral-400">Search attached and uploaded documents for factual grounding.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={ragEnabled}
                    onChange={(e) => setRagEnabled(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                </div>
              </div>
            )}

            {activeTab === "advanced" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/50 dark:bg-neutral-800/40">
                  <div>
                    <h4 className="font-semibold text-stone-800 dark:text-neutral-200 text-sm">Autonomous AI Tools</h4>
                    <p className="text-xs text-stone-500 dark:text-neutral-400">Allow AI to invoke Math AST calculator, Python runner, and search.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={toolsEnabled}
                    onChange={(e) => setToolsEnabled(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Maximum Output Tokens ({maxTokens})
                  </label>
                  <input
                    type="range"
                    min="512"
                    max="8192"
                    step="256"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-stone-100 dark:border-neutral-750 bg-stone-50/80 dark:bg-neutral-900/60">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {savedSuccess && "Settings saved successfully!"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
