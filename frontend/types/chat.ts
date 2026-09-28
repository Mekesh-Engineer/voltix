export interface CitationItem {
  id: number;
  source: string;
  filename: string;
  snippet: string;
  score: number;
}

export interface ToolCallItem {
  tool: string;
  input: Record<string, unknown>;
  output?: string;
  duration_ms?: number;
}

export interface AgentStepUI {
  id: string;
  step_number: number;
  agent_type: string;
  title: string;
  description: string;
  tool_name?: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
  duration_ms: number;
  output?: unknown;
  verification?: {
    passed: boolean;
    confidence_score?: number;
    failures?: string[];
    checks?: Record<string, boolean>;
  } | unknown;
}

export interface AgentArtifactUI {
  artifact_id?: string;
  name: string;
  file_type: string;
  file_path?: string;
  size_bytes: number;
  version?: number;
}

export interface AgentPlanUI {
  id?: string;
  goal?: string;
  steps: AgentStepUI[];
}

export interface AttachmentMetadata {
  id: string;
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  formattedSize?: string;
  isImage?: boolean;
  url?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  parentId?: string;
  branchIndex?: number;
  metadata?: {
    citations?: CitationItem[];
    tokens?: number;
    error?: boolean;
    tool_calls?: ToolCallItem[];
    ttft_ms?: number;
    tokens_per_sec?: number;
    agent_run_id?: string;
    plan?: AgentPlanUI;
    agent_steps?: AgentStepUI[];
    artifacts?: AgentArtifactUI[];
    verification?: unknown;
    phase?: string;
    model?: string;
    attachments?: AttachmentMetadata[];
    images?: string[];
    has_images?: boolean;
  };
}

export type StreamingEvent =
  | {
      type: "status";
      status: string;
      stage?: "rag" | "tool" | "reasoning" | "llm";
    }
  | { type: "token"; content: string }
  | { type: "citations"; citations: CitationItem[] }
  | {
      type: "tool_call";
      tool: string;
      input: Record<string, unknown>;
      output?: string;
      duration_ms?: number;
    }
  | {
      type: "tool_output";
      tool?: string;
      output?: string;
      duration_ms?: number;
    }
  | {
      type: "task_created";
      task_id?: string;
      profile?: string;
    }
  | {
      type: "tool_started";
      tool?: string;
    }
  | {
      type: "verification_started";
    }
  | {
      type: "verification_result";
      passed?: boolean;
      confidence?: number;
      feedback?: string;
    }
  | {
      type: "agent_started";
      run_id: string;
      goal: string;
    }
  | {
      type: "plan_created";
      run_id: string;
      plan: AgentPlanUI;
    }
  | {
      type: "model_selected";
      model: string;
    }
  | {
      type: "step_started";
      step_id?: string;
      step?: AgentStepUI;
    }
  | {
      type: "verification_completed";
      step_id?: string;
      verification?: unknown;
    }
  | {
      type: "tool_failed";
      step_id?: string;
      message?: string;
    }
  | {
      type: "approval_requested";
      step_id?: string;
      approval_id: string;
      risk_level: string;
      reason?: string;
      tool_name?: string;
      action_summary?: string;
      parameters?: Record<string, unknown>;
    }
  | {
      type: "artifact_created";
      artifact: AgentArtifactUI;
    }
  | {
      type: "metrics";
      time_to_first_token_ms: number;
      total_tokens: number;
      tokens_per_sec: number;
    }
  | {
      type: "done";
      message_id: string;
      conversation_id: string;
      title?: string;
    }
  | { type: "error"; message: string };

export interface SendMessageOptions {
  message: string;
  conversationId?: string;
  model?: string;
  provider?: string;
  attachments?: string[];
  attachmentDetails?: AttachmentMetadata[];
  images?: string[];
  toolsEnabled?: boolean;
  mode?: string;
  tools?: string[];
  profile?: "fast" | "balanced" | "deep" | "max";
  privacyMode?: "auto" | "local" | "cloud";
}

