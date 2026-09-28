"use client";

import React from "react";
import { Search, Code, BarChart3, Bot } from "lucide-react";
import { VoltixLogo } from "@/components/ui/Icons";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  activeModelName?: string;
}

export function EmptyState({
  onSelectPrompt,
  activeModelName,
}: EmptyStateProps) {
  const capabilityCards = [
    {
      category: "Deep Research",
      icon: Search,
      prompt:
        "Research recent developments in autonomous agent orchestration and produce a cited technical report.",
      badge: "Web · Citations",
      desc: "Researches live web, cross-checks academic/news sources, and compiles verified citations.",
      workflow: "Enables Web Research & Cross-Source Citation Verifier",
    },
    {
      category: "Software Engineering",
      icon: Code,
      prompt:
        "Write a high-performance async REST API microservice in Python with FastAPI and typed Pydantic models.",
      badge: "Python · Sandbox",
      desc: "Designs, executes, and verifies code inside an isolated Python execution sandbox.",
      workflow: "Enables Python Sandbox Execution & AST Calculator",
    },
    {
      category: "Data Analysis",
      icon: BarChart3,
      prompt:
        "Analyze the uploaded data set, compute key statistical distribution metrics, and identify anomalies.",
      badge: "Data · Charts",
      desc: "Inspects CSV/XLSX structures, computes distribution statistics, and renders visual charts.",
      workflow: "Enables Tabular Data Inspector & Chart Generation",
    },
    {
      category: "Autonomous Agent",
      icon: Bot,
      prompt:
        "Plan and orchestrate a multi-agent system with sandboxed execution, research, and independent verification.",
      badge: "Agent · Multi-Step",
      desc: "Deconstructs complex goals into structured sub-tasks, coordinates specialist tools, and verifies deliverables.",
      workflow: "Enables Agent Planner & Specialist Fleet Verification",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto py-12 px-4 text-center animate-message">
      {/* Brand Icon */}
      <div className="mb-5 transition-transform duration-300 hover:scale-105">
        <VoltixLogo
          className="w-13 h-13"
          symbolClassName="w-6 h-6 text-white"
        />
      </div>

      {/* Greeting Title (Section 50 & 79) */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white mb-2">
        What can we build today?
      </h1>
      <p className="text-stone-500 dark:text-neutral-400 text-xs sm:text-sm max-w-md mb-7 leading-relaxed">
        Voltix Aetherion coordinates specialized AI models, sandbox tools, and
        autonomous verification
        {activeModelName ? ` through ${activeModelName}` : ""}.
      </p>

      {/* Capability Grid with Explicit Workflow Consequences */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {capabilityCards.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-3.5 rounded-2xl border border-stone-200/90 bg-white hover:bg-blue-50/30 text-left transition-all duration-150 shadow-2xs hover:shadow-xs hover:border-blue-400/80 dark:border-white/10 dark:bg-[#0b1220] dark:hover:bg-[#0f172a] dark:hover:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-stone-900 dark:text-neutral-100">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono dark:bg-white/[0.05] dark:text-neutral-300">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-neutral-400 leading-normal line-clamp-2 mb-2.5">
                  {item.desc}
                </p>
              </div>

              {/* Workflow Consequence Footer (Section 10) */}
              <div className="pt-2 border-t border-stone-100 dark:border-white/[0.04] flex items-center gap-1.5 text-[10.5px] font-mono text-blue-600 dark:text-blue-400">
                <span className="text-blue-500">→</span>
                <span className="truncate">{item.workflow}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
