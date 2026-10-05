import { Message } from "@/types/chat";

/**
 * ==============================================================================
 * BACKEND INTEGRATION LAYER
 * ==============================================================================
 * Since you mentioned: "i will handle the backend part", this service is structured
 * so you can easily connect your real API endpoint (e.g., FastAPI, Express, LangChain,
 * or Next.js route handlers).
 *
 * To connect your real backend:
 * 1. Set NEXT_PUBLIC_BACKEND_URL in your .env.local (e.g. http://localhost:8000/api/chat)
 * 2. Set NEXT_PUBLIC_USE_MOCK=false
 * 3. Adapt the stream/fetch call below to match your backend's streaming protocol
 *    (Server-Sent Events (SSE), WebSocket, or standard JSON response).
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/chat";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

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
 * Streams chat responses from backend (or mock simulator).
 */
export async function streamChatResponse({
  messages,
  model,
  onChunk,
  onFinish,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  const lastUserMessage = messages[messages.length - 1]?.content || "";

  if (USE_MOCK) {
    // Simulated realistic AI streaming with variable chunk sizes
    return simulateMockStream(lastUserMessage, model, onChunk, onFinish, signal);
  }

  // Real backend connection example
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
      throw new Error(`Backend responded with status: ${response.status}`);
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
      accumulated += chunk;
      onChunk(chunk);
    }

    onFinish?.(accumulated);
  } catch (err: unknown) {
    if (signal?.aborted) {
      console.log("Chat generation stopped by user.");
      return;
    }
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
  }
}

/**
 * Realistic mock response generator for immediate frontend testing.
 */
async function simulateMockStream(
  prompt: string,
  model: string,
  onChunk: (chunk: string) => void,
  onFinish?: (fullText: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const sampleResponses: { [keyword: string]: string } = {
    python: `Here is a complete, clean Python implementation with robust error handling and type hints:

\`\`\`python
import asyncio
import httpx
from typing import Any, Dict, Optional

class DataCollector:
    def __init__(self, base_url: str, timeout_seconds: float = 10.0):
        self.base_url = base_url
        self.timeout = httpx.Timeout(timeout_seconds)

    async def fetch_item(self, endpoint: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(f"{self.base_url}/{endpoint}")
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as exc:
                print(f"HTTP error occurred: {exc.response.status_code}")
            except httpx.RequestError as exc:
                print(f"Network error occurred: {exc}")
        return None

async def main():
    collector = DataCollector("https://jsonplaceholder.typicode.com")
    data = await collector.fetch_item("todos/1")
    print("Received item:", data)

if __name__ == "__main__":
    asyncio.run(main())
\`\`\`

### Key Features:
- **Async HTTP** with \`httpx\` for high throughput.
- **Granular Exception Handling** distinguishing HTTP status codes from network connection failures.
- **Modern Typing** using Python 3.10+ annotations.`,

    react: `Here's an example of an optimized custom hook pattern in React 19 / Next.js:

\`\`\`tsx
import { useState, useEffect, useCallback } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
\`\`\`

### When to use this:
- Live search inputs to prevent overwhelming backend APIs.
- Auto-saving draft notes.
- Window resize or scroll listener handlers.`,
  };

  // Find a matching sample response or build a smart context-aware answer
  let fullResponse = "";
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("python") || lowerPrompt.includes("script")) {
    fullResponse = sampleResponses.python;
  } else if (lowerPrompt.includes("react") || lowerPrompt.includes("next") || lowerPrompt.includes("component")) {
    fullResponse = sampleResponses.react;
  } else {
    fullResponse = `I received your request: **"${prompt}"** using model **${model}**.

Here is a structured overview:

1. **Analysis & Strategy**:
   - The task has been decomposed into modular, isolated steps.
   - We ensure high-performance frontend architecture and smooth streaming UX.

2. **Backend Plug-and-Play**:
   - You can connect your real backend service by modifying \`src/services/chatService.ts\`.
   - Supports streaming SSE (Server-Sent Events), WebSockets, or simple REST APIs.

3. **Key Capabilities Supported**:
   - ⚡ Real-time token streaming with stop-generation support
   - 💻 Syntax highlighted markdown code blocks with one-click copy
   - 📁 Multi-file attachments preview
   - 💬 Multi-conversation sidebar with chronological grouping
   - 🌗 Seamless Dark / Light mode switching

Feel free to ask follow-up questions, request specific code snippets, or test out different models!`;
  }

  // Split into realistic natural words/chunks
  const tokens = fullResponse.split(/(?<=\s|`|\n)/);
  let accumulated = "";

  for (const token of tokens) {
    if (signal?.aborted) return;
    await new Promise((res) => setTimeout(res, 18 + Math.random() * 15));
    accumulated += token;
    onChunk(token);
  }

  onFinish?.(accumulated);
}
