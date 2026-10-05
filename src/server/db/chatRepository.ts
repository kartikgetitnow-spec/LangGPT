/**
 * ==============================================================================
 * CHAT REPOSITORY (POSTGRESQL + REDIS CACHE + FALLBACK)
 * ==============================================================================
 * High-performance persistence layer:
 * - Redis: Sub-millisecond reads for active sessions and conversation lists.
 * - PostgreSQL: Durable, ACID-compliant persistence with relational integrity.
 * - Local File Fallback: Uninterrupted availability if PostgreSQL is offline.
 */

import { prisma } from "./prisma";
import {
  cacheUserConversations,
  getUserConversationsFromCache,
  invalidateUserConversationsCache,
  cacheConversationMessages,
  getConversationMessagesFromCache,
  invalidateConversationCache,
} from "./redis";
import fs from "fs";
import path from "path";
import { Conversation, Message } from "@/types/chat";

const FALLBACK_CHATS_FILE = path.join(process.cwd(), "data", "fallback_chats.json");

interface FallbackChatStore {
  conversations: Record<string, Conversation>; // convId -> Conversation
  userConversations: Record<string, string[]>; // userId -> convId[]
}

function loadFallbackChats(): FallbackChatStore {
  try {
    if (fs.existsSync(FALLBACK_CHATS_FILE)) {
      return JSON.parse(fs.readFileSync(FALLBACK_CHATS_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return { conversations: {}, userConversations: {} };
}

function saveFallbackChats(store: FallbackChatStore) {
  try {
    const dir = path.dirname(FALLBACK_CHATS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FALLBACK_CHATS_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write to fallback_chats.json:", err);
  }
}

export class ChatRepository {
  /**
   * Retrieves all conversations for a user, accelerated with Redis
   */
  static async getUserConversations(userId: string): Promise<Conversation[]> {
    // 1. Try Redis cache first
    const cached = await getUserConversationsFromCache(userId);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached as Conversation[];
    }

    // 2. Query Prisma PostgreSQL
    try {
      const records = await prisma.conversation.findMany({
        where: { userId },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { attachments: true },
          },
        },
      });

      const conversations: Conversation[] = records.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        modelId: c.modelId,
        isPinned: c.isPinned,
        messages: c.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          model: m.model || undefined,
          attachments: m.attachments.map((a) => ({
            id: a.id,
            name: a.name,
            size: a.size,
            type: a.type,
            url: a.url || undefined,
          })),
        })),
      }));

      // Cache in Redis
      await cacheUserConversations(userId, conversations);
      return conversations;
    } catch {
      // 3. Fallback to local file store
      const store = loadFallbackChats();
      const convIds = store.userConversations[userId] || [];
      const fallbackList = convIds
        .map((id) => store.conversations[id])
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

      await cacheUserConversations(userId, fallbackList);
      return fallbackList;
    }
  }

  /**
   * Retrieves messages for a single conversation, accelerated with Redis
   */
  static async getConversationMessages(conversationId: string): Promise<Message[]> {
    // 1. Try Redis cache first
    const cached = await getConversationMessagesFromCache(conversationId);
    if (cached && Array.isArray(cached)) {
      return cached as Message[];
    }

    // 2. Query Prisma PostgreSQL
    try {
      const records = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        include: { attachments: true },
      });

      const messages: Message[] = records.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        model: m.model || undefined,
        attachments: m.attachments.map((a) => ({
          id: a.id,
          name: a.name,
          size: a.size,
          type: a.type,
          url: a.url || undefined,
        })),
      }));

      await cacheConversationMessages(conversationId, messages);
      return messages;
    } catch {
      const store = loadFallbackChats();
      const conv = store.conversations[conversationId];
      const msgs = conv?.messages || [];
      await cacheConversationMessages(conversationId, msgs);
      return msgs;
    }
  }

  /**
   * Saves a full conversation turn (User prompt + Assistant response)
   */
  static async saveTurn(params: {
    conversationId: string;
    userId: string;
    userPrompt: string;
    assistantReply: string;
    model?: string;
  }): Promise<void> {
    const { conversationId, userId, userPrompt, assistantReply, model = "gemini-2.5-flash" } = params;
    const now = new Date();

    const userMsg: Message = {
      id: "msg-" + Date.now(),
      role: "user",
      content: userPrompt,
      createdAt: now.toISOString(),
    };

    const assistantMsg: Message = {
      id: "msg-" + (Date.now() + 1),
      role: "assistant",
      content: assistantReply,
      createdAt: new Date(now.getTime() + 10).toISOString(),
      model,
    };

    // 1. Persist to Prisma PostgreSQL
    try {
      // Upsert conversation
      await prisma.conversation.upsert({
        where: { id: conversationId },
        update: {
          updatedAt: now,
          modelId: model,
        },
        create: {
          id: conversationId,
          userId,
          title: userPrompt.slice(0, 40) || "New Chat",
          modelId: model,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Insert both messages
      await prisma.message.createMany({
        data: [
          {
            id: userMsg.id,
            conversationId,
            role: "user",
            content: userPrompt,
            createdAt: now,
          },
          {
            id: assistantMsg.id,
            conversationId,
            role: "assistant",
            content: assistantReply,
            model,
            createdAt: new Date(now.getTime() + 10),
          },
        ],
      });
    } catch {
      // Fallback file persistence
      const store = loadFallbackChats();
      if (!store.conversations[conversationId]) {
        store.conversations[conversationId] = {
          id: conversationId,
          title: userPrompt.slice(0, 40) || "New Chat",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          modelId: model,
          messages: [],
        };
      }
      if (!store.userConversations[userId]) {
        store.userConversations[userId] = [];
      }
      if (!store.userConversations[userId].includes(conversationId)) {
        store.userConversations[userId].push(conversationId);
      }
      store.conversations[conversationId].messages.push(userMsg, assistantMsg);
      store.conversations[conversationId].updatedAt = now.toISOString();
      saveFallbackChats(store);
    }

    // 2. Update Redis Caches
    const currentCached = (await getConversationMessagesFromCache(conversationId)) || [];
    currentCached.push(userMsg, assistantMsg);
    await cacheConversationMessages(conversationId, currentCached);
    await invalidateUserConversationsCache(userId);
  }

  /**
   * Deletes a conversation and its messages
   */
  static async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      await prisma.conversation.deleteMany({
        where: { id: conversationId, userId },
      });
    } catch {
      const store = loadFallbackChats();
      delete store.conversations[conversationId];
      if (store.userConversations[userId]) {
        store.userConversations[userId] = store.userConversations[userId].filter((id) => id !== conversationId);
      }
      saveFallbackChats(store);
    }

    await invalidateConversationCache(conversationId);
    await invalidateUserConversationsCache(userId);
  }

  /**
   * Renames a conversation
   */
  static async renameConversation(conversationId: string, userId: string, newTitle: string): Promise<void> {
    try {
      await prisma.conversation.updateMany({
        where: { id: conversationId, userId },
        data: { title: newTitle, updatedAt: new Date() },
      });
    } catch {
      const store = loadFallbackChats();
      if (store.conversations[conversationId]) {
        store.conversations[conversationId].title = newTitle;
        store.conversations[conversationId].updatedAt = new Date().toISOString();
        saveFallbackChats(store);
      }
    }

    await invalidateUserConversationsCache(userId);
  }

  /**
   * Toggles pin status for a conversation
   */
  static async togglePinConversation(conversationId: string, userId: string): Promise<boolean> {
    let nextPinned = false;
    try {
      const existing = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (existing) {
        nextPinned = !existing.isPinned;
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { isPinned: nextPinned },
        });
      }
    } catch {
      const store = loadFallbackChats();
      if (store.conversations[conversationId]) {
        nextPinned = !store.conversations[conversationId].isPinned;
        store.conversations[conversationId].isPinned = nextPinned;
        saveFallbackChats(store);
      }
    }

    await invalidateUserConversationsCache(userId);
    return nextPinned;
  }

  /**
   * Clears all conversations for a user
   */
  static async clearAllConversations(userId: string): Promise<void> {
    try {
      await prisma.conversation.deleteMany({
        where: { userId },
      });
    } catch {
      const store = loadFallbackChats();
      const userConvs = store.userConversations[userId] || [];
      for (const id of userConvs) {
        delete store.conversations[id];
      }
      delete store.userConversations[userId];
      saveFallbackChats(store);
    }

    await invalidateUserConversationsCache(userId);
  }
}
