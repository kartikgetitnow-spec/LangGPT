/**
 * ==============================================================================
 * STEP 8: HTTP API CONTROLLER (/api/chat)
 * ==============================================================================
 * The HTTP boundary layer that handles client requests from the LangGPT frontend.
 * 
 * RESPONSIBILITIES:
 * 1. Request Parsing & Validation: Parses `conversationId`, `messages`, and `model`.
 * 2. Auth Session Scoping: Extracts signed-in user ID for private context awareness.
 * 3. API Key Guard: Returns instructive markdown if `GOOGLE_API_KEY` is missing.
 * 4. Delegation: Hands off execution to `ConversationOrchestrator`.
 * 5. HTTP Headers: Configures streaming headers (no-cache, text/plain).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerConfig } from "@/server/config/env";
import { ConversationOrchestrator } from "@/server/chains/conversationOrchestrator";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const config = getServerConfig();

    // 1. Check if Gemini API Key is configured
    if (!config.googleApiKey) {
      const encoder = new TextEncoder();
      const setupWarningStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              "⚠️ **Google Gemini API Key Required**\n\n" +
              "To connect this LangGPT interface to **Google Gemini via LangChain**:\n\n" +
              "1. Add your API key to `.env.local`:\n" +
              "```env\nGOOGLE_API_KEY=\"your_gemini_api_key_here\"\n```\n" +
              "2. Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).\n" +
              "3. Save the file and restart the development server (`npm run dev`)."
            )
          );
          controller.close();
        },
      });

      return new Response(setupWarningStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // 2. Authentication & Authorization Guard: Reject unauthenticated users
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You must be logged in to chat with LangGPT. Please sign in to continue.",
        },
        { status: 401 }
      );
    }

    // 3. Parse request payload
    const body = await req.json();
    const { conversationId, messages, model, userProfile } = body;
    const userId = session.user.id || session.user.email || undefined;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: messages array is required." },
        { status: 400 }
      );
    }

    // 3. Delegate to the Conversation Orchestrator pipeline
    const stream = await ConversationOrchestrator.streamConversation({
      conversationId: conversationId || "default-session",
      messages,
      model,
      userProfile,
      userId,
    });

    // 4. Return the live stream to the client
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error handling /api/chat request:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
