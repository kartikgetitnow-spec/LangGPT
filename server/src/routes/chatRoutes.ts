import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getServerConfig } from "@/server/config/env";
import { ConversationOrchestrator } from "@/server/chains/conversationOrchestrator";

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

    const stream = await ConversationOrchestrator.streamConversation({
      conversationId: conversationId || "default-session",
      messages,
      model,
      userProfile,
      userId,
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
    if (!res.headersSent) {
      res.status(500).json({ error: errorMsg });
    } else {
      res.end();
    }
  }
});

export default router;
