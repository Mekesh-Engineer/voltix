export interface FileInfo {
  id: string;
  conversationId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  formattedSize: string;
  createdAt: string;
}

export interface UserSettings {
  theme: "system" | "light" | "dark";
  defaultModel: string;
  defaultProvider: string;
  temperature: number;
  maxTokens: number;
  memoryEnabled: boolean;
  ragEnabled: boolean;
  toolsEnabled: boolean;
  ollamaBaseUrl: string;
  ollamaStatus?: boolean;
}

export interface DocumentChunk {
  chunk_id?: string;
  file_id: string;
  filename: string;
  text: string;
  score?: number;
  metadata?: Record<string, unknown>;
}
