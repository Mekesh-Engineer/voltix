"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Wrench,
  Search,
  BookOpen,
  Globe,
  Code2,
  BarChart3,
  FolderOpen,
  Calculator,
  FileCheck2,
  Workflow,
  Sparkles,
  Check,
  ChevronRight,
  ShieldAlert,
  Info,
} from "lucide-react";
import { ToolItem } from "./types";

const DEFAULT_TOOLS: ToolItem[] = [
  // Suggested / Common
  {
    id: "web.search",
    name: "Web Research",
    description: "Search live web content, verify facts & extract citations",
    category: "research",
    riskLevel: "low",
    enabled: true,
    icon: "Globe",
  },
  {
    id: "knowledge.search",
    name: "Search Documents (RAG)",
    description: "Retrieve relevant passages from user uploaded documents",
    category: "knowledge",
    riskLevel: "low",
    enabled: true,
    icon: "BookOpen",
  },
  {
    id: "math.calculate",
    name: "Math AST Calculator",
    description: "High-precision AST-verified arithmetic & algebraic calculations",
    category: "compute",
    riskLevel: "low",
    enabled: true,
    icon: "Calculator",
  },
  {
    id: "python.execute",
    name: "Python Sandbox",
    description: "Execute Python code in an isolated sub-process with memory limits",
    category: "compute",
    riskLevel: "medium",
    requiresConfirmation: false,
    enabled: true,
    icon: "Code2",
  },
  {
    id: "data.inspect",
    name: "Data Analysis",
    description: "Analyze tabular CSV/XLSX structures, statistics and correlations",
    category: "data",
    riskLevel: "low",
    enabled: true,
    icon: "BarChart3",
  },
  {
    id: "code.search",
    name: "Code Search & Inspect",
    description: "Search symbols, functions, and files across the codebase",
    category: "coding",
    riskLevel: "low",
    enabled: true,
    icon: "Code2",
  },
  {
    id: "filesystem.read",
    name: "Browse & Read Files",
    description: "Read project workspace files within safe directory bounds",
    category: "files",
    riskLevel: "low",
    enabled: true,
    icon: "FolderOpen",
  },
  {
    id: "filesystem.write",
    name: "Create & Edit Files",
    description: "Write or update files in workspace sandboxed directory",
    category: "files",
    riskLevel: "high",
    requiresConfirmation: true,
    enabled: false,
    icon: "FolderOpen",
  },
  {
    id: "artifact.create_markdown",
    name: "Create Markdown Artifact",
    description: "Generate structured, downloadable markdown reports and docs",
    category: "artifacts",
    riskLevel: "low",
    enabled: true,
    icon: "FileCheck2",
  },
  {
    id: "artifact.create_csv",
    name: "Create CSV / Table Artifact",
    description: "Export structured data tables to CSV/XLSX artifacts",
    category: "artifacts",
    riskLevel: "low",
    enabled: true,
    icon: "FileCheck2",
  },
  {
    id: "task.create",
    name: "Background Tasks",
    description: "Schedule autonomous background tasks and workflows",
    category: "automation",
    riskLevel: "medium",
    enabled: true,
    icon: "Workflow",
  },
  {
    id: "browser.navigate",
    name: "Browser Automation",
    description: "Headless browser DOM interaction, snapshot and visual rendering",
    category: "browser",
    riskLevel: "medium",
    enabled: true,
    icon: "Compass",
  },
  {
    id: "knowledge.graph_query",
    name: "Knowledge Graph",
    description: "Traverse semantic entity relations and document entities",
    category: "knowledge",
    riskLevel: "low",
    enabled: true,
    icon: "BookOpen",
  },
  {
    id: "code.test",
    name: "Run Tests & Verify",
    description: "Execute test suites and verify bug fixes or patches",
    category: "coding",
    riskLevel: "medium",
    enabled: true,
    icon: "Code2",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Tools", icon: Wrench },
  { id: "suggested", label: "Suggested", icon: Sparkles },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "research", label: "Research", icon: Globe },
  { id: "coding", label: "Coding", icon: Code2 },
  { id: "data", label: "Data", icon: BarChart3 },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "compute", label: "Compute", icon: Calculator },
  { id: "artifacts", label: "Artifacts", icon: FileCheck2 },
  { id: "automation", label: "Automation", icon: Workflow },
];

interface ToolCenterProps {
  toolsEnabled: boolean;
  onToggleMasterTools: (enabled: boolean) => void;
  activeTools: string[];
  onToggleTool: (toolId: string) => void;
  disabled?: boolean;
}

export function ToolCenter({
  toolsEnabled,
  onToggleMasterTools,
  activeTools,
  onToggleTool,
  disabled = false,
}: ToolCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [toolsList, setToolsList] = useState<ToolItem[]>(DEFAULT_TOOLS);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch real tools from backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBackendTools() {
      try {
        const res = await fetch("/api/agent/tools");
        if (res.ok) {
          const data = await res.json();
          if (data?.tools && Array.isArray(data.tools) && data.tools.length > 0) {
            const mapped: ToolItem[] = data.tools.map((t: { name: string; description: string; category?: string; risk_level?: string; requires_confirmation?: boolean }) => ({
              id: t.name,
              name: t.name.replace(".", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
              description: t.description || "",
              category: (t.category as ToolItem["category"]) || "knowledge",
              riskLevel: (t.risk_level as ToolItem["riskLevel"]) || "low",
              requiresConfirmation: t.requires_confirmation || false,
              enabled: true,
            }));
            if (isMounted) {
              setToolsList((prev) => {
                // Merge unique tools
                const existingIds = new Set(mapped.map((m) => m.id));
                const remaining = prev.filter((p) => !existingIds.has(p.id));
                return [...mapped, ...remaining];
              });
            }
          }
        }
      } catch {
        // Fallback to default tools
      }
    }
    loadBackendTools();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setSelectedCategory("all");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredTools = useMemo(() => {
    return toolsList.filter((tool) => {
      const matchesSearch =
        searchQuery === "" ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all"
          ? true
          : selectedCategory === "suggested"
          ? ["web.search", "knowledge.search", "data.inspect", "math.calculate", "python.execute"].includes(tool.id)
          : tool.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [toolsList, searchQuery, selectedCategory]);

  const enabledCount = activeTools.length;

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
          toolsEnabled
            ? "border border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300"
            : "border border-stone-200/80 dark:border-neutral-800 bg-stone-50/80 dark:bg-neutral-800/80 text-stone-500 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-neutral-750"
        }`}
        title={toolsEnabled ? `Tools Enabled (${enabledCount} active)` : "Tools Disabled"}
        aria-expanded={isOpen}
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>Tools</span>
        {toolsEnabled && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600/15 text-blue-700 dark:text-blue-300">
            · {enabledCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-[420px] max-w-[92vw] rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[min(520px,65vh)]">
          {/* Header */}
          <div className="p-3 border-b border-stone-100 dark:border-neutral-800 flex items-center justify-between bg-stone-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-neutral-100 text-[13px]">
                  Agent Tools ({enabledCount} enabled)
                </h3>
                <p className="text-[10px] text-stone-400 dark:text-neutral-500">
                  {toolsEnabled ? "✓ Automatic tool selection active" : "Tools disabled"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleMasterTools(!toolsEnabled)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                toolsEnabled
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                  : "bg-stone-200 text-stone-600 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {toolsEnabled ? "ENABLED" : "DISABLED"}
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-stone-100 dark:border-neutral-800">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-stone-400 dark:text-neutral-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools (e.g. web, python, math, code)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-stone-100/70 dark:bg-neutral-800/70 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-neutral-850 text-stone-800 dark:text-neutral-200 placeholder:text-stone-400 text-xs outline-none transition-all"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-stone-100 dark:border-neutral-800 overflow-x-auto no-scrollbar shrink-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.8 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                      : "text-stone-500 hover:text-stone-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tools List */}
          <div className="p-2 space-y-1 overflow-y-auto flex-1 max-h-[300px]">
            {filteredTools.length === 0 ? (
              <div className="py-8 text-center text-stone-400 dark:text-neutral-500">
                <Info className="w-5 h-5 mx-auto mb-1 opacity-50" />
                <span>No tools match your query</span>
              </div>
            ) : (
              filteredTools.map((tool) => {
                const isToolActive = activeTools.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    onClick={() => onToggleTool(tool.id)}
                    className={`flex items-start justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                      isToolActive
                        ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20"
                        : "border-transparent hover:bg-stone-100/60 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 pr-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                          isToolActive
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-stone-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                        }`}
                      >
                        {isToolActive && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-stone-900 dark:text-neutral-100">
                            {tool.name}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded font-mono uppercase font-semibold bg-stone-200/70 text-stone-600 dark:bg-neutral-800 dark:text-neutral-400">
                            {tool.category}
                          </span>
                          {tool.riskLevel === "high" && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              CONFIRM
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 dark:text-neutral-500 leading-snug mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 self-center">
                      <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-neutral-600" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-2 border-t border-stone-100 dark:border-neutral-800 bg-stone-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-[11px] text-stone-400 dark:text-neutral-500">
            <span>{activeTools.length} active capabilities</span>
            <span>Policy: Sandboxed & Verified</span>
          </div>
        </div>
      )}
    </div>
  );
}
