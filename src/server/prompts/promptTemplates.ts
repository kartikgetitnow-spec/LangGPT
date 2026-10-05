/**
 * ==============================================================================
 * STEP 6: PROMPT BUILDER & CONTEXT INJECTOR
 * ==============================================================================
 * Assembles the full message array for LangChain by combining:
 * 1. Global Context Directives & Narrative User Profile (from PostgreSQL/localdb)
 * 2. Conversational Memory (Historical turns from memoryManager)
 * 3. Latest User Turn
 */

import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { buildGlobalContextInstructionAsync } from "../context/globalContext";
import { Message } from "@/types/chat";

export interface PromptAssemblyOptions {
  historyMessages: BaseMessage[];
  currentTurnMessages: Message[];
  customUserProfile?: string;
  userId?: string;
}

export class PromptBuilder {
  /**
   * Builds the complete array of LangChain BaseMessages for the LLM.
   */
  static async buildPromptMessages({
    historyMessages,
    currentTurnMessages,
    customUserProfile,
    userId,
  }: PromptAssemblyOptions): Promise<BaseMessage[]> {
    const finalMessages: BaseMessage[] = [];

    // 1. Inject Global Context & Living Narrative User Profile (scoped by userId)
    const globalInstruction = await buildGlobalContextInstructionAsync(customUserProfile, userId);
    finalMessages.push(new SystemMessage(globalInstruction));

    // 2. Inject Historical Memory Messages (if any)
    if (historyMessages.length > 0) {
      finalMessages.push(...historyMessages);
    }

    // 3. Inject Current Incoming Turn Messages
    for (const msg of currentTurnMessages) {
      if (!msg || !msg.content) continue;

      if (msg.role === "user") {
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
