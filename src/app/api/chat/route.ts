import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

// Safely extract string content from LangChain message chunks
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

    // If API key is not yet set in .env.local, return a helpful setup guide
    if (!apiKey) {
      const encoder = new TextEncoder();
      const setupGuideStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              "⚠️ **Google Gemini API Key Required**\n\n" +
              "To chat with Gemini, please add your API key:\n\n" +
              "1. Create a `.env.local` file in your project root:\n" +
              "```env\nGOOGLE_API_KEY=\"your_gemini_api_key_here\"\n```\n" +
              "2. Get your free key from [Google AI Studio](https://aistudio.google.com/app/apikey).\n" +
              "3. Restart the dev server (`npm run dev`) and you're good to go!"
            )
          );
          controller.close();
        },
      });

      return new Response(setupGuideStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Map requested model to supported Gemini models
    let geminiModel = "gemini-2.5-flash";
    if (model) {
      if (model.includes("pro")) {
        geminiModel = "gemini-2.5-pro";
      } else if (model.includes("2.5") || model.includes("latest")) {
        geminiModel = model;
      } else if (model.includes("flash")) {
        geminiModel = "gemini-2.5-flash";
      }
    }

    // Convert frontend messages to LangChain messages
    const langChainMessages: BaseMessage[] = [];

    // System instruction
    langChainMessages.push(
      new SystemMessage(
        "You are ChatGPT, an advanced and helpful AI assistant powered by Google Gemini. Use Markdown formatting for your responses, including code blocks with language indicators when sharing code."
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

    // Initialize LangChain Gemini Chat Model
    const llm = new ChatGoogleGenerativeAI({
      model: geminiModel,
      apiKey,
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    // Stream tokens from LangChain
    const stream = await llm.stream(langChainMessages);
    const encoder = new TextEncoder();

    // Stream directly to the browser
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
        } catch (streamErr: unknown) {
          const errMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
          controller.enqueue(
            encoder.encode(`\n\n⚠️ **Gemini Error**: ${errMsg}`)
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
