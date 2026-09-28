"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bot,
  Search,
  Code2,
  BarChart3,
  BookOpen,
  Calculator,
  Terminal,
  Sparkles,
  Wrench,
  FolderOpen,
  Brain,
  Workflow,
  FileCheck2,
  Lock,
  RotateCcw,
  Zap,
  Rocket,
} from "lucide-react";
import { SlashCommand } from "./types";

interface SlashMenuProps {
  isOpen: boolean;
  filterText: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

const COMMANDS: SlashCommand[] = [
  {
    cmd: "/fast",
    label: "Fast Profile",
    desc: "Switch to ultra-low latency direct execution",
    icon: "Zap",
    category: "Profiles",
    profile: "fast",
  },
  {
    cmd: "/deep",
    label: "Deep Reasoning",
    desc: "Switch to deep multi-step reasoning & verification",
    icon: "Brain",
    category: "Profiles",
    profile: "deep",
  },
  {
    cmd: "/max",
    label: "Aetherion Max",
    desc: "Switch to multi-agent swarm & verified deliverables",
    icon: "Rocket",
    category: "Profiles",
    profile: "max",
  },
  {
    cmd: "/agent",
    label: "Autonomous Agent",
    desc: "Autonomous planning, tool execution & verification",
    icon: "Bot",
    category: "Agents",
    mode: "agent",
  },
  {
    cmd: "/research",
    label: "Web Research",
    desc: "Web queries, source comparison & verified citations",
    icon: "Search",
    category: "Agents",
    mode: "research",
  },
  {
    cmd: "/code",
    label: "Coding Agent",
    desc: "Code generation, sandbox execution & test verification",
    icon: "Code2",
    category: "Agents",
    mode: "code",
  },
  {
    cmd: "/data",
    label: "Data Analysis",
    desc: "Analyze tabular CSV/XLSX, statistics & charts",
    icon: "BarChart3",
    category: "Agents",
    mode: "data",
  },
  {
    cmd: "/rag",
    label: "Search Documents",
    desc: "Retrieve semantic chunks from uploaded documents",
    icon: "BookOpen",
    category: "Knowledge",
    mode: "rag",
  },
  {
    cmd: "/calc",
    label: "Calculator",
    desc: "Evaluate arithmetic expressions safely via AST",
    icon: "Calculator",
    category: "Compute",
  },
  {
    cmd: "/python",
    label: "Python Sandbox",
    desc: "Execute isolated Python script in worker process",
    icon: "Terminal",
    category: "Compute",
  },
  {
    cmd: "/model",
    label: "Switch Model",
    desc: "Switch between Ollama local and cloud reasoning models",
    icon: "Sparkles",
    category: "Controls",
  },
  {
    cmd: "/tools",
    label: "Agent Tool Center",
    desc: "Browse and configure autonomous agent capabilities",
    icon: "Wrench",
    category: "Controls",
  },
  {
    cmd: "/files",
    label: "Manage Files",
    desc: "Browse indexed documents and workspace files",
    icon: "FolderOpen",
    category: "Files",
  },
  {
    cmd: "/memory",
    label: "Search Memory",
    desc: "Search conversational history and persistent memory",
    icon: "Brain",
    category: "Knowledge",
  },
  {
    cmd: "/task",
    label: "Schedule Task",
    desc: "Create and queue a scheduled agent task",
    icon: "Workflow",
    category: "Automation",
  },
  {
    cmd: "/workflow",
    label: "Run Workflow",
    desc: "Execute predefined multi-step agent pipeline",
    icon: "Workflow",
    category: "Automation",
  },
  {
    cmd: "/artifact",
    label: "Create Artifact",
    desc: "Export generated report as PDF, DOCX, or Markdown",
    icon: "FileCheck2",
    category: "Output",
  },
  {
    cmd: "/local",
    label: "Local Only Mode",
    desc: "Enforce strict on-device Ollama execution",
    icon: "Lock",
    category: "Security",
    mode: "local",
  },
  {
    cmd: "/reset",
    label: "Reset Context",
    desc: "Clear current conversation memory and start fresh",
    icon: "RotateCcw",
    category: "Controls",
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  Search,
  Code2,
  BarChart3,
  BookOpen,
  Calculator,
  Terminal,
  Sparkles,
  Wrench,
  FolderOpen,
  Brain,
  Workflow,
  FileCheck2,
  Lock,
  RotateCcw,
  Zap,
  Rocket,
};

export function SlashMenu({
  isOpen,
  filterText,
  onSelect,
  onClose,
}: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    const q = filterText.replace("/", "").toLowerCase().trim();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.cmd.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q)
    );
  }, [filterText]);

  const safeIndex = selectedIndex < filteredCommands.length ? selectedIndex : 0;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filteredCommands.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? filteredCommands.length - 1 : prev - 1
        );
      } else if (e.key === "Enter" && filteredCommands.length > 0) {
        e.preventDefault();
        onSelect(filteredCommands[safeIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, safeIndex, filteredCommands, onSelect, onClose]);

  if (!isOpen || filteredCommands.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 z-50 w-80 max-w-[90vw] rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500 border-b border-stone-100 dark:border-neutral-800 mb-1 flex items-center justify-between">
          <span>Agent Commands</span>
          <span className="font-mono text-[9px]">↑↓ navigate · ↵ select</span>
        </div>

        <div className="space-y-0.5">
          {filteredCommands.map((c, idx) => {
            const Icon = ICON_MAP[c.icon] || Sparkles;
            const isSelected = idx === safeIndex;
            return (
              <button
                key={c.cmd}
                type="button"
                onClick={() => onSelect(c)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-colors ${
                  isSelected
                    ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                    : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300"
                }`}
              >
                <div className="mt-0.5 rounded-lg p-1 bg-stone-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-stone-900 dark:text-neutral-100">
                      {c.cmd}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-neutral-400">
                      {c.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 dark:text-neutral-500 truncate mt-0.5">
                    {c.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
