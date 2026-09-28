"use client";

import React from "react";
import { Heart, GraduationCap, Cpu, Coffee, Atom, Languages } from "lucide-react";
import { VoltixLogo } from "@/components/ui/Icons";

interface EmptyChatProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyChat({ onSelectPrompt }: EmptyChatProps) {
  const suggestions = [
    {
      label: "Technology",
      icon: Cpu,
      prompt: "Write a high-performance async REST API endpoint in Python with FastAPI.",
      description: "FastAPI REST endpoint code",
    },
    {
      label: "Learn",
      icon: GraduationCap,
      prompt: "Explain how transformer neural networks and multi-head attention work in plain English.",
      description: "Transformer attention explained",
    },
    {
      label: "Science",
      icon: Atom,
      prompt: "Derive the time dilation formula from Einstein's special relativity with step-by-step LaTeX math.",
      description: "Special relativity derivation",
    },
    {
      label: "Health",
      icon: Heart,
      prompt: "Design a science-backed weekly workout routine for strength and metabolic endurance.",
      description: "Weekly fitness program",
    },
    {
      label: "Life stuff",
      icon: Coffee,
      prompt: "Create a detailed 3-day productivity and time-management framework using time-blocking.",
      description: "Productivity framework",
    },
    {
      label: "Language",
      icon: Languages,
      prompt: "Compare nuanced differences between Japanese keigo politeness levels with examples.",
      description: "Politeness in Japanese",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto py-12 px-4 text-center animate-message">
      <div className="mb-5 transition-transform duration-300 hover:scale-105">
        <VoltixLogo className="w-14 h-14" symbolClassName="w-7 h-7 text-white" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white mb-2">
        What can I help with?
      </h1>
      <p className="text-stone-500 dark:text-neutral-400 text-sm max-w-md mb-8">
        Ask general questions, analyze documents, solve math, debug code, or choose from suggested prompts below.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 w-full">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-3.5 rounded-xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:bg-stone-50 dark:hover:bg-neutral-750 text-left transition-all hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs hover:shadow-xs focus:outline-none"
            >
              <div className="flex items-center gap-2 mb-1.5 text-blue-600 dark:text-blue-400">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="text-xs text-stone-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
