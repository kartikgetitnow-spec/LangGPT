/**
 * ==============================================================================
 * STEP 6: PROMPT BUILDER & CONTEXT INJECTOR
 * ==============================================================================
 * Assembles the full message array for LangChain by combining:
 * 1. Global Context Directives (System identity, rules, user profile)
 * 2. Conversational Memory (Historical turns from memoryManager)
 * 3. Latest User Turn
 * 
 * WHY THIS IS CRUCIAL FOR GLOBAL AWARENESS:
 * - Ensures that every model invocation has full awareness of user preferences,
 *   active conversation history, and behavioral instructions.
 */

import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { buildGlobalContextInstruction, UserContext } from "../context/globalContext";
import { Message } from "@/types/chat";

export interface PromptAssemblyOptions {
  historyMessages: BaseMessage[];
  currentTurnMessages: Message[];
  customUserContext?: Partial<UserContext>;
}

export class PromptBuilder {
  /**
   * Builds the complete array of LangChain BaseMessages for the LLM.
   */
  static buildPromptMessages({
    historyMessages,
    currentTurnMessages,
    customUserContext,
  }: PromptAssemblyOptions): BaseMessage[] {
    const finalMessages: BaseMessage[] = [];

    // 1. Inject Global Context Awareness as the root SystemMessage
    const globalInstruction = buildGlobalContextInstruction(customUserContext);
    finalMessages.push(new SystemMessage(globalInstruction));

    // 2. Inject Historical Memory Messages (if any)
    if (historyMessages.length > 0) {
      finalMessages.push(...historyMessages);
    }

    // 3. Inject Current Incoming Turn Messages
    // Note: If history is already loaded from memory, currentTurnMessages usually contains
    // the newest user query (and any client-side context).
    for (const msg of currentTurnMessages) {
      if (!msg || !msg.content) continue;

      if (msg.role === "user") {
        // Prevent duplicate appending if the message was already in memory
        const isDuplicate = historyMessages.some(
          (h) => h instanceof HumanMessage && h.content === msg.content
        );
        if (!isDuplicate) {
          finalMessages.push(new HumanMessage(msg.content));
        }
      } else if (msg.role === "assistant") {
        const isDuplicate = historyMessages.some(
          (h) => h instanceof AIMessage && h.content === msg.content
        );
        if (!isDuplicate) {
          finalMessages.push(new AIMessage(msg.content));
        }
      }
    }

    return finalMessages;
  }
}
