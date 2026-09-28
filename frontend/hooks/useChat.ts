"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  AgentArtifactUI,
  AgentPlanUI,
  AgentStepUI,
  ChatMessage,
  CitationItem,
  SendMessageOptions,
  ToolCallItem,
} from "@/types/chat";
import { fetchConversation, branchConversation } from "@/lib/api";
import { streamChat } from "@/lib/streaming";
import { PendingApprovalUI } from "@/hooks/useAgent";

export function useChat(
  initialConversationId?: string,
  onConversationCreated?: (id: string, title?: string) => void
) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [streamingStage, setStreamingStage] = useState<"rag" | "tool" | "reasoning" | "llm" | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<CitationItem[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalUI | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const [prevId, setPrevId] = useState(initialConversationId);

  if (initialConversationId !== prevId) {
    setPrevId(initialConversationId);
    setConversationId(initialConversationId);
    if (!initialConversationId) {
      setMessages([]);
    }
  }

  // Load messages if conversationId changes
  useEffect(() => {
    let ignore = false;
    if (initialConversationId) {
      fetchConversation(initialConversationId)
        .then((conv) => {
          if (!ignore) {
            setMessages(conv.messages || []);
          }
        })
        .catch((err: unknown) => {
          console.warn("Could not fetch conversation details:", err);
        });
    }
    return () => {
      ignore = true;
    };
  }, [initialConversationId]);

  const respondApproval = useCallback(async (approved: boolean) => {
    if (!pendingApproval) return;
    try {
      await fetch(`/api/agent/approvals/${pendingApproval.approval_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      setPendingApproval(null);
    } catch (e) {
      console.error("Failed to respond to approval:", e);
      setPendingApproval(null);
    }
  }, [pendingApproval]);

  const sendMessage = useCallback(
    async (options: SendMessageOptions) => {
      const text = options.message.trim();
      const hasAttachments = Boolean(options.attachments && options.attachments.length > 0);
      const hasImages = Boolean(options.images && options.images.length > 0);
      if ((!text && !hasAttachments && !hasImages) || isStreaming) return;

      setError(null);
      setCitations([]);
      setStreamingStatus("Thinking...");
      setStreamingStage(undefined);
      setIsStreaming(true);

      const userMessageId = "user-" + Date.now();
      const userMessage: ChatMessage = {
        id: userMessageId,
        conversationId: conversationId || "",
        role: "user",
        content: text || (hasImages || hasAttachments ? "Analyze attached image/document" : ""),
        createdAt: new Date().toISOString(),
        metadata: {
          attachments: options.attachmentDetails || (options.attachments ? options.attachments.map((id) => ({ id })) : []),
          images: options.images,
          has_images: hasImages || (options.attachmentDetails && options.attachmentDetails.some((a) => a.isImage)),
        },
      };

      const assistantMessageId = "asst-" + Date.now();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        conversationId: conversationId || "",
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        metadata: {},
      };


      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      let accumulatedContent = "";
      const currentToolCalls: ToolCallItem[] = [];
      let currentPlan: AgentPlanUI | undefined = undefined;
      let currentSteps: AgentStepUI[] = [];
      const currentArtifacts: AgentArtifactUI[] = [];
      let currentModel: string | undefined = options.model;
      let currentRunId: string | undefined = undefined;

      abortControllerRef.current = streamChat(
        {
          ...options,
          conversationId,
        },
        {
          onToken: (token: string) => {
            setStreamingStatus(null);
            accumulatedContent += token;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              )
            );
          },
          onCitations: (newCitations: CitationItem[]) => {
            setCitations(newCitations);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, metadata: { ...msg.metadata, citations: newCitations } }
                  : msg
              )
            );
          },
          onStatus: (status: string, stage?: "rag" | "tool" | "reasoning" | "llm") => {
            setStreamingStatus(status);
            setStreamingStage(stage);
          },
          onToolCall: (toolCall: ToolCallItem) => {
            currentToolCalls.push(toolCall);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        tool_calls: [...currentToolCalls],
                      },
                    }
                  : msg
              )
            );
          },
          onAgentStarted: (payload) => {
            currentRunId = payload.run_id;
            setStreamingStatus(`Planning objective: ${payload.goal}`);
            setStreamingStage("reasoning");
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        agent_run_id: currentRunId,
                        phase: "PLANNING",
                      },
                    }
                  : msg
              )
            );
          },
          onPlanCreated: (payload) => {
            currentPlan = payload.plan;
            currentSteps = payload.plan?.steps ? [...payload.plan.steps] : [];
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        plan: currentPlan,
                        agent_steps: [...currentSteps],
                        phase: "EXECUTING",
                      },
                    }
                  : msg
              )
            );
          },
          onModelSelected: (modelName) => {
            currentModel = modelName;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        model: currentModel,
                      },
                    }
                  : msg
              )
            );
          },
          onStepStarted: (payload) => {
            if (payload.step?.id) {
              currentSteps = currentSteps.map((s) =>
                s.id === payload.step?.id ? { ...s, status: "RUNNING" } : s
              );
            }
            setStreamingStatus(`Step ${payload.step?.step_number || ""}: ${payload.step?.title || ""}`);
            setStreamingStage("tool");
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        agent_steps: [...currentSteps],
                        phase: `STEP ${payload.step?.step_number || ""}: ${payload.step?.title || ""}`,
                      },
                    }
                  : msg
              )
            );
          },
          onVerificationCompleted: (payload) => {
            if (payload.step_id) {
              currentSteps = currentSteps.map((s) =>
                s.id === payload.step_id
                  ? { ...s, status: "COMPLETED", verification: payload.verification }
                  : s
              );
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        agent_steps: [...currentSteps],
                        verification: payload.verification,
                      },
                    }
                  : msg
              )
            );
          },
          onToolFailed: (payload) => {
            if (payload.step_id) {
              currentSteps = currentSteps.map((s) =>
                s.id === payload.step_id ? { ...s, status: "FAILED" } : s
              );
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        agent_steps: [...currentSteps],
                      },
                    }
                  : msg
              )
            );
          },
          onApprovalRequested: (appr) => {
            setPendingApproval({
              approval_id: appr.approval_id,
              run_id: currentRunId,
              tool_name: appr.tool_name || "system.action",
              action_summary: appr.action_summary || "Tool execution requiring approval",
              reason: appr.reason || "Action policy requires authorization",
              risk_level: appr.risk_level || "medium",
              parameters: appr.parameters,
            });
          },
          onArtifactCreated: (art) => {
            currentArtifacts.push(art);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        artifacts: [...currentArtifacts],
                      },
                    }
                  : msg
              )
            );
          },
          onMetrics: (metrics) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        ttft_ms: metrics.time_to_first_token_ms,
                        tokens_per_sec: metrics.tokens_per_sec,
                        tokens: metrics.total_tokens,
                      },
                    }
                  : msg
              )
            );
          },
          onDone: (doneEvent) => {
            setIsStreaming(false);
            setStreamingStatus(null);
            setStreamingStage(undefined);
            setPendingApproval(null);
            if (doneEvent.conversationId && doneEvent.conversationId !== conversationId) {
              setConversationId(doneEvent.conversationId);
              onConversationCreated?.(doneEvent.conversationId, doneEvent.title);
            }
          },
          onError: (errMsg: string) => {
            setIsStreaming(false);
            setStreamingStatus(null);
            setStreamingStage(undefined);
            setError(errMsg);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: msg.content || "An error occurred during response generation.",
                      metadata: { ...msg.metadata, error: true },
                    }
                  : msg
              )
            );
          },
        }
      );
    },
    [conversationId, isStreaming, onConversationCreated]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingStatus(null);
    setStreamingStage(undefined);
  }, []);

  const regenerateResponse = useCallback(
    (promptText: string, model?: string, provider?: string) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant") {
          return prev.slice(0, -1);
        }
        return prev;
      });
      sendMessage({
        message: promptText,
        model,
        provider,
      });
    },
    [sendMessage]
  );

  const branchFromMessage = useCallback(
    async (messageId: string) => {
      try {
        if (!conversationId) return;
        const newConv = await branchConversation(conversationId, messageId);
        setConversationId(newConv.id);
        setMessages(newConv.messages || []);
        onConversationCreated?.(newConv.id, newConv.title);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fork branch.";
        setError(msg);
      }
    },
    [conversationId, onConversationCreated]
  );

  return {
    conversationId,
    messages,
    isStreaming,
    streamingStatus,
    streamingStage,
    error,
    citations,
    pendingApproval,
    respondApproval,
    sendMessage,
    stopGeneration,
    regenerateResponse,
    branchFromMessage,
  };
}
