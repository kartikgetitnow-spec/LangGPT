/**
 * ==============================================================================
 * STEP 4: CONVERSATIONAL MEMORY MANAGER
 * ==============================================================================
 * Manages multi-turn conversational state per session (conversationId).
 * 
 * FEATURES:
 * 1. Thread-safe Session Isolation: Each conversation has its own distinct history buffer.
 * 2. Sliding Window Buffer: Automatically prunes old messages to keep token usage within
 *    budget and maintain high context relevance.
 * 3. LangChain Native: Converts raw stored turns into LangChain `HumanMessage` and `AIMessage`.
 * 4. Extensible: Implements `IMemoryStore` so you can swap this with Redis or PostgreSQL.
 */

import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { IMemoryStore, SessionMemoryState, ConversationTurn } from "./types";
import { getServerConfig } from "../config/env";

export class InMemoryConversationStore implements IMemoryStore {
  // Map storing conversation state keyed by conversationId
  private sessions: Map<string, SessionMemoryState> = new Map();

  /**
   * Retrieves messages for a conversation as LangChain BaseMessage objects.
   * Applies sliding window to prevent token explosion.
   */
  async getMessages(conversationId: string, limit?: number): Promise<BaseMessage[]> {
    const session = this.sessions.get(conversationId);
    if (!session || session.turns.length === 0) {
      return [];
    }

    const config = getServerConfig();
    const effectiveLimit = limit ?? config.maxMemoryHistoryTurns;

    // Take the last N turns (each turn has user + assistant, so N * 2 messages)
    const recentTurns = session.turns.slice(-effectiveLimit * 2);

    return recentTurns.map((turn) => {
      if (turn.role === "user") {
        return new HumanMessage(turn.content);
      } else {
        return new AIMessage(turn.content);
      }
    });
  }

  /**
   * Records a user question and assistant response into session memory.
   */
  async saveTurn(
    conversationId: string,
    userText: string,
    assistantText: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const now = Date.now();
    let session = this.sessions.get(conversationId);

    if (!session) {
      session = {
        conversationId,
        turns: [],
        createdAt: now,
        updatedAt: now,
        metadata,
      };
      this.sessions.set(conversationId, session);
    }

    const userTurn: ConversationTurn = {
      id: `turn-${now}-u`,
      role: "user",
      content: userText,
      timestamp: now,
    };

    const assistantTurn: ConversationTurn = {
      id: `turn-${now + 1}-a`,
      role: "assistant",
      content: assistantText,
      timestamp: now + 1,
    };

    session.turns.push(userTurn, assistantTurn);
    session.updatedAt = now;
  }

  /**
   * Clears memory for a specific conversation session.
   */
  async clear(conversationId: string): Promise<void> {
    this.sessions.delete(conversationId);
  }

  /**
   * Returns all active conversation session IDs.
   */
  async listSessionIds(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  /**
   * Diagnostics: returns the number of turns currently in memory for a conversation.
   */
  getTurnCount(conversationId: string): number {
    return this.sessions.get(conversationId)?.turns.length ?? 0;
  }
}

// Global singleton instance for the server runtime
export const memoryManager: IMemoryStore = new InMemoryConversationStore();
