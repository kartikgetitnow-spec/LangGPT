"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Conversation, Message, Attachment } from "@/types/chat";
import { AVAILABLE_MODELS } from "@/lib/mockData";
import { streamChatResponse } from "@/services/chatService";

const STORAGE_KEY = "chatgpt_conversations";
const CURRENT_CONV_KEY = "chatgpt_active_id";
const MODEL_KEY = "chatgpt_selected_model";

export function useChat() {
  const { status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations from server (accelerated by Redis) when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/conversations")
        .then((res) => (res.ok ? res.json() : []))
        .then((serverConvs: Conversation[]) => {
          if (Array.isArray(serverConvs) && serverConvs.length > 0) {
            setConversations(serverConvs);
            setCurrentConversationId((prev) => (prev && serverConvs.some((c) => c.id === prev) ? prev : serverConvs[0].id));
          }
        })
        .catch((err) => console.warn("Failed to load server conversations:", err));
    }
  }, [status]);

  // Safely load from localStorage on client mount (prevents SSR hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    try {
      // Clear legacy storage keys with mock data
      localStorage.removeItem("langgpt_conversations");
      localStorage.removeItem("langgpt_active_id");

      const savedConvs = localStorage.getItem(STORAGE_KEY);
      if (savedConvs) {
        const parsed: Conversation[] = JSON.parse(savedConvs);
        const filtered = parsed.filter((c) => c.id !== "conv-1" && c.id !== "conv-2");
        setConversations(filtered);
      }

      const savedId = localStorage.getItem(CURRENT_CONV_KEY);
      if (savedId && savedId !== "conv-1" && savedId !== "conv-2") {
        setCurrentConversationId(savedId);
      }

      const savedModel = localStorage.getItem(MODEL_KEY);
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e);
    }
  }, []);

  // Sync conversations to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error("Failed to save conversations to localStorage", e);
    }
  }, [conversations, isMounted]);

  // Sync active conversation ID
  useEffect(() => {
    if (!isMounted) return;
    if (currentConversationId) {
      try {
        localStorage.setItem(CURRENT_CONV_KEY, currentConversationId);
      } catch (e) {
        console.error("Failed to save active conversation id", e);
      }
    } else {
      try {
        localStorage.removeItem(CURRENT_CONV_KEY);
      } catch {
        // ignore
      }
    }
  }, [currentConversationId, isMounted]);

  // Sync selected model
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(MODEL_KEY, selectedModel);
    } catch (e) {
      console.error("Failed to save selected model", e);
    }
  }, [selectedModel, isMounted]);

  const activeConversation = conversations.find(
    (c) => c.id === currentConversationId
  ) || null;

  /**
   * Start a brand new empty chat
   */
  const startNewChat = useCallback(() => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }

    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: "New Chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      modelId: selectedModel,
    };

    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newId);
    return newId;
  }, [isGenerating, selectedModel]);

  /**
   * Delete a chat conversation
   */
  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (currentConversationId === id) {
          setCurrentConversationId(filtered[0]?.id || null);
        }
        return filtered;
      });

      fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(() => {});
    },
    [currentConversationId]
  );

  /**
   * Rename a chat conversation
   */
  const renameConversation = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim(), updatedAt: new Date().toISOString() } : c))
    );

    fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    }).catch(() => {});
  }, []);

  /**
   * Pin / Unpin conversation
   */
  const togglePinConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );

    fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ togglePin: true }),
    }).catch(() => {});
  }, []);

  /**
   * Stop AI generation
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== currentConversationId) return conv;
        return {
          ...conv,
          messages: conv.messages.map((m) =>
            m.isStreaming ? { ...m, isStreaming: false } : m
          ),
        };
      })
    );
  }, [currentConversationId]);

  /**
   * Send a new message
   */
  const sendMessage = useCallback(
    async (content: string, attachments: Attachment[] = []) => {
      if ((!content.trim() && attachments.length === 0) || isGenerating) return;

      let targetConvId = currentConversationId;

      // If no active conversation exists, create a new one
      if (!targetConvId || !conversations.some((c) => c.id === targetConvId)) {
        targetConvId = `conv-${Date.now()}`;
        const newConv: Conversation = {
          id: targetConvId,
          title: content.slice(0, 36) || "New Conversation",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
          modelId: selectedModel,
        };
        setConversations((prev) => [newConv, ...prev]);
        setCurrentConversationId(targetConvId);
      }

      const userMsgId = `msg-${Date.now()}`;
      const userMessage: Message = {
        id: userMsgId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const assistantMsgId = `msg-${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        model: selectedModel,
        isStreaming: true,
      };

      // Add messages to state and update conversation title if first message
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== targetConvId) return conv;

          const isFirstMessage = conv.messages.length === 0;
          const newTitle = isFirstMessage ? content.slice(0, 40) : conv.title;

          return {
            ...conv,
            title: newTitle,
            updatedAt: new Date().toISOString(),
            messages: [...conv.messages, userMessage, assistantMessage],
          };
        })
      );

      setIsGenerating(true);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await streamChatResponse({
          conversationId: targetConvId,
          messages: [
            ...(activeConversation?.messages || []),
            userMessage,
          ],
          model: selectedModel,
          signal: abortController.signal,
          onChunk: (chunk: string) => {
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id !== targetConvId) return conv;
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + chunk }
                      : m
                  ),
                };
              })
            );
          },
          onFinish: () => {
            setIsGenerating(false);
            abortControllerRef.current = null;
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id !== targetConvId) return conv;
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                  ),
                };
              })
            );
          },
          onError: (err) => {
            console.error("Stream generation error:", err);
            setIsGenerating(false);
            abortControllerRef.current = null;
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id !== targetConvId) return conv;
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content:
                            m.content ||
                            `Error: ${err.message || "Unable to reach backend. Please ensure your backend server is running."}`,
                          isStreaming: false,
                        }
                      : m
                  ),
                };
              })
            );
          },
        });
      } catch (e) {
        console.error("Error in sendMessage:", e);
        setIsGenerating(false);
      }
    },
    [currentConversationId, conversations, isGenerating, selectedModel, activeConversation]
  );

  /**
   * Regenerate the last assistant response
   */
  const regenerateLastMessage = useCallback(async () => {
    if (!activeConversation || isGenerating) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    let lastUserMsgIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserMsgIndex = i;
        break;
      }
    }

    if (lastUserMsgIndex === -1) return;

    const trimmedMessages = msgs.slice(0, lastUserMsgIndex + 1);

    const assistantMsgId = `msg-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      model: selectedModel,
      isStreaming: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: new Date().toISOString(),
              messages: [...trimmedMessages, assistantMessage],
            }
          : c
      )
    );

    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await streamChatResponse({
        conversationId: activeConversation.id,
        messages: trimmedMessages,
        model: selectedModel,
        signal: abortController.signal,
        onChunk: (chunk: string) => {
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== activeConversation.id) return conv;
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m
                ),
              };
            })
          );
        },
        onFinish: () => {
          setIsGenerating(false);
          abortControllerRef.current = null;
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== activeConversation.id) return conv;
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                ),
              };
            })
          );
        },
        onError: (err) => {
          setIsGenerating(false);
          abortControllerRef.current = null;
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== activeConversation.id) return conv;
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content:
                          m.content ||
                          `Error: ${err.message || "Failed to regenerate response from backend."}`,
                        isStreaming: false,
                      }
                    : m
                ),
              };
            })
          );
        },
      });
    } catch {
      setIsGenerating(false);
    }
  }, [activeConversation, isGenerating, selectedModel]);

  return {
    conversations,
    currentConversationId,
    activeConversation,
    selectedModel,
    isGenerating,
    isMounted,
    setCurrentConversationId,
    setSelectedModel,
    startNewChat,
    deleteConversation,
    renameConversation,
    togglePinConversation,
    sendMessage,
    stopGeneration,
    regenerateLastMessage,
  };
}
