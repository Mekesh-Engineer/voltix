"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ChatMessage, CitationItem } from "@/types/chat";
import { ModelInfo } from "@/types/model";
import { FileInfo } from "@/types/file";
import { EmptyState } from "./EmptyState";
import { MessageList } from "./MessageList";
import { ScrollToBottom } from "./ScrollToBottom";
import { Composer } from "@/components/composer/Composer";
import { PendingApprovalUI } from "@/hooks/useAgent";
import { ComposerMode, ExecutionProfile } from "@/components/composer/types";

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingStatus: string | null;
  streamingStage?: "rag" | "tool" | "reasoning" | "llm";
  onSendMessage: (
    message: string,
    attachments?: string[],
    toolsEnabled?: boolean,
    mode?: ComposerMode,
    tools?: string[],
    profile?: ExecutionProfile
  ) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onBranch: (messageId: string) => void;
  onSelectCitation: (citation: CitationItem) => void;
  models: ModelInfo[];
  selectedModel: string;
  selectedProvider: string;
  ollamaActive: boolean;
  onSelectModel: (modelId: string) => void;
  attachments: FileInfo[];
  uploading: boolean;
  onUploadFile: (file: File) => Promise<unknown>;
  onRemoveAttachment: (fileId: string) => void;
  pendingApproval?: PendingApprovalUI | null;
  onRespondApproval?: (approved: boolean) => void;
  onPause?: () => void;
  onResume?: () => void;
  currentTokens?: number;
  maxTokens?: number;
}

export function ChatWorkspace({
  messages,
  isStreaming,
  streamingStatus,
  streamingStage,
  onSendMessage,
  onStop,
  onRegenerate,
  onBranch,
  onSelectCitation,
  models,
  selectedModel,
  selectedProvider,
  ollamaActive,
  onSelectModel,
  attachments,
  uploading,
  onUploadFile,
  onRemoveAttachment,
  pendingApproval,
  onRespondApproval,
  onPause,
  onResume,
  currentTokens = 0,
  maxTokens = 8192,
}: ChatWorkspaceProps) {
  const [composerInput, setComposerInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      setUserScrolledUp(false);
      setShowScrollBottom(false);
    }
  }, []);

  // Monitor scroll position
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    if (distanceFromBottom > 120) {
      setUserScrolledUp(true);
      setShowScrollBottom(true);
    } else {
      setUserScrolledUp(false);
      setShowScrollBottom(false);
    }
  };

  // Auto-scroll when new messages arrive unless scrolled up
  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom(false);
    }
  }, [messages, isStreaming, userScrolledUp, scrollToBottom]);

  const activeModelObj = models.find((m) => m.id === selectedModel);

  return (
    <div className="relative flex flex-1 flex-col h-full overflow-hidden bg-stone-50/50 dark:bg-neutral-950">
      {/* Scrollable Message Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        {messages.length === 0 ? (
          <EmptyState
            onSelectPrompt={(prompt) => {
              setComposerInput(prompt);
            }}
            activeModelName={activeModelObj?.name}
          />
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingStatus={streamingStatus}
            streamingStage={streamingStage}
            onRegenerate={onRegenerate}
            onBranch={onBranch}
            onSelectCitation={onSelectCitation}
          />
        )}
      </div>

      {/* Floating Scroll to Bottom Indicator */}
      <ScrollToBottom
        visible={showScrollBottom}
        onClick={() => scrollToBottom(true)}
        hasNewContent={isStreaming}
      />

      {/* Composer at Bottom */}
      <Composer
        models={models}
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
        ollamaActive={ollamaActive}
        onSelectModel={onSelectModel}
        isStreaming={isStreaming}
        streamingStatus={streamingStatus}
        onSendMessage={onSendMessage}
        onStop={onStop}
        onPause={onPause}
        onResume={onResume}
        attachments={attachments}
        uploading={uploading}
        onUploadFile={onUploadFile}
        onRemoveAttachment={onRemoveAttachment}
        input={composerInput}
        setInput={setComposerInput}
        pendingApproval={pendingApproval}
        onRespondApproval={onRespondApproval}
        currentTokens={currentTokens}
        maxTokens={maxTokens}
      />
    </div>
  );
}
