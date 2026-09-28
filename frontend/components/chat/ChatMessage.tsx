"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/types/chat";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { VoltixSymbol } from "@/components/ui/Icons";
import { SourceList } from "@/components/sources/SourceList";
import { MessageActions } from "./MessageActions";
import { copyToClipboard } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
  onRegenerate?: () => void;
}

export function ChatMessage({ message, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopyUserMessage = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-4 group animate-message">
        <div className="max-w-[85%] md:max-w-[75%] flex flex-col items-end">
          <div className="relative px-4 py-3 rounded-2xl rounded-tr-xs bg-stone-200/80 dark:bg-neutral-800 text-stone-900 dark:text-neutral-100 text-[15px] leading-relaxed shadow-2xs">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-1 mr-1 text-stone-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopyUserMessage}
              type="button"
              className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors text-xs"
              title="Copy prompt"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 my-6 group animate-message">
      <div className="shrink-0 pt-0.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-1.5 flex items-center justify-center shadow-xs ring-1 ring-black/5 dark:ring-white/20">
          <VoltixSymbol className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-bold text-sm tracking-tight text-stone-900 dark:text-white">Voltix AI</span>
          {message.metadata?.error && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              Error
            </span>
          )}
        </div>

        {message.metadata?.citations && message.metadata.citations.length > 0 && (
          <SourceList citations={message.metadata.citations} />
        )}

        <MarkdownRenderer content={message.content} />

        <MessageActions content={message.content} onRegenerate={onRegenerate} />
      </div>
    </div>
  );
}
