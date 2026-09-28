import React from "react";

interface ContextMeterProps {
  currentTokens: number;
  maxTokens?: number;
  detailed?: boolean;
}

export function ContextMeter({
  currentTokens,
  maxTokens = 8192,
  detailed = false,
}: ContextMeterProps) {
  const safeMax = Math.max(maxTokens, 1);
  const percentage = Math.min(Math.round((currentTokens / safeMax) * 100), 100);
  const isWarning = percentage > 80;

  return (
    <div
      className="flex items-center gap-2 text-xs font-mono"
      title={`Context Budget: ~${currentTokens.toLocaleString()} / ${safeMax.toLocaleString()} tokens (${percentage}%)`}
    >
      <div className="w-16 h-1.5 bg-stone-200 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isWarning ? "bg-amber-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[11px] text-stone-500 dark:text-neutral-400">
        {percentage}%
      </span>
      {detailed && (
        <span className="text-[10px] text-stone-400 dark:text-neutral-500 hidden lg:inline">
          (~{currentTokens} tok)
        </span>
      )}
    </div>
  );
}
