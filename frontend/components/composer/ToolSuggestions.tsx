"use client";

import React, { useMemo } from "react";
import {
  Calculator,
  Search,
  Code2,
  BarChart3,
  BookOpen,
  Sparkles,
  Workflow,
  Plus,
} from "lucide-react";

interface SuggestionItem {
  id: string;
  toolId: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface ToolSuggestionsProps {
  input: string;
  activeTools: string[];
  onEnableTool: (toolId: string) => void;
}

export function ToolSuggestions({
  input,
  activeTools,
  onEnableTool,
}: ToolSuggestionsProps) {
  const suggestions = useMemo(() => {
    const text = input.toLowerCase().trim();
    if (!text || text.length < 3) return [];

    const found: SuggestionItem[] = [];

    // Math AST Calculator
    if (
      (text.includes("calc") ||
        text.includes("math") ||
        text.includes("sqrt") ||
        /\d+\s*[\+\*\/\^\-]\s*\d+/.test(text)) &&
      !activeTools.includes("math.calculate")
    ) {
      found.push({
        id: "calc",
        toolId: "math.calculate",
        label: "🧮 Calculator",
        icon: Calculator,
        color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
      });
    }

    // Web Research
    if (
      (text.includes("research") ||
        text.includes("latest") ||
        text.includes("web") ||
        text.includes("news") ||
        text.includes("recent") ||
        text.includes("trend")) &&
      !activeTools.includes("web.search")
    ) {
      found.push({
        id: "web",
        toolId: "web.search",
        label: "🔎 Web Research",
        icon: Search,
        color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800",
      });
    }

    // Data Analysis
    if (
      (text.includes("data") ||
        text.includes("excel") ||
        text.includes("sales") ||
        text.includes("chart") ||
        text.includes("csv") ||
        text.includes("table") ||
        text.includes("analyze")) &&
      !activeTools.includes("data.inspect")
    ) {
      found.push({
        id: "data",
        toolId: "data.inspect",
        label: "📊 Data Analysis",
        icon: BarChart3,
        color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
      });
    }

    // Code Sandbox
    if (
      (text.includes("code") ||
        text.includes("python") ||
        text.includes("function") ||
        text.includes("debug") ||
        text.includes("refactor") ||
        text.includes("script")) &&
      !activeTools.includes("python.execute")
    ) {
      found.push({
        id: "python",
        toolId: "python.execute",
        label: "🐍 Python Sandbox",
        icon: Code2,
        color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
      });
    }

    // Document Search (RAG)
    if (
      (text.includes("doc") ||
        text.includes("pdf") ||
        text.includes("knowledge") ||
        text.includes("policy") ||
        text.includes("manual")) &&
      !activeTools.includes("knowledge.search")
    ) {
      found.push({
        id: "rag",
        toolId: "knowledge.search",
        label: "📚 Document Search",
        icon: BookOpen,
        color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800",
      });
    }

    // Task / Workflow
    if (
      (text.includes("schedule") ||
        text.includes("task") ||
        text.includes("workflow") ||
        text.includes("automate")) &&
      !activeTools.includes("task.create")
    ) {
      found.push({
        id: "task",
        toolId: "task.create",
        label: "⚡ Create Task",
        icon: Workflow,
        color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
      });
    }

    return found.slice(0, 3);
  }, [input, activeTools]);

  if (suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-50/60 dark:bg-neutral-850/60 border-t border-stone-100 dark:border-neutral-800 animate-in fade-in slide-in-from-top-1 duration-150">
      <span className="text-[10px] uppercase font-semibold text-stone-400 dark:text-neutral-500 tracking-wider flex items-center gap-1">
        <Sparkles className="w-2.5 h-2.5 text-blue-500" />
        Suggested:
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onEnableTool(s.toolId)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-transform hover:scale-102 active:scale-98 shadow-2xs ${s.color}`}
          >
            <Plus className="w-2.5 h-2.5" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
