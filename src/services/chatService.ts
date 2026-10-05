import { Message } from "@/types/chat";

/**
 * ==============================================================================
 * BACKEND INTEGRATION LAYER
 * ==============================================================================
 * Direct connection to your backend API endpoint.
 * No hardcoded responses or dummy content.
 *
 * To point to your external backend (e.g. FastAPI, Express, LangChain):
 * Set NEXT_PUBLIC_BACKEND_URL in .env.local (e.g. http://localhost:8000/api/chat)
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/chat";

export interface StreamChatParams {
  conversationId: string;
  messages: Message[];
  model: string;
  onChunk: (chunk: string) => void;
  onFinish?: (fullText: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * Streams chat responses directly from the backend.
 * Supports both plain text streams and Server-Sent Events (SSE `data: ...`).
 */
export async function streamChatResponse({
  messages,
  model,
  onChunk,
  onFinish,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        model,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Backend request failed with status ${response.status}${
          errorText ? `: ${errorText}` : ""
        }`
      );
    }

    if (!response.body) {
      throw new Error("No response body received from backend.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Handle Server-Sent Events (SSE) format
      if (chunk.includes("data:")) {
        const lines = chunk.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const dataContent = trimmed.replace(/^data:\s*/, "");
            if (dataContent === "[DONE]") {
              continue;
            }
            try {
              const parsed = JSON.parse(dataContent);
              const text =
                parsed.text ??
                parsed.content ??
                parsed.delta?.content ??
                parsed.message ??
                "";
              if (text) {
                accumulated += text;
                onChunk(text);
              }
            } catch {
              accumulated += dataContent;
              onChunk(dataContent);
            }
          }
        }
      } else {
        // Plain text stream chunk
        accumulated += chunk;
        onChunk(chunk);
      }
    }

    onFinish?.(accumulated);
  } catch (err: unknown) {
    if (signal?.aborted) {
      return;
    }
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
  }
}
