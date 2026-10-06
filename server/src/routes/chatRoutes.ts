import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getServerConfig } from "@/server/config/env";
import { ConversationOrchestrator } from "@/server/chains/conversationOrchestrator";
import { vectorStore } from "../rag/vectorStore";
import { DiagnosticService } from "../services/diagnosticService";

const router = Router();

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const config = getServerConfig();

    if (!config.googleApiKey) {
      return res.status(400).send(
        "⚠️ **Google Gemini API Key Required**\n\n" +
          "To connect this LangGPT interface to **Google Gemini via LangChain**:\n\n" +
          "1. Add your API key to `.env` or `.env.local`:\n" +
          "```env\nGOOGLE_API_KEY=\"your_gemini_api_key_here\"\n```\n" +
          "2. Get a free key at https://aistudio.google.com/app/apikey.\n" +
          "3. Restart the backend server."
      );
    }

    const { conversationId, messages, model, userProfile } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid request: messages array is required." });
    }

    // Auto-retrieve relevant document context from VectorStore for RAG
    let documentContext = "";
    if (userId) {
      try {
        const lastUserMsg = [...messages].reverse().find((m: { role: string; content?: string }) => m.role === "user");
        const userPrompt = lastUserMsg?.content || "";
        if (userPrompt) {
          const matchedChunks = await vectorStore.similaritySearch(
            userPrompt,
            userId,
            conversationId,
            4
          );
          if (matchedChunks.length > 0 && matchedChunks[0].similarity > 0.15) {
            documentContext = matchedChunks
              .map(
                (c) =>
                  `[Source: ${c.metadata.filename} | Chunk ${c.metadata.chunkIndex + 1}]\n${c.content}`
              )
              .join("\n\n---\n\n");
          }
        }
      } catch (ragErr) {
        console.warn("⚠️ [ChatRoute] Error querying RAG vector store:", ragErr);
      }
    }

    const stream = await ConversationOrchestrator.streamConversation({
      conversationId: conversationId || "default-session",
      messages,
      model,
      userProfile,
      userId,
      documentContext,
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error in Express POST /api/chat:", error);

    const isRateLimit = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("ResourceExhausted");
    const isAuthErr = errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID");

    DiagnosticService.logError({
      category: isRateLimit || isAuthErr ? "AI_MODEL" : "SYSTEM",
      severity: isRateLimit ? "WARNING" : "ERROR",
      message: `Chat streaming error: ${errorMsg}`,
      error,
      endpoint: "/api/chat",
      method: "POST",
      userId: req.user?.id,
      details: {
        modelRequested: req.body?.model,
      },
      suggestion: isRateLimit
        ? "Gemini API rate limit or quota exceeded. Consider switching model to gemini-2.5-flash or waiting for quota reset."
        : isAuthErr
        ? "Google Gemini API key appears invalid or expired. Verify GOOGLE_API_KEY in server/.env."
        : "Verify network connectivity to Google Generative AI servers.",
    });

    if (!res.headersSent) {
      res.status(500).json({ error: errorMsg });
    } else {
      res.end();
    }
  }
});

export default router;
