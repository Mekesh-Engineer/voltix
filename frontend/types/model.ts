export interface ModelInfo {
  id: string;
  name: string;
  provider: string; // "ollama", "assistant"
  category: "Local" | "Cloud";
  description?: string;
  contextWindow?: number;
  available: boolean;
  iconType?: "ollama" | "default";
}

export interface ModelListResponse {
  models: ModelInfo[];
  defaultModel: string;
  defaultProvider: string;
  ollamaStatus: boolean;
}

export interface ProviderHealth {
  status: "online" | "offline" | "unconfigured";
  provider: string;
  latency_ms: number;
  available_models: string[];
  details?: string;
}
