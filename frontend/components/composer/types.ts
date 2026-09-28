export type ComposerMode =
  | "auto"
  | "chat"
  | "agent"
  | "research"
  | "code"
  | "data"
  | "rag"
  | "local";

export type PrivacyMode = "auto" | "local" | "cloud";

export type ExecutionProfile = "fast" | "balanced" | "deep" | "max";

export type ComposerState =
  | "idle"
  | "typing"
  | "attaching"
  | "ready"
  | "submitting"
  | "running"
  | "waiting_approval"
  | "paused"
  | "error"
  | "completed";

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: "suggested" | "knowledge" | "research" | "coding" | "data" | "files" | "compute" | "browser" | "artifacts" | "automation";
  riskLevel: "low" | "medium" | "high" | "irreversible";
  requiresConfirmation?: boolean;
  enabled: boolean;
  icon?: string;
}

export interface SlashCommand {
  cmd: string;
  label: string;
  desc: string;
  mode?: ComposerMode;
  profile?: ExecutionProfile;
  category: string;
  icon: string;
}

export interface MentionItem {
  id: string;
  label: string;
  sublabel: string;
  type: "agent" | "file" | "tool" | "model" | "workflow";
  icon?: string;
}

export interface ComposerSubmitPayload {
  message: string;
  mode: ComposerMode;
  profile: ExecutionProfile;
  model: string;
  provider: string;
  attachments: string[];
  toolsEnabled: boolean;
  enabledTools: string[];
  privacyMode: PrivacyMode;
}
