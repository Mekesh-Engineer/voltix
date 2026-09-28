"use client";

import React, { useRef, useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/types/chat";
import { EmptyChat } from "./EmptyChat";
import { ChatMessage } from "./ChatMessage";
import { StreamingMessage } from "./StreamingMessage";

interface ChatContainerProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  streamingStatus?: string | null;
  onSelectPrompt: (prompt: string) => void;
  onRegenerate: () => void;
}

export function ChatContainer({
  messages,
  isStreaming,
  streamingStatus,
  onSelectPrompt,
  onRegenerate,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto scroll to bottom
  const scrollToBottom = (smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom(true);
    }
  }, [messages, isStreaming]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700"
      >
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <EmptyChat onSelectPrompt={onSelectPrompt} />
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isLastAssistant =
                  msg.role === "assistant" &&
                  index === messages.length - 1 &&
                  !isStreaming;
                return (
                  <ChatMessage
                    key={msg.id || index}
                    message={msg}
                    onRegenerate={isLastAssistant ? onRegenerate : undefined}
                  />
                );
              })}

              {isStreaming && (
                <StreamingMessage status={streamingStatus} />
              )}
            </div>
          )}
        </div>
      </div>

      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute right-8 bottom-6 p-2 rounded-full border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-stone-600 dark:text-neutral-300 shadow-md hover:bg-stone-50 dark:hover:bg-neutral-750 transition-all focus:outline-none z-20"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
