import { Router, Request, Response } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import { DocumentLoader } from "../rag/documentLoader";
import { vectorStore } from "../rag/vectorStore";
import { ragPipeline } from "../rag/ragPipeline";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * POST /api/rag/upload
 * 1. Authenticates user identity via authMiddleware.
 * 2. Parses uploaded PDF or text-based document in Node.js.
 * 3. Chunks text and computes Google Generative AI embeddings.
 * 4. Persists vector chunks with multi-tenant user/conversation isolation.
 */
router.post("/upload", authMiddleware, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    const conversationId = (req.body?.conversation_id as string) || "default";
    const filename = req.file.originalname || "uploaded_doc";

    // Extract text from uploaded file buffer
    const extractedText = await DocumentLoader.extractText(req.file.buffer, filename);

    // Split, embed, and index into VectorStore
    const result = await vectorStore.addDocument(extractedText, userId, conversationId, filename);

    return res.status(200).json({
      success: true,
      message: `Successfully indexed '${filename}' into VectorDB.`,
      data: result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to process and index document";
    console.error("❌ [RAG Route: Upload Error]:", error);
    return res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/rag/query
 * 1. Authenticates user identity.
 * 2. Retrieves top-k semantically relevant chunks from VectorStore.
 * 3. Compiles RAG prompt and streams LangChain response back via chunked transfer.
 */
router.post("/query", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { query, conversation_id = "default", model, top_k = 4 } = req.body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Query string cannot be empty." });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const stream = ragPipeline.queryAndStream({
      query: query.trim(),
      userId,
      conversationId: conversation_id,
      modelName: model,
      topK: Number(top_k) || 4,
    });

    for await (const chunk of stream) {
      res.write(chunk);
    }

    return res.end();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "RAG Query failed";
    console.error("❌ [RAG Route: Query Error]:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: msg });
    }
    res.write(`\n\n[RAG query error: ${msg}]`);
    return res.end();
  }
});

/**
 * GET /api/rag/documents
 * Lists all active files stored in VectorDB for authenticated user.
 */
router.get("/documents", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const convId = req.query.conversation_id ? String(req.query.conversation_id) : undefined;
    const documents = vectorStore.listDocuments(userId, convId);
    return res.status(200).json({ documents });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to list documents";
    console.error("❌ [RAG Route: List Documents Error]:", error);
    return res.status(500).json({ error: msg });
  }
});

/**
 * DELETE /api/rag/documents/:filename
 * Removes all vector embeddings for a specific document for authenticated user.
 */
router.delete("/documents/:filename", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawFilename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const filename = decodeURIComponent(String(rawFilename || ""));
    const convId = req.query.conversation_id ? String(req.query.conversation_id) : undefined;

    const count = await vectorStore.deleteDocument(userId, filename, convId);
    return res.status(200).json({
      success: true,
      message: `Document '${filename}' removed from VectorDB (${count} chunks deleted).`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete document";
    console.error("❌ [RAG Route: Delete Document Error]:", error);
    return res.status(500).json({ error: msg });
  }
});

export default router;
