/**
 * ==============================================================================
 * STEP 7: CONVERSATION ORCHESTRATOR (CORE PIPELINE)
 * ==============================================================================
 * Coordinates the entire conversational lifecycle:
 * 
 * Pipeline Flow:
 * 1. Identify Conversation: Retrieves or establishes session state.
 * 2. Load Memory: Pulls past turns from `memoryManager`.
 * 3. Inject Global Context: Combines System rules + User profile + Memory + Query.
 * 4. Model Invocation: Obtains model from `ModelFactory` and initiates streaming.
 * 5. Stream Output: Streams tokens in real-time to the client.
 * 6. Save Turn: Persists the completed exchange into `memoryManager` upon completion.
 */

import { Message } from "@/types/chat";
import { memoryManager } from "../memory/memoryManager";
import { ModelFactory } from "../models/modelFactory";
import { PromptBuilder } from "../prompts/promptTemplates";
import { UserContext } from "../context/globalContext";

export interface OrchestrationParams {
  conversationId?: string;
  messages: Message[];
  model?: string;
  userContext?: Partial<UserContext>;
  signal?: AbortSignal;
}

// Utility to extract text content from LangChain stream chunks
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
    // 1. Find the latest user query from the message payload
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const userPrompt = lastUserMessage?.content || "";

    // 2. Retrieve multi-turn history from memory store for this conversation
    const historyMessages = await memoryManager.getMessages(conversationId);

    // 3. Assemble full prompt combining Global Context + Memory + Current Turn
    const promptMessages = PromptBuilder.buildPromptMessages({
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

    // 6. Return a Web ReadableStream with lifecycle hooks
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

          // 7. Save this turn into memoryManager for global session awareness
          if (userPrompt && fullAssistantResponse) {
            await memoryManager.saveTurn(
              conversationId,
              userPrompt,
              fullAssistantResponse
            );
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
