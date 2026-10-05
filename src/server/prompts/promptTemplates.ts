/**
 * ==============================================================================
 * STEP 6: PROMPT BUILDER & CONTEXT INJECTOR
 * ==============================================================================
 * Assembles the full message array for LangChain by combining:
 * 1. Global Context Directives (Dynamically loaded from local database)
 * 2. Conversational Memory (Historical turns from memoryManager)
 * 3. Latest User Turn
 */

import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { buildGlobalContextInstructionAsync } from "../context/globalContext";
import { UserPreferences } from "../db/localDb";
import { Message } from "@/types/chat";

export interface PromptAssemblyOptions {
  historyMessages: BaseMessage[];
  currentTurnMessages: Message[];
  customUserContext?: Partial<UserPreferences>;
}

export class PromptBuilder {
  /**
   * Builds the complete array of LangChain BaseMessages for the LLM.
   */
  static async buildPromptMessages({
    historyMessages,
    currentTurnMessages,
    customUserContext,
  }: PromptAssemblyOptions): Promise<BaseMessage[]> {
    const finalMessages: BaseMessage[] = [];

    // 1. Inject Dynamic Global Context Awareness from Local Database
    const globalInstruction = await buildGlobalContextInstructionAsync(customUserContext);
    finalMessages.push(new SystemMessage(globalInstruction));

    // 2. Inject Historical Memory Messages (if any)
    if (historyMessages.length > 0) {
      finalMessages.push(...historyMessages);
    }

    // 3. Inject Current Incoming Turn Messages
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
