"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface CodeBlockProps {
  language?: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayLang = (language || "code").toLowerCase();

  return (
    <div className="relative my-5 rounded-xl border border-stone-200 dark:border-neutral-800 bg-stone-950 text-stone-100 overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-stone-900/90 border-b border-stone-800 text-xs text-stone-400 font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px] text-stone-300">
            {displayLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-stone-800 text-stone-300 hover:text-white transition-colors focus:outline-none text-xs"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="p-4 overflow-x-auto text-[13.5px] font-mono leading-relaxed select-text">
        <pre className="m-0 p-0 whitespace-pre">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}
