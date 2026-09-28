import {
  AgentArtifactUI,
  AgentPlanUI,
  AgentStepUI,
  CitationItem,
  SendMessageOptions,
  StreamingEvent,
  ToolCallItem,
} from "@/types/chat";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onCitations?: (citations: CitationItem[]) => void;
  onStatus?: (status: string, stage?: "rag" | "tool" | "reasoning" | "llm") => void;
  onToolCall?: (toolCall: ToolCallItem) => void;
  onAgentStarted?: (payload: { run_id: string; goal: string }) => void;
  onPlanCreated?: (payload: { run_id: string; plan: AgentPlanUI }) => void;
  onModelSelected?: (model: string) => void;
  onStepStarted?: (payload: { step_id?: string; step?: AgentStepUI }) => void;
  onVerificationCompleted?: (payload: { step_id?: string; verification?: unknown }) => void;
  onToolFailed?: (payload: { step_id?: string; message?: string }) => void;
  onApprovalRequested?: (approval: {
    step_id?: string;
    approval_id: string;
    risk_level: string;
    reason?: string;
    tool_name?: string;
    action_summary?: string;
    parameters?: Record<string, unknown>;
  }) => void;
  onArtifactCreated?: (artifact: AgentArtifactUI) => void;
  onMetrics?: (metrics: {
    time_to_first_token_ms: number;
    total_tokens: number;
    tokens_per_sec: number;
  }) => void;
  onDone?: (event: { messageId: string; conversationId: string; title?: string }) => void;
  onError?: (error: string) => void;
}

export function streamChat(
  options: SendMessageOptions,
  callbacks: StreamCallbacks
): AbortController {
  const abortController = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: options.conversationId,
          message: options.message,
          model: options.model,
          provider: options.provider,
          attachments: options.attachments || [],
          images: options.images || [],
          tools_enabled: options.toolsEnabled ?? true,
          mode: options.mode || "auto",
          tools: options.tools || [],
          execution_profile: options.profile || "balanced",
          privacy_mode: options.privacyMode || "auto",
          stream: true,
        }),
        signal: abortController.signal,
      });


      if (!response.ok) {
        const errText = await response.text().catch(() => "Stream request failed");
        callbacks.onError?.(errText);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError?.("ReadableStream is not supported by this browser.");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const dataJson = trimmed.slice(6);
          try {
            const event: StreamingEvent = JSON.parse(dataJson);

            switch (event.type) {
              case "token":
                if (event.content) callbacks.onToken(event.content);
                break;
              case "citations":
                if (event.citations) callbacks.onCitations?.(event.citations);
                break;
              case "status":
                if (event.status) callbacks.onStatus?.(event.status, event.stage);
                break;
              case "tool_call":
              case "tool_output": // Aetherion also emits tool_output
                callbacks.onToolCall?.({
                  tool: (event as {tool?: string; type: string}).tool || "tool",
                  input: (event as {input?: Record<string, unknown>}).input || {},
                  output: (event as {output?: string}).output,
                  duration_ms: (event as {duration_ms?: number}).duration_ms,
                });
                break;
              case "task_created":
                // Aetherion task created: treat as status update
                callbacks.onStatus?.(
                  `Task initialized: ${(event as {profile?: string}).profile || "balanced"} mode`,
                  "reasoning"
                );
                break;
              case "tool_started":
                // Tool starting: update status
                callbacks.onStatus?.(
                  `Running: ${(event as {tool?: string}).tool || "tool"}...`,
                  "tool"
                );
                break;
              case "verification_started":
                callbacks.onStatus?.("Verifying results...", "reasoning");
                break;
              case "verification_result":
                // Aetherion emits verification_result, map to verification_completed
                callbacks.onVerificationCompleted?.({
                  verification: (event as {passed?: boolean; confidence?: number; feedback?: string})
                });
                break;
              case "agent_started":
                callbacks.onAgentStarted?.({ run_id: event.run_id, goal: event.goal });
                break;
              case "plan_created":
                callbacks.onPlanCreated?.({ run_id: event.run_id, plan: event.plan });
                break;
              case "model_selected":
                callbacks.onModelSelected?.(event.model);
                break;
              case "step_started":
                callbacks.onStepStarted?.({ step_id: event.step_id, step: event.step });
                break;
              case "verification_completed":
                callbacks.onVerificationCompleted?.({ step_id: event.step_id, verification: event.verification });
                break;
              case "tool_failed":
                callbacks.onToolFailed?.({ step_id: event.step_id, message: event.message });
                break;
              case "approval_requested":
                callbacks.onApprovalRequested?.({
                  step_id: event.step_id,
                  approval_id: event.approval_id,
                  risk_level: event.risk_level,
                  reason: event.reason,
                  tool_name: event.tool_name,
                  action_summary: event.action_summary,
                  parameters: event.parameters,
                });
                break;
              case "artifact_created":
                if (event.artifact) callbacks.onArtifactCreated?.(event.artifact);
                break;
              case "metrics":
                callbacks.onMetrics?.({
                  time_to_first_token_ms: event.time_to_first_token_ms,
                  total_tokens: event.total_tokens,
                  tokens_per_sec: event.tokens_per_sec,
                });
                break;
              case "done":
                callbacks.onDone?.({
                  messageId: event.message_id || "",
                  conversationId: event.conversation_id || "",
                  title: event.title,
                });
                break;
              case "error":
                if (event.message) callbacks.onError?.(event.message);
                break;
              default:
                // silently ignore unrecognized event types
                break;
            }
          } catch (e) {
            console.warn("Failed to parse SSE line:", trimmed, e);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        callbacks.onStatus?.("Generation stopped.");
      } else {
        const msg = err instanceof Error ? err.message : "An unexpected streaming error occurred.";
        callbacks.onError?.(msg);
      }
    }
  })();

  return abortController;
}
