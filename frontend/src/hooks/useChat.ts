"use client";

import { useState, useCallback, useRef } from "react";
import { apiChatStream, apiFetch } from "@/lib/api";

export interface Source {
  document_id: string;
  title: string;
  page_number: number | null;
  similarity: number;
  snippet: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
  images?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("my-own-model");
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiFetch<Conversation[]>("/api/chat/conversations");
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const data = await apiFetch<{
        id: string;
        title: string;
        messages: Array<{
          id: string;
          role: string;
          content: string;
          sources?: Source[];
          images?: string[];
        }>;
      }>(`/api/chat/conversations/${id}`);

      setConversationId(id);
      setMessages(
        data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources,
          images: m.images,
        }))
      );
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      if (isStreaming) return;

      let base64Images: string[] = [];
      if (files && files.length > 0) {
        try {
          base64Images = await Promise.all(files.map(convertToBase64));
        } catch (e) {
          console.error("Failed to read image files:", e);
        }
      }

      const userMsg: Message = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content,
        images: base64Images.length > 0 ? base64Images : undefined,
      };

      const assistantMsg: Message = {
        id: `tmp-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const stream = await apiChatStream(
          content,
          conversationId,
          base64Images.length > 0 ? base64Images : null,
          selectedModel
        );
        const reader = stream.getReader();

        let fullResponse = "";
        let sources: Source[] = [];
        let newConvId = conversationId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const event = value as { type: string; data: unknown };

          if (event.type === "conversation_id") {
            newConvId = event.data as string;
            setConversationId(newConvId);
          } else if (event.type === "sources") {
            sources = event.data as Source[];
          } else if (event.type === "token") {
            fullResponse += event.data as string;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: fullResponse,
                };
              }
              return updated;
            });
          } else if (event.type === "done") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: fullResponse,
                  sources,
                  streaming: false,
                };
              }
              return updated;
            });
          } else if (event.type === "error") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content:
                    "I encountered an error. Please try again.",
                  streaming: false,
                };
              }
              return updated;
            });
          }
        }

        // Refresh conversation list
        loadConversations();
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: "Failed to get response. Please check your connection and try again.",
              streaming: false,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, isStreaming, loadConversations, selectedModel]
  );

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) {
          startNewChat();
        }
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    [conversationId, startNewChat]
  );

  return {
    messages,
    conversationId,
    conversations,
    isStreaming,
    selectedModel,
    setSelectedModel,
    sendMessage,
    loadConversations,
    loadConversation,
    startNewChat,
    deleteConversation,
  };
}
