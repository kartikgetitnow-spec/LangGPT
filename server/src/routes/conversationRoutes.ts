import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { ChatRepository } from "@/server/db/chatRepository";

const router = Router();

// GET /api/conversations (list all conversations for authenticated user)
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = await ChatRepository.getUserConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error in GET /api/conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// DELETE /api/conversations (clear all conversations)
router.delete("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await ChatRepository.clearAllConversations(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/conversations:", error);
    res.status(500).json({ error: "Failed to clear conversations" });
  }
});

// GET /api/conversations/:id (messages for a single conversation)
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const messages = await ChatRepository.getConversationMessages(id);
    res.json(messages);
  } catch (error) {
    console.error("Error in GET /api/conversations/:id:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// PATCH /api/conversations/:id (rename or toggle pin)
router.patch("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.id;
    const body = req.body;

    if (typeof body.title === "string") {
      await ChatRepository.renameConversation(id, userId, body.title);
      return res.json({ success: true, title: body.title });
    }

    if (body.togglePin) {
      const isPinned = await ChatRepository.togglePinConversation(id, userId);
      return res.json({ success: true, isPinned });
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Error in PATCH /api/conversations/:id:", error);
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

// DELETE /api/conversations/:id (delete single conversation)
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.id;
    await ChatRepository.deleteConversation(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/conversations/:id:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
