import React from "react";
import { Search, Calculator, Terminal, Sparkles, Loader2 } from "lucide-react";

interface ActivityTimelineProps {
  status: string | null;
  stage?: "rag" | "tool" | "reasoning" | "llm";
}

export function ActivityTimeline({ status, stage }: ActivityTimelineProps) {
  if (!status) return null;

  const getStageIcon = () => {
    switch (stage) {
      case "rag":
        return <Search className="w-3.5 h-3.5 text-blue-500 animate-pulse" />;
      case "tool":
        return <Calculator className="w-3.5 h-3.5 text-amber-500 animate-spin" />;
      case "reasoning":
        return <Terminal className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />;
      case "llm":
        return <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />;
      default:
        return <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin" />;
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200/80 bg-stone-50/80 text-xs font-mono text-stone-600 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-300 w-fit my-2 shadow-2xs animate-message">
      {getStageIcon()}
      <span className="truncate">{status}</span>
    </div>
  );
}
