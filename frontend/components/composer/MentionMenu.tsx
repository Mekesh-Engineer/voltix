"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Bot, FileText, Wrench, Cpu } from "lucide-react";
import { MentionItem } from "./types";
import { FileInfo } from "@/types/file";
import { ModelInfo } from "@/types/model";

interface MentionMenuProps {
  isOpen: boolean;
  filterText: string;
  attachments: FileInfo[];
  models: ModelInfo[];
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
}

export function MentionMenu({
  isOpen,
  filterText,
  attachments,
  models,
  onSelect,
  onClose,
}: MentionMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const mentionItems = useMemo(() => {
    const items: MentionItem[] = [];

    // Specialized Agents
    items.push(
      {
        id: "agent.research",
        label: "@ResearchAgent",
        sublabel: "Autonomous web research & citation synthesis",
        type: "agent",
      },
      {
        id: "agent.code",
        label: "@CodeAgent",
        sublabel: "Specialized in Python, code generation & test execution",
        type: "agent",
      },
      {
        id: "agent.data",
        label: "@DataAgent",
        sublabel: "Spreadsheet & tabular data analysis and charts",
        type: "agent",
      },
      {
        id: "agent.supervisor",
        label: "@SupervisorAgent",
        sublabel: "Multi-agent coordination and goal planning",
        type: "agent",
      }
    );

    // Attached files
    for (const f of attachments) {
      items.push({
        id: `file.${f.id}`,
        label: `@${f.originalName}`,
        sublabel: `Attached document (${f.formattedSize})`,
        type: "file",
      });
    }

    // Common tools
    items.push(
      {
        id: "tool.web",
        label: "@web_search",
        sublabel: "Live search & web browsing tool",
        type: "tool",
      },
      {
        id: "tool.python",
        label: "@python_sandbox",
        sublabel: "Isolated Python code executor",
        type: "tool",
      },
      {
        id: "tool.calc",
        label: "@calculator",
        sublabel: "AST math calculation engine",
        type: "tool",
      }
    );

    // Available models
    for (const m of models.slice(0, 4)) {
      items.push({
        id: `model.${m.id}`,
        label: `@${m.name}`,
        sublabel: `${m.category} Model (${m.provider})`,
        type: "model",
      });
    }

    const q = filterText.replace("@", "").toLowerCase().trim();
    if (!q) return items;

    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel.toLowerCase().includes(q)
    );
  }, [attachments, models, filterText]);

  const safeIndex = selectedIndex < mentionItems.length ? selectedIndex : 0;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(mentionItems.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? mentionItems.length - 1 : prev - 1
        );
      } else if (e.key === "Enter" && mentionItems.length > 0) {
        e.preventDefault();
        onSelect(mentionItems[safeIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, safeIndex, mentionItems, onSelect, onClose]);

  if (!isOpen || mentionItems.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 z-50 w-80 max-w-[90vw] rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-500 border-b border-stone-100 dark:border-neutral-800 mb-1 flex items-center justify-between">
          <span>Mention Context (@)</span>
          <span className="font-mono text-[9px]">↑↓ navigate · ↵ select</span>
        </div>

        <div className="space-y-0.5">
          {mentionItems.map((item, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-colors ${
                  isSelected
                    ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                    : "hover:bg-stone-100/70 dark:hover:bg-neutral-800/70 text-stone-700 dark:text-neutral-300"
                }`}
              >
                <div className="mt-0.5 rounded-lg p-1 bg-stone-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shrink-0">
                  {item.type === "agent" && <Bot className="h-3.5 w-3.5 text-purple-500" />}
                  {item.type === "file" && <FileText className="h-3.5 w-3.5 text-blue-500" />}
                  {item.type === "tool" && <Wrench className="h-3.5 w-3.5 text-amber-500" />}
                  {item.type === "model" && <Cpu className="h-3.5 w-3.5 text-emerald-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-stone-900 dark:text-neutral-100">
                      {item.label}
                    </span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded font-semibold bg-stone-100 dark:bg-neutral-800 text-stone-500 dark:text-neutral-400">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 dark:text-neutral-500 truncate mt-0.5">
                    {item.sublabel}
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
