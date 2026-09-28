import { Conversation } from "@/types/conversation";
import { ModelListResponse } from "@/types/model";
import { FileInfo, UserSettings, DocumentChunk } from "@/types/file";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ApiConversationSummary {
  id: string;
  title: string;
  model?: string;
  provider?: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  message_count?: number;
  last_message_preview?: string;
}

interface ApiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  parent_id?: string;
  branch_index?: number;
  metadata?: Record<string, unknown>;
}

interface ApiConversationDetail {
  id: string;
  title: string;
  model?: string;
  provider?: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  parent_conversation_id?: string;
  messages: ApiMessage[];
}

interface ApiModel {
  id: string;
  name: string;
  provider: string;
  category: "Local" | "Cloud";
  description?: string;
  context_window?: number;
  available: boolean;
  icon_type?: "ollama" | "default";
}

interface ApiFile {
  id: string;
  conversation_id?: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  formatted_size: string;
  created_at: string;
}

export async function fetchHealth(): Promise<{ status: string; services: { database: boolean; ollama: boolean } }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE_URL}/conversations`);
  if (!res.ok) throw new Error("Failed to load conversations");
  const data: ApiConversationSummary[] = await res.json();
  return data.map((c) => ({
    id: c.id,
    title: c.title,
    model: c.model,
    provider: c.provider,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    isPinned: Boolean(c.is_pinned),
    messageCount: c.message_count,
    lastMessagePreview: c.last_message_preview,
  }));
}

export async function createConversation(title: string = "New Chat", model?: string, provider?: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE_URL}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, model, provider }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  const data: ApiConversationDetail = await res.json();
  return {
    id: data.id,
    title: data.title,
    model: data.model,
    provider: data.provider,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isPinned: Boolean(data.is_pinned),
    messages: [],
  };
}

export async function fetchConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE_URL}/conversations/${id}`);
  if (!res.ok) throw new Error("Conversation not found");
  const data: ApiConversationDetail = await res.json();
  return {
    id: data.id,
    title: data.title,
    model: data.model,
    provider: data.provider,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isPinned: Boolean(data.is_pinned),
    parentConversationId: data.parent_conversation_id,
    messages: (data.messages || []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
      parentId: m.parent_id,
      branchIndex: m.branch_index,
      metadata: m.metadata || undefined,
    })),
  };
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to update conversation title");
}

export async function togglePinConversation(id: string, isPinned: boolean): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/conversations/${id}/pin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_pinned: isPinned }),
  });
  if (!res.ok) throw new Error("Failed to update conversation pin status");
}

export async function branchConversation(id: string, forkFromMessageId: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE_URL}/conversations/${id}/branch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fork_from_message_id: forkFromMessageId }),
  });
  if (!res.ok) throw new Error("Failed to branch conversation");
  const data: ApiConversationDetail = await res.json();
  return {
    id: data.id,
    title: data.title,
    model: data.model,
    provider: data.provider,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isPinned: false,
    parentConversationId: data.parent_conversation_id,
    messages: (data.messages || []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
      parentId: m.parent_id,
      branchIndex: m.branch_index,
      metadata: m.metadata || undefined,
    })),
  };
}

export async function exportConversation(id: string, format: "markdown" | "json" = "markdown"): Promise<string | Record<string, unknown>> {
  const res = await fetch(`${API_BASE_URL}/conversations/${id}/export?format=${format}`);
  if (!res.ok) throw new Error("Failed to export conversation");
  if (format === "json") {
    return res.json();
  }
  return res.text();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function testModelProvider(provider: string, baseUrl?: string, apiKey?: string): Promise<{
  status: string;
  provider: string;
  latency_ms: number;
  available_models: string[];
  details: string;
}> {
  const res = await fetch(`${API_BASE_URL}/models/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      base_url: baseUrl,
      api_key: apiKey,
    }),
  });
  if (!res.ok) throw new Error("Model test failed");
  return res.json();
}

export async function fetchModels(): Promise<ModelListResponse> {
  const res = await fetch(`${API_BASE_URL}/models`);
  if (!res.ok) throw new Error("Failed to fetch models");
  const data: {
    models: ApiModel[];
    default_model: string;
    default_provider: string;
    ollama_status: boolean;
  } = await res.json();

  return {
    models: data.models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      category: m.category,
      description: m.description,
      contextWindow: m.context_window,
      available: m.available,
      iconType: m.icon_type,
    })),
    defaultModel: data.default_model,
    defaultProvider: data.default_provider,
    ollamaStatus: data.ollama_status,
  };
}

export async function uploadFile(file: File, conversationId?: string): Promise<FileInfo> {
  const formData = new FormData();
  formData.append("file", file);
  if (conversationId) {
    formData.append("conversation_id", conversationId);
  }

  const res = await fetch(`${API_BASE_URL}/files/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "File upload failed");
  }
  const data = await res.json();
  const f: ApiFile = data.file;
  return {
    id: f.id,
    conversationId: f.conversation_id,
    filename: f.filename,
    originalName: f.original_name,
    mimeType: f.mime_type,
    size: f.size,
    formattedSize: f.formatted_size,
    createdAt: f.created_at,
  };
}

export async function fetchFiles(conversationId?: string): Promise<FileInfo[]> {
  const url = conversationId ? `${API_BASE_URL}/files?conversation_id=${conversationId}` : `${API_BASE_URL}/files`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to list files");
  const data: ApiFile[] = await res.json();
  return data.map((f) => ({
    id: f.id,
    conversationId: f.conversation_id,
    filename: f.filename,
    originalName: f.original_name,
    mimeType: f.mime_type,
    size: f.size,
    formattedSize: f.formatted_size,
    createdAt: f.created_at,
  }));
}

export async function fetchFileChunks(fileId: string): Promise<DocumentChunk[]> {
  const res = await fetch(`${API_BASE_URL}/files/${fileId}/chunks`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteFile(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/files/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete file");
}

export async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch(`${API_BASE_URL}/settings`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  const data = await res.json();
  return {
    theme: data.theme,
    defaultModel: data.default_model,
    defaultProvider: data.default_provider || "ollama",
    temperature: data.temperature,
    maxTokens: data.max_tokens,
    memoryEnabled: data.memory_enabled,
    ragEnabled: data.rag_enabled,
    toolsEnabled: data.tools_enabled,
    ollamaBaseUrl: data.ollama_base_url,
    ollamaStatus: data.ollama_status,
  };
}

export async function updateSettings(
  partial: Partial<UserSettings> & {
    ollama_base_url?: string;
    ollamaBaseUrl?: string;
  }
): Promise<UserSettings> {
  const payload: Record<string, unknown> = {};
  if (partial.theme !== undefined) payload.theme = partial.theme;
  if (partial.defaultModel !== undefined) payload.default_model = partial.defaultModel;
  if (partial.defaultProvider !== undefined) payload.default_provider = "ollama";
  if (partial.temperature !== undefined) payload.temperature = partial.temperature;
  if (partial.maxTokens !== undefined) payload.max_tokens = partial.maxTokens;
  if (partial.memoryEnabled !== undefined) payload.memory_enabled = partial.memoryEnabled;
  if (partial.ragEnabled !== undefined) payload.rag_enabled = partial.ragEnabled;
  if (partial.toolsEnabled !== undefined) payload.tools_enabled = partial.toolsEnabled;
  if (partial.ollama_base_url !== undefined) payload.ollama_base_url = partial.ollama_base_url;
  if (partial.ollamaBaseUrl !== undefined) payload.ollama_base_url = partial.ollamaBaseUrl;

  const res = await fetch(`${API_BASE_URL}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return fetchSettings();
}
