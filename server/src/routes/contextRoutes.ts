import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { localContextDb } from "@/server/db/localDb";

const router = Router();

// GET /api/context
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await localContextDb.getProfile(userId);
    res.json(profile);
  } catch (error) {
    console.error("Error in GET /api/context:", error);
    res.status(500).json({ error: "Failed to fetch context profile" });
  }
});

// POST /api/context
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profileText = typeof req.body.profileText === "string" ? req.body.profileText : "";
    const updated = await localContextDb.updateProfile(profileText, userId);
    res.json(updated);
  } catch (error) {
    console.error("Error in POST /api/context:", error);
    res.status(500).json({ error: "Failed to update context profile" });
  }
});

// DELETE /api/context
router.delete("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const reset = await localContextDb.clearProfile(userId);
    res.json(reset);
  } catch (error) {
    console.error("Error in DELETE /api/context:", error);
    res.status(500).json({ error: "Failed to reset context profile" });
  }
});

export default router;
