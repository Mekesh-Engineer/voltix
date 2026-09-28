"use client";

import React from "react";
import { ChatMessage, CitationItem } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { ActivityTimeline } from "./ActivityTimeline";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingStatus: string | null;
  streamingStage?: "rag" | "tool" | "reasoning" | "llm";
  onRegenerate: () => void;
  onBranch: (messageId: string) => void;
  onSelectCitation: (citation: CitationItem) => void;
}

export function MessageList({
  messages,
  isStreaming,
  streamingStatus,
  streamingStage,
  onRegenerate,
  onBranch,
  onSelectCitation,
}: MessageListProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {messages.map((msg, idx) => {
        const isLastAssistant =
          msg.role === "assistant" && idx === messages.length - 1 && !isStreaming;

        return (
          <MessageItem
            key={msg.id || idx}
            message={msg}
            onRegenerate={isLastAssistant ? onRegenerate : undefined}
            onBranch={onBranch}
            onSelectCitation={onSelectCitation}
          />
        );
      })}

      {isStreaming && (
        <ActivityTimeline status={streamingStatus} stage={streamingStage} />
      )}
    </div>
  );
}
