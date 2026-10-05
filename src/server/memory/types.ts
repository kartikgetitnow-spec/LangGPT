/**
 * ==============================================================================
 * STEP 3: MEMORY CONTRACTS & DATA TYPES
 * ==============================================================================
 * Defines the abstractions and schemas for conversational memory.
 * 
 * WHY USE AN INTERFACE (IMemoryStore)?
 * By defining `IMemoryStore`, our application is decoupled from the underlying storage mechanism.
 * - Today: Uses fast In-Memory storage (ideal for local development).
 * - Tomorrow: Swap in Redis (`UpstashRedisMemoryStore`), Postgres, or DynamoDB simply by
 *   implementing `IMemoryStore`, with ZERO changes to the business logic or API routes!
 */

import { BaseMessage } from "@langchain/core/messages";

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface SessionMemoryState {
  conversationId: string;
  turns: ConversationTurn[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Interface that all memory storage implementations must fulfill.
 */
export interface IMemoryStore {
  /**
   * Retrieves LangChain BaseMessage objects for a given conversation.
   * @param conversationId Unique session ID
   * @param limit Maximum number of recent turns to retrieve (sliding window)
   */
  getMessages(conversationId: string, limit?: number): Promise<BaseMessage[]>;

  /**
   * Appends a user message and assistant reply to the conversation's memory.
   */
  saveTurn(
    conversationId: string,
    userText: string,
    assistantText: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Clears memory for a specific conversation.
   */
  clear(conversationId: string): Promise<void>;

  /**
   * Retrieves all active session identifiers.
   */
  listSessionIds(): Promise<string[]>;
}
