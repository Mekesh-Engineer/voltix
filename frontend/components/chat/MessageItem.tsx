"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  GitFork,
  Calculator,
  Terminal,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  X,
} from "lucide-react";
import { ChatMessage, CitationItem, ToolCallItem } from "@/types/chat";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { VoltixSymbol } from "@/components/ui/Icons";
import { MessageActions } from "./MessageActions";
import { AgentExecutionBlock } from "./AgentExecutionBlock";
import { copyToClipboard } from "@/lib/utils";

interface MessageItemProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onBranch?: (messageId: string) => void;
  onSelectCitation?: (citation: CitationItem) => void;
}

export function MessageItem({
  message,
  onRegenerate,
  onBranch,
  onSelectCitation,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [toolExpanded, setToolExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:8000";

  const handleCopyUserMessage = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    const attachments = message.metadata?.attachments || [];

    return (
      <>
        <div className="flex justify-end my-4 group animate-message">
          <div className="max-w-[85%] md:max-w-[75%] flex flex-col items-end">
            {/* Render Attached Images and Documents */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 justify-end">
                {attachments.map((att, idx) => {
                  const isImage =
                    att.isImage ||
                    (att.mimeType && att.mimeType.startsWith("image/")) ||
                    /\.(png|jpg|jpeg|webp|gif|bmp|svg|avif)$/i.test(att.originalName || att.filename || "");
                  const imageUrl = `${API_BASE}/api/files/${att.id}/content`;

                  if (isImage) {
                    return (
                      <div
                        key={att.id || idx}
                        onClick={() =>
                          setPreviewImage({
                            url: imageUrl,
                            name: att.originalName || "Attached Image",
                          })
                        }
                        className="group/img relative rounded-xl overflow-hidden border border-blue-200/80 dark:border-blue-800/60 shadow-xs cursor-zoom-in bg-stone-100 dark:bg-stone-800 max-w-[200px] max-h-[160px]"
                      >
                        <img
                          src={imageUrl}
                          alt={att.originalName || "Attached Image"}
                          className="w-full h-full object-cover max-h-[160px] group-hover/img:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-stone-900/70 backdrop-blur-xs px-2 py-0.5 text-[10px] text-white truncate">
                          {att.originalName || "Image"}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={att.id || idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-300 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[150px] font-medium">{att.originalName || "Document"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative px-4 py-2.5 rounded-2xl rounded-tr-xs bg-blue-50/70 border border-blue-100/90 dark:bg-blue-950/25 dark:border-blue-900/40 text-stone-900 dark:text-neutral-100 text-[14.5px] leading-relaxed shadow-2xs">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="flex items-center gap-2 mt-1 mr-1 text-stone-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {onBranch && (
                <button
                  onClick={() => onBranch(message.id)}
                  type="button"
                  className="inline-flex items-center gap-1 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 text-stone-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-colors text-xs"
                  title="Branch conversation from here"
                >
                  <GitFork className="w-3 h-3 text-blue-500" />
                  <span className="text-[11px]">Branch</span>
                </button>
              )}
              <button
                onClick={handleCopyUserMessage}
                type="button"
                className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors text-xs"
                title="Copy prompt"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-stone-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Lightbox Modal for User Messages */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[85vh] bg-stone-900 rounded-2xl overflow-hidden shadow-2xl border border-stone-700/80 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-stone-800/90 border-b border-stone-700">
                <span className="text-sm font-medium text-stone-200 truncate">
                  {previewImage.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
                  title="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 flex items-center justify-center overflow-auto max-h-[75vh]">
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="max-h-[70vh] w-auto object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }


  const citations = message.metadata?.citations;
  const toolCalls = message.metadata?.tool_calls;
  const agentSteps = message.metadata?.agent_steps;
  const plan = message.metadata?.plan;
  const artifacts = message.metadata?.artifacts;
  const ttft = message.metadata?.ttft_ms;
  const tps = message.metadata?.tokens_per_sec;

  return (
    <div className="flex gap-3 my-6 group animate-message">
      <div className="shrink-0 pt-0.5">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
          <VoltixSymbol className="w-3.5 h-3.5 fill-current" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* Header with Title and Metrics (Section 18) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs tracking-tight text-stone-900 dark:text-white flex items-center gap-1.5">
              <span>✦</span>
              <span>Aetherion</span>
              <span className="font-normal text-[11px] text-stone-400 dark:text-neutral-500 hidden sm:inline">
                Adaptive Fleet
              </span>
            </span>
            {message.branchIndex && message.branchIndex > 0 ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/50">
                Fork #{message.branchIndex}
              </span>
            ) : null}
            {message.metadata?.error && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                Error
              </span>
            )}
          </div>

          {/* Performance metrics pill */}
          {(ttft !== undefined || tps !== undefined) && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400 dark:text-neutral-500">
              {ttft !== undefined && (
                <span className="flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  {ttft}ms TTFT
                </span>
              )}
              {tps !== undefined && <span>{tps} tok/s</span>}
            </div>
          )}
        </div>

        {/* Cited Documents Tag Strip */}
        {citations && citations.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <span className="text-[11px] text-stone-400 dark:text-neutral-500 font-medium mr-1">
              Sources:
            </span>
            {citations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCitation?.(c)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 hover:border-blue-300 hover:bg-blue-50/50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-blue-700 transition-all shadow-2xs"
                title="Click to inspect source passage in sidebar"
              >
                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  [{c.id}]
                </span>
                <span className="truncate max-w-[140px] font-medium">{c.filename}</span>
                <span className="text-[10px] text-stone-400 dark:text-neutral-500">
                  {Math.round(c.score * 100)}%
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Chat-Native Autonomous Agent Execution Block */}
        {((agentSteps && agentSteps.length > 0) || plan) && (
          <AgentExecutionBlock
            plan={plan}
            steps={agentSteps}
            artifacts={artifacts}
            model={message.metadata?.model}
            phase={message.metadata?.phase}
            isStreaming={
              message.metadata?.phase !== undefined &&
              !["COMPLETED", "FAILED", "CANCELLED", undefined].includes(
                typeof message.metadata?.phase === "string" &&
                  message.metadata.phase.toUpperCase() === message.metadata.phase
                  ? message.metadata.phase
                  : undefined
              )
            }
          />
        )}

        {/* Autonomous Tool Execution Cards */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="space-y-2 mb-3">
            {toolCalls.map((tc: ToolCallItem, idx: number) => {
              const isCalc = tc.tool === "calculator" || tc.tool === "math.calculate";
              const ToolIcon = isCalc ? Calculator : Terminal;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-stone-200 bg-stone-50/80 p-2.5 text-xs dark:border-neutral-800 dark:bg-neutral-850"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setToolExpanded((v) => !v)}
                  >
                    <div className="flex items-center gap-2">
                      <ToolIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-stone-800 dark:text-neutral-200 uppercase tracking-wider text-[11px]">
                        Tool · {tc.tool}
                      </span>
                      {tc.duration_ms !== undefined && (
                        <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 px-2 py-0.2 text-[10px] font-mono text-blue-700 dark:text-blue-300">
                          ✓ {tc.duration_ms}ms
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-stone-400">
                      {toolExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-stone-700 dark:text-neutral-300 font-mono text-xs">
                    <span className="text-stone-500 dark:text-neutral-400">Result:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {tc.output}
                    </span>
                  </div>

                  {toolExpanded && (
                    <div className="mt-2 pt-2 border-t border-stone-200 dark:border-neutral-700 text-[11px] font-mono whitespace-pre-wrap text-stone-600 dark:text-neutral-400">
                      Input: {JSON.stringify(tc.input, null, 2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Markdown Rendered Content */}
        {message.content ? (
          <MarkdownRenderer content={message.content} />
        ) : null}

        {/* Actions Toolbar */}
        <div className="flex items-center justify-between mt-2">
          <MessageActions content={message.content} onRegenerate={onRegenerate} />

          {onBranch && (
            <button
              type="button"
              onClick={() => onBranch(message.id)}
              className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
              title="Branch conversation from this turn"
            >
              <GitFork className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Branch</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
