/**
 * ==============================================================================
 * REDIS CACHE CLIENT & CHAT ACCELERATION LAYER
 * ==============================================================================
 * Provides high-speed in-memory caching for user conversations and messages.
 * Falls back safely to memory cache if Redis is ever unavailable.
 */

import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | undefined;
};

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let isRedisConnected = false;

export const redis =
  globalForRedis.redisClient ??
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      if (times > 5) return null; // Stop retrying after 5 attempts to avoid flooding
      return Math.min(times * 100, 2000);
    },
    lazyConnect: false,
  });

redis.on("connect", () => {
  isRedisConnected = true;
  console.log("⚡ [Redis] Connected successfully to Redis at", REDIS_URL);
});

redis.on("error", (err) => {
  isRedisConnected = false;
  console.warn("⚠️ [Redis] Connection warning:", err.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redis;
}

// Memory fallback store in case Redis is momentarily offline
const memoryCache = new Map<string, { data: string; expiresAt: number }>();

function getFromMemoryFallback(key: string): string | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function setToMemoryFallback(key: string, data: string, ttlSeconds: number) {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * ==============================================================================
 * HIGH-SPEED CHAT CACHING HELPERS
 * ==============================================================================
 */

// Keys
const KEYS = {
  userConversations: (userId: string) => `langgpt:user:${userId}:conversations`,
  conversationMessages: (convId: string) => `langgpt:conv:${convId}:messages`,
  conversationMeta: (convId: string) => `langgpt:conv:${convId}:meta`,
};

// TTLs
const TTL = {
  CONVERSATIONS_LIST: 60 * 60 * 24, // 24 hours
  MESSAGES: 60 * 60 * 24 * 7,      // 7 days
};

/**
 * Cache user's list of conversations
 */
export async function cacheUserConversations(userId: string, conversations: unknown[]) {
  const key = KEYS.userConversations(userId);
  const payload = JSON.stringify(conversations);
  try {
    if (isRedisConnected) {
      await redis.set(key, payload, "EX", TTL.CONVERSATIONS_LIST);
      return;
    }
  } catch {
    // fallback
  }
  setToMemoryFallback(key, payload, TTL.CONVERSATIONS_LIST);
}

/**
 * Retrieve user's list of conversations from Redis
 */
export async function getUserConversationsFromCache(userId: string): Promise<unknown[] | null> {
  const key = KEYS.userConversations(userId);
  try {
    if (isRedisConnected) {
      const data = await redis.get(key);
      if (data) return JSON.parse(data);
    }
  } catch {
    // fallback
  }
  const fallback = getFromMemoryFallback(key);
  return fallback ? JSON.parse(fallback) : null;
}

/**
 * Invalidate user's conversation list cache
 */
export async function invalidateUserConversationsCache(userId: string) {
  const key = KEYS.userConversations(userId);
  try {
    if (isRedisConnected) {
      await redis.del(key);
    }
  } catch {
    // fallback
  }
  memoryCache.delete(key);
}

/**
 * Cache all messages for a specific conversation
 */
export async function cacheConversationMessages(conversationId: string, messages: unknown[]) {
  const key = KEYS.conversationMessages(conversationId);
  const payload = JSON.stringify(messages);
  try {
    if (isRedisConnected) {
      await redis.set(key, payload, "EX", TTL.MESSAGES);
      return;
    }
  } catch {
    // fallback
  }
  setToMemoryFallback(key, payload, TTL.MESSAGES);
}

/**
 * Retrieve conversation messages from Redis
 */
export async function getConversationMessagesFromCache(conversationId: string): Promise<unknown[] | null> {
  const key = KEYS.conversationMessages(conversationId);
  try {
    if (isRedisConnected) {
      const data = await redis.get(key);
      if (data) return JSON.parse(data);
    }
  } catch {
    // fallback
  }
  const fallback = getFromMemoryFallback(key);
  return fallback ? JSON.parse(fallback) : null;
}

/**
 * Append a newly streamed message to the Redis message cache
 */
export async function appendMessageToCache(conversationId: string, message: unknown) {
  const existing = await getConversationMessagesFromCache(conversationId);
  if (existing && Array.isArray(existing)) {
    existing.push(message);
    await cacheConversationMessages(conversationId, existing);
  }
}

/**
 * Invalidate conversation messages cache
 */
export async function invalidateConversationCache(conversationId: string) {
  const key = KEYS.conversationMessages(conversationId);
  try {
    if (isRedisConnected) {
      await redis.del(key);
    }
  } catch {
    // fallback
  }
  memoryCache.delete(key);
}
