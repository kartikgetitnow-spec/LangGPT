import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const PYTHON_RAG_URL = process.env.PYTHON_RAG_URL || "http://localhost:8000";

// POST /api/rag/upload - Proxy multipart file upload to Python FastAPI RAG engine
router.post("/upload", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Pipe the raw request stream directly to FastAPI to handle multipart form data efficiently
    const pythonRes = await fetch(`${PYTHON_RAG_URL}/api/rag/upload`, {
      method: "POST",
      headers: {
        "x-user-id": userId,
        "x-user-email": req.user?.email || "",
        "content-type": req.headers["content-type"] || "",
      },
      // Node.js 18+ fetch supports body streams (duplex: 'half' for Node runtime)
      body: req as unknown as BodyInit,
      // @ts-ignore
      duplex: "half",
    });

    const data = await pythonRes.json();
    return res.status(pythonRes.status).json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to connect to Python RAG service";
    console.error("Error proxying /api/rag/upload to Python server:", error);
    return res.status(502).json({ error: `RAG upload error: ${msg}` });
  }
});

// POST /api/rag/query - Proxy query to Python FastAPI and stream answer
router.post("/query", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const pythonRes = await fetch(`${PYTHON_RAG_URL}/api/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-user-email": req.user?.email || "",
      },
      body: JSON.stringify(req.body),
    });

    if (!pythonRes.ok) {
      const errText = await pythonRes.text();
      return res.status(pythonRes.status).json({ error: errText });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (pythonRes.body) {
      const reader = pythonRes.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    }
    return res.end();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "RAG Query service unavailable";
    console.error("Error proxying /api/rag/query to Python server:", error);
    return res.status(502).json({ error: `RAG query error: ${msg}` });
  }
});

// GET /api/rag/documents - List files indexed in ChromaDB for user
router.get("/documents", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const convId = req.query.conversation_id ? `?conversation_id=${encodeURIComponent(String(req.query.conversation_id))}` : "";
    const pythonRes = await fetch(`${PYTHON_RAG_URL}/api/rag/documents${convId}`, {
      headers: {
        "x-user-id": userId,
      },
    });
    const data = await pythonRes.json();
    return res.status(pythonRes.status).json(data);
  } catch (error: unknown) {
    return res.status(502).json({ error: "Failed to fetch indexed documents from Python RAG service" });
  }
});

// DELETE /api/rag/documents/:filename - Remove document vectors from ChromaDB
router.delete("/documents/:filename", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const filename = encodeURIComponent(String(req.params.filename));
    const pythonRes = await fetch(`${PYTHON_RAG_URL}/api/rag/documents/${filename}`, {
      method: "DELETE",
      headers: {
        "x-user-id": userId,
      },
    });
    const data = await pythonRes.json();
    return res.status(pythonRes.status).json(data);
  } catch (error: unknown) {
    return res.status(502).json({ error: "Failed to delete document from Python RAG service" });
  }
});

export default router;
