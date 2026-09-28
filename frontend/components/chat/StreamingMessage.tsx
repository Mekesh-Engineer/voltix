import React from "react";
import { VoltixSymbol } from "@/components/ui/Icons";

interface StreamingMessageProps {
  status?: string | null;
}

export function StreamingMessage({ status }: StreamingMessageProps) {
  return (
    <div className="flex gap-4 my-6 animate-message">
      <div className="shrink-0 pt-0.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-1.5 flex items-center justify-center shadow-xs ring-1 ring-black/5 dark:ring-white/20">
          <VoltixSymbol className="w-4 h-4 text-white animate-pulse" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-bold text-sm tracking-tight text-stone-900 dark:text-white">Voltix AI</span>
          <span className="text-xs text-stone-400 dark:text-neutral-500 font-normal">
            {status || "Thinking..."}
          </span>
        </div>
        <div className="flex items-center gap-1.5 py-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
