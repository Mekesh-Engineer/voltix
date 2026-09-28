"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Wrench, Globe, Calculator, Code, FileSearch } from "lucide-react";
import { ModelInfo } from "@/types/model";
import { FileInfo } from "@/types/file";
import { ModelSelector } from "./ModelSelector";
import { AttachmentButton } from "./AttachmentButton";
import { SendButton, StopButton } from "./SendButton";

interface ChatComposerProps {
  models: ModelInfo[];
  selectedModel: string;
  selectedProvider: string;
  ollamaActive: boolean;
  onSelectModel: (modelId: string) => void;
  isStreaming: boolean;
  onSendMessage: (message: string, attachments?: string[], toolsEnabled?: boolean) => void;
  onStop: () => void;
  attachments: FileInfo[];
  uploading: boolean;
  onUploadFile: (file: File) => Promise<unknown>;
  onRemoveAttachment: (fileId: string) => void;
}

export function ChatComposer({
  models,
  selectedModel,
  selectedProvider,
  ollamaActive,
  onSelectModel,
  isStreaming,
  onSendMessage,
  onStop,
  attachments,
  uploading,
  onUploadFile,
  onRemoveAttachment,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 180);
      textareaRef.current.style.height = `${Math.max(nextHeight, 52)}px`;
    }
  }, [input]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    const fileIds = attachments.map((a) => a.id);
    onSendMessage(text, fileIds, toolsEnabled);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setInput((prev) => (prev ? `${prev} [Voice Input Simulated]` : "How does machine learning work?"));
      }, 2500);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2">
      <div className="relative rounded-2xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-850 shadow-lg p-2.5 transition-all focus-within:border-blue-500/70 dark:focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/15">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="w-full px-2.5 py-1 bg-transparent resize-none border-none outline-none text-stone-900 dark:text-neutral-100 placeholder-stone-400 dark:placeholder-neutral-500 text-[15px] leading-relaxed [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-stone-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600"
          style={{ minHeight: "52px", maxHeight: "180px" }}
        />

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-neutral-750/70 gap-2 flex-wrap">
          {/* Left group: Attachments & Tools */}
          <div className="flex items-center gap-1">
            <AttachmentButton
              attachments={attachments}
              uploading={uploading}
              onUpload={onUploadFile}
              onRemove={onRemoveAttachment}
            />

            {/* Tools Dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none ${
                  toolsEnabled
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                    : "text-stone-500 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-neutral-800"
                }`}
                title="Toggle AI Tools & Capabilities"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Tools</span>
              </button>

              {toolsOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-64 rounded-xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xl z-50 p-2 text-xs">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-neutral-400 border-b border-stone-100 dark:border-neutral-700 mb-1">
                    <span>Autonomous Tools</span>
                    <button
                      type="button"
                      onClick={() => setToolsEnabled(!toolsEnabled)}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        toolsEnabled ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "bg-stone-100 text-stone-600 dark:bg-neutral-700"
                      }`}
                    >
                      {toolsEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-stone-700 dark:text-neutral-300">
                      <Calculator className="w-4 h-4 text-emerald-500" />
                      <span>Math AST Calculator</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 text-stone-700 dark:text-neutral-300">
                      <Code className="w-4 h-4 text-blue-500" />
                      <span>Python Sandbox</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 text-stone-700 dark:text-neutral-300">
                      <FileSearch className="w-4 h-4 text-purple-500" />
                      <span>RAG Document Search</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 text-stone-700 dark:text-neutral-300">
                      <Globe className="w-4 h-4 text-amber-500" />
                      <span>Web Knowledge Grounding</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right group: Model selector, Voice, Send/Stop */}
          <div className="flex items-center gap-2">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              selectedProvider={selectedProvider}
              ollamaActive={ollamaActive}
              onSelectModel={onSelectModel}
            />

            {/* Voice record simulation */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-lg transition-colors focus:outline-none ${
                isRecording
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-stone-500 hover:text-stone-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800"
              }`}
              title={isRecording ? "Recording voice message..." : "Voice input"}
            >
              <Mic className="w-4 h-4" />
            </button>

            {isStreaming ? (
              <StopButton onClick={onStop} />
            ) : (
              <SendButton disabled={!input.trim()} onClick={handleSend} />
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center text-stone-400 dark:text-neutral-500 mt-2">
        Preline AI Chat can make mistakes. Verify important info.
      </p>
    </div>
  );
}
