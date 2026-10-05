/**
 * ==============================================================================
 * STEP 7: CONVERSATION ORCHESTRATOR (CORE PIPELINE)
 * ==============================================================================
 * Coordinates the conversational pipeline:
 * 
 * Flow:
 * 1. Pulls past history turns for the `conversationId` from `memoryManager`.
 * 2. Dynamically loads User Preferences & System Directives from `localContextDb`.
 * 3. Assembles prompt and streams tokens in real-time.
 * 4. Persists the turn into `memoryManager`.
 * 5. BACKGROUND LEARNING: Analyzes user input to extract and update user preferences
 *    in `localContextDb` automatically from every chat!
 */

import { Message } from "@/types/chat";
import { memoryManager } from "../memory/memoryManager";
import { ModelFactory } from "../models/modelFactory";
import { PromptBuilder } from "../prompts/promptTemplates";
import { UserPreferences } from "../db/localDb";
import { PreferenceExtractor } from "../context/preferenceExtractor";

export interface OrchestrationParams {
  conversationId?: string;
  messages: Message[];
  model?: string;
  userContext?: Partial<UserPreferences>;
  signal?: AbortSignal;
}

// Utility to extract string text from stream chunks
function extractChunkText(chunk: unknown): string {
  if (!chunk || typeof chunk !== "object") return "";
  const content = (chunk as { content?: unknown }).content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text || "");
        }
        return "";
      })
      .join("");
  }

  return "";
}

export class ConversationOrchestrator {
  /**
   * Executes the full conversational streaming pipeline.
   */
  static async streamConversation({
    conversationId = "default-session",
    messages,
    model,
    userContext,
  }: OrchestrationParams): Promise<ReadableStream<Uint8Array>> {
    // 1. Identify the latest user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const userPrompt = lastUserMessage?.content || "";

    // 2. Retrieve multi-turn history from memory store for this conversation
    const historyMessages = await memoryManager.getMessages(conversationId);

    // 3. Assemble full prompt combining Dynamic Global Context + Memory + Current Turn
    const promptMessages = await PromptBuilder.buildPromptMessages({
      historyMessages,
      currentTurnMessages: messages,
      customUserContext: userContext,
    });

    // 4. Initialize model from factory
    const llm = ModelFactory.createGeminiModel({
      modelName: model,
    });

    // 5. Initiate LangChain stream
    const modelStream = await llm.stream(promptMessages);
    const encoder = new TextEncoder();

    let fullAssistantResponse = "";

    // 6. Return a Web ReadableStream
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of modelStream) {
            const token = extractChunkText(chunk);
            if (token) {
              fullAssistantResponse += token;
              controller.enqueue(encoder.encode(token));
            }
          }

          // 7. Save this turn into memoryManager for session recall
          if (userPrompt && fullAssistantResponse) {
            await memoryManager.saveTurn(
              conversationId,
              userPrompt,
              fullAssistantResponse
            );

            // 8. BACKGROUND: Automatically extract and update user preferences in localdb
            PreferenceExtractor.extractAndSave(userPrompt, fullAssistantResponse).catch((err) => {
              console.warn("Background preference extraction error:", err);
            });
          }

          controller.close();
        } catch (streamErr: unknown) {
          const errMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
          console.error("Streaming error in ConversationOrchestrator:", streamErr);

          controller.enqueue(
            encoder.encode(`\n\n⚠️ **Error Generating Response**: ${errMsg}`)
          );
          controller.close();
        }
      },
    });
  }
}
