"use client";

import { useState, useEffect, useCallback } from "react";
import { Conversation } from "@/types/conversation";
import {
  fetchConversations,
  createConversation as apiCreateConversation,
  updateConversationTitle as apiUpdateTitle,
  togglePinConversation as apiTogglePin,
  deleteConversation as apiDeleteConversation,
} from "@/lib/api";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConversations();
      setConversations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load conversations";
      console.warn("Could not load conversations from server:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setError(null);
        const data = await fetchConversations();
        if (!ignore) {
          setConversations(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load conversations";
          setError(msg);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const createChat = async (title?: string, model?: string, provider?: string): Promise<Conversation> => {
    try {
      const newConv = await apiCreateConversation(title || "New Chat", model, provider);
      setConversations((prev) => [newConv, ...prev]);
      return newConv;
    } catch (err: unknown) {
      console.error("Failed to create chat:", err);
      // Fallback local conversation
      const fallback: Conversation = {
        id: "conv-" + Date.now(),
        title: title || "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      setConversations((prev) => [fallback, ...prev]);
      return fallback;
    }
  };

  const renameChat = async (id: string, newTitle: string) => {
    try {
      await apiUpdateTitle(id, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error("Failed to rename chat:", err);
    }
  };

  const pinChat = async (id: string, isPinned: boolean) => {
    try {
      await apiTogglePin(id, isPinned);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isPinned } : c))
      );
    } catch (err) {
      console.error("Failed to toggle pin chat:", err);
    }
  };

  const deleteChat = async (id: string) => {
    try {
      await apiDeleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  return {
    conversations,
    loading,
    error,
    refreshConversations: loadConversations,
    createChat,
    renameChat,
    pinChat,
    deleteChat,
  };
}
