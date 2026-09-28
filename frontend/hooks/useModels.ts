"use client";

import { useState, useEffect, useCallback } from "react";
import { ModelInfo } from "@/types/model";
import { fetchModels } from "@/lib/api";
import { getStoredModel, setStoredModel } from "@/lib/storage";

const DEFAULT_FALLBACK_MODELS: ModelInfo[] = [
  {
    id: "aetherion",
    name: "Aetherion (Adaptive Fleet)",
    provider: "aetherion",
    category: "Cloud",
    description: "Unified Adaptive Agentic OS coordinating Nemotron, GPT-OSS, Gemma and Qwen engines.",
    contextWindow: 262144,
    available: true,
    iconType: "ollama",
  },
  {
    id: "nemotron-3-ultra:cloud",
    name: "Nemotron 3 Ultra",
    provider: "ollama",
    category: "Cloud",
    description: "LONG-HORIZON MASTER REASONER",
    contextWindow: 262144,
    available: true,
    iconType: "ollama",
  },
  {
    id: "nemotron-3-super:cloud",
    name: "Nemotron 3 Super",
    provider: "ollama",
    category: "Cloud",
    description: "MULTI-AGENT ORCHESTRATOR",
    contextWindow: 262144,
    available: true,
    iconType: "ollama",
  },
  {
    id: "gpt-oss:120b-cloud",
    name: "GPT-OSS 120B",
    provider: "ollama",
    category: "Cloud",
    description: "REASONING + TOOL ENGINE",
    contextWindow: 131072,
    available: true,
    iconType: "ollama",
  },
  {
    id: "gemma4:31b-cloud",
    name: "Gemma 4 31B",
    provider: "ollama",
    category: "Cloud",
    description: "MULTIMODAL + VISION + CODE",
    contextWindow: 262144,
    available: true,
    iconType: "ollama",
  },
  {
    id: "qwen2.5:7b",
    name: "Qwen 2.5 7B",
    provider: "ollama",
    category: "Local",
    description: "FAST GENERAL PURPOSE WORKER",
    contextWindow: 32768,
    available: true,
    iconType: "ollama",
  },
  {
    id: "qwen2.5:3b",
    name: "Qwen 2.5 3B",
    provider: "ollama",
    category: "Local",
    description: "ULTRA-LOW-LATENCY UTILITY",
    contextWindow: 32768,
    available: true,
    iconType: "ollama",
  },
];

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>(DEFAULT_FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>("aetherion");
  const [selectedProvider, setSelectedProvider] = useState<string>("aetherion");
  const [ollamaActive, setOllamaActive] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchModels();
      setModels(res.models);
      setOllamaActive(res.ollamaStatus);

      const stored = getStoredModel();
      if (stored.model && res.models.some((m) => m.id === stored.model)) {
        setSelectedModel(stored.model);
        setSelectedProvider(stored.provider || "ollama");
      } else {
        setSelectedModel(res.defaultModel || "aetherion");
        setSelectedProvider(res.defaultProvider || "aetherion");
      }
    } catch (err) {
      console.warn("Could not fetch models, using defaults:", err);
      setModels(DEFAULT_FALLBACK_MODELS);
      setSelectedModel("aetherion");
      setSelectedProvider("aetherion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetchModels();
        if (!ignore) {
          setModels(res.models);
          setOllamaActive(res.ollamaStatus);
          const stored = getStoredModel();
          if (stored.model && res.models.some((m) => m.id === stored.model)) {
            setSelectedModel(stored.model);
            setSelectedProvider(stored.provider || "ollama");
          } else {
            setSelectedModel(res.defaultModel);
            setSelectedProvider(res.defaultProvider);
          }
        }
      } catch (err) {
        console.warn("Could not fetch models initially:", err);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const selectModel = (modelId: string) => {
    const found = models.find((m) => m.id === modelId);
    if (found) {
      setSelectedModel(found.id);
      setSelectedProvider(found.provider);
      setStoredModel(found.id, found.provider);
    }
  };

  return {
    models,
    selectedModel,
    selectedProvider,
    ollamaActive,
    loading,
    selectModel,
    refreshModels: loadModels,
  };
}
