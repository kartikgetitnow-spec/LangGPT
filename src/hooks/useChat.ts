"use client";

/**
 * ==============================================================================
 * USE CHAT HOOK (Session Persistence & Instant Active Chat Restoration)
 * ==============================================================================
 * Manages conversation list, message history, streaming responses, and guarantees
 * zero-delay active session restoration across page reloads.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Conversation, Message, Attachment } from "@/types/chat";
import { AVAILABLE_MODELS } from "@/lib/mockData";
import { streamChatResponse } from "@/services/chatService";

const STORAGE_KEY = "langgpt_conversations";
const CURRENT_CONV_KEY = "langgpt_active_id";
const MODEL_KEY = "langgpt_selected_model";

export interface UseChatOptions {
  initialConversations?: Conversation[];
  initialActiveId?: string | null;
}

export function useChat({
  initialConversations = [],
  initialActiveId = null,
}: UseChatOptions = {}) {
  const { status } = useSession();

  // Instantaneous synchronous state initialization from server props (guarantees 100% SSR match)
  const [conversations, setConversations] = useState<Conversation[]>(() => initialConversations);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    if (initialActiveId) return initialActiveId;
    if (initialConversations.length > 0) return initialConversations[0].id;
    return null;
  });
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mark client mounted and load client-only preferences safely after hydration
  useEffect(() => {
    setIsMounted(true);

    try {
      const savedModel = localStorage.getItem(MODEL_KEY);
      if (savedModel && AVAILABLE_MODELS.some((m) => m.id === savedModel)) {
        setSelectedModel(savedModel);
      }
    } catch {}

    // Fallback: if server provided 0 conversations (e.g. offline/guest), check client localStorage
    if (initialConversations.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: Conversation[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setConversations(parsed);
            const savedId = localStorage.getItem(CURRENT_CONV_KEY);
            if (savedId && parsed.some((c: Conversation) => c.id === savedId)) {
              setCurrentConversationId(savedId);
            } else {
              setCurrentConversationId(parsed[0].id);
            }
          }
        }
      } catch {}
    }
  }, [initialConversations.length]);

  // Background fetch from server (accelerated by Redis) when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/conversations")
        .then((res) => (res.ok ? res.json() : []))
        .then((serverConvs: Conversation[]) => {
          if (Array.isArray(serverConvs) && serverConvs.length > 0) {
            setConversations(serverConvs);

            // Maintain the active chat session without jumping back to New Chat
            setCurrentConversationId((prev) => {
              if (prev && serverConvs.some((c) => c.id === prev)) {
                return prev;
              }
              if (prev === null) {
                return null;
              }
              return serverConvs[0].id;
            });
          }
        })
        .catch((err) => console.warn("Failed to load server conversations:", err));
    }
  }, [status]);

  // Persist conversations to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error("Failed to save conversations to localStorage", e);
    }
  }, [conversations, isMounted]);

  // Persist active conversation ID to cookie and localStorage
  useEffect(() => {
    if (!isMounted) return;
    if (currentConversationId) {
      document.cookie = `langgpt_active_id=${encodeURIComponent(currentConversationId)}; path=/; max-age=31536000; SameSite=Lax`;
      try {
        localStorage.setItem(CURRENT_CONV_KEY, currentConversationId);
      } catch (e) {
        console.error("Failed to save active conversation id", e);
      }
    } else {
      document.cookie = `langgpt_active_id=new; path=/; max-age=31536000; SameSite=Lax`;
      try {
        localStorage.setItem(CURRENT_CONV_KEY, "new");
      } catch {}
    }
  }, [currentConversationId, isMounted]);

  // Persist selected model
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
          const nextId = filtered[0]?.id || null;
          setCurrentConversationId(nextId);
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
   * Send a new message & stream the assistant reply
   */
  const sendMessage = useCallback(
    async (content: string, attachments: Attachment[] = []) => {
      if (!content.trim() && attachments.length === 0) return;
      if (isGenerating) return;

      let targetConvId = currentConversationId;

      // If no active conversation exists, create one immediately
      if (!targetConvId) {
        targetConvId = `conv-${Date.now()}`;
        const newConv: Conversation = {
          id: targetConvId,
          title: content.slice(0, 40) || "New Chat",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
          modelId: selectedModel,
        };
        setConversations((prev) => [newConv, ...prev]);
        setCurrentConversationId(targetConvId);
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
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
    [currentConversationId, isGenerating, selectedModel, activeConversation]
  );

  /**
   * Regenerate the last assistant response
   */
  const regenerateLastMessage = useCallback(() => {
    if (!activeConversation || activeConversation.messages.length === 0 || isGenerating) return;

    const msgs = activeConversation.messages;
    const lastUserIndex = [...msgs].map((m) => m.role).lastIndexOf("user");

    if (lastUserIndex === -1) return;

    const lastUserMessage = msgs[lastUserIndex];
    // Remove all messages after the last user message
    const trimmedMessages = msgs.slice(0, lastUserIndex + 1);

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
      prev.map((conv) => {
        if (conv.id !== currentConversationId) return conv;
        return {
          ...conv,
          messages: [...trimmedMessages, assistantMessage],
        };
      })
    );

    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    streamChatResponse({
      conversationId: activeConversation.id,
      messages: trimmedMessages,
      model: selectedModel,
      signal: abortController.signal,
      onChunk: (chunk: string) => {
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id !== currentConversationId) return conv;
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
            if (conv.id !== currentConversationId) return conv;
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
      },
    });
  }, [activeConversation, isGenerating, selectedModel, currentConversationId]);

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
