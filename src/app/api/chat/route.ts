import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

// Helper to safely extract text from any LangChain message chunk
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model } = body;

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    // If API Key is not set, stream back a clear instruction message
    if (!apiKey) {
      const encoder = new TextEncoder();
      const warningStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              "⚠️ **Gemini API Key Required**\n\n" +
              "To connect this ChatGPT interface to **Google Gemini via LangChain**:\n\n" +
              "1. Create a `.env.local` file in the project root:\n" +
              "```env\nGOOGLE_API_KEY=\"your_gemini_api_key_here\"\n```\n" +
              "2. Get your free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).\n" +
              "3. Save the file and restart the development server (`npm run dev`)."
            )
          );
          controller.close();
        },
      });

      return new Response(warningStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Determine model name from user selection
    let geminiModel = "gemini-1.5-flash";
    if (model) {
      if (model.includes("pro") || model.includes("o1")) {
        geminiModel = "gemini-1.5-pro";
      } else if (model.includes("2.0")) {
        geminiModel = "gemini-2.0-flash";
      } else if (model.includes("gemini")) {
        geminiModel = model;
      }
    }

    // Convert frontend messages to LangChain BaseMessage objects
    const langChainMessages: BaseMessage[] = [];

    // Optional system prompt to instruct Gemini to act as a helpful AI assistant
    langChainMessages.push(
      new SystemMessage(
        "You are ChatGPT, a helpful, thoughtful, and highly capable AI assistant. Answer clearly with markdown formatting."
      )
    );

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (!msg || !msg.content) continue;
        if (msg.role === "user") {
          langChainMessages.push(new HumanMessage(msg.content));
        } else if (msg.role === "assistant") {
          langChainMessages.push(new AIMessage(msg.content));
        } else if (msg.role === "system") {
          langChainMessages.push(new SystemMessage(msg.content));
        }
      }
    }

    // Initialize LangChain's Google GenAI chat model
    const llm = new ChatGoogleGenerativeAI({
      model: geminiModel,
      apiKey,
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    // Stream responses using LangChain
    const stream = await llm.stream(langChainMessages);
    const encoder = new TextEncoder();

    // Stream chunks to the frontend in real time
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = extractChunkText(chunk);
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (streamError: unknown) {
          const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
          controller.enqueue(
            encoder.encode(`\n\n⚠️ **Gemini Streaming Error**: ${errMsg}`)
          );
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Chat API error:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
