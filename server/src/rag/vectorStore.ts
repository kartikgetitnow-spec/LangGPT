import fs from "fs";
import path from "path";
import crypto from "crypto";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export interface VectorChunkMetadata {
  userId: string;
  conversationId: string;
  filename: string;
  chunkIndex: number;
  totalChunks: number;
  createdAt: string;
}

export interface VectorChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: VectorChunkMetadata;
}

export interface SearchResult {
  content: string;
  metadata: VectorChunkMetadata;
  similarity: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export class VectorStoreManager {
  private chunks: Map<string, VectorChunk> = new Map();
  private persistPath: string;
  private splitter: RecursiveCharacterTextSplitter;
  private embeddings: GoogleGenerativeAIEmbeddings | null = null;
  private isSaving: boolean = false;
  private pendingSave: boolean = false;

  constructor() {
    this.persistPath = path.join(process.cwd(), "server", "data", "vectors.json");
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });

    this.initEmbeddings();
    this.loadFromDisk();
  }

  private getEmbeddings(): GoogleGenerativeAIEmbeddings | null {
    if (!this.embeddings) {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (apiKey) {
        this.embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey,
          model: process.env.EMBEDDING_MODEL || "models/gemini-embedding-001",
        });
      }
    }
    return this.embeddings;
  }

  private initEmbeddings(): void {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey,
        model: process.env.EMBEDDING_MODEL || "models/gemini-embedding-001",
      });
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, "utf-8");
        const parsed: VectorChunk[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const chunk of parsed) {
            this.chunks.set(chunk.id, chunk);
          }
          console.log(`📦 [VectorStore] Loaded ${this.chunks.size} chunks from ${this.persistPath}`);
        }
      }
    } catch (err) {
      console.error("❌ [VectorStore] Error loading persistent vectors from disk:", err);
    }
  }

  private async saveToDisk(): Promise<void> {
    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }
    this.isSaving = true;
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = JSON.stringify(Array.from(this.chunks.values()), null, 2);
      await fs.promises.writeFile(this.persistPath, data, "utf-8");
    } catch (err) {
      console.error("❌ [VectorStore] Failed to persist vectors to disk:", err);
    } finally {
      this.isSaving = false;
      if (this.pendingSave) {
        this.pendingSave = false;
        this.saveToDisk();
      }
    }
  }

  /**
   * Generates a simple hash-based pseudo embedding if Google API is unavailable.
   */
  private generateFallbackEmbedding(text: string, dimensions: number = 64): number[] {
    const vec = new Array(dimensions).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    for (const w of words) {
      let hash = 0;
      for (let i = 0; i < w.length; i++) {
        hash = (hash * 31 + w.charCodeAt(i)) >>> 0;
      }
      const idx = hash % dimensions;
      vec[idx] += 1;
    }
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) vec[i] /= norm;
    }
    return vec;
  }

  private async embedTexts(texts: string[]): Promise<number[][]> {
    const embeddings = this.getEmbeddings();
    if (embeddings) {
      try {
        return await embeddings.embedDocuments(texts);
      } catch (err) {
        console.error("⚠️ [VectorStore] Failed to generate Google embeddings, falling back to local:", err);
      }
    }
    return texts.map((t) => this.generateFallbackEmbedding(t));
  }

  private async embedSingleQuery(query: string): Promise<number[]> {
    const embeddings = this.getEmbeddings();
    if (embeddings) {
      try {
        return await embeddings.embedQuery(query);
      } catch (err) {
        console.error("⚠️ [VectorStore] Failed to generate Google query embedding, falling back to local:", err);
      }
    }
    return this.generateFallbackEmbedding(query);
  }

  /**
   * Splits raw document text, computes embeddings, and indexes chunks.
   */
  async addDocument(
    rawText: string,
    userId: string,
    conversationId: string = "default",
    filename: string
  ): Promise<{ filename: string; chunks_stored: number; user_id: string; conversation_id: string }> {
    if (!rawText || !rawText.trim()) {
      throw new Error("Document contains no readable text content.");
    }

    const textChunks = await this.splitter.splitText(rawText);
    if (!textChunks || textChunks.length === 0) {
      throw new Error("No chunks produced from document.");
    }

    const embeddings = await this.embedTexts(textChunks);
    const now = new Date().toISOString();

    for (let idx = 0; idx < textChunks.length; idx++) {
      const chunkId = `${userId}_${conversationId}_${encodeURIComponent(filename)}_${idx}_${crypto.randomBytes(4).toString("hex")}`;
      const chunk: VectorChunk = {
        id: chunkId,
        content: textChunks[idx],
        embedding: embeddings[idx],
        metadata: {
          userId: String(userId),
          conversationId: String(conversationId),
          filename,
          chunkIndex: idx,
          totalChunks: textChunks.length,
          createdAt: now,
        },
      };
      this.chunks.set(chunkId, chunk);
    }

    await this.saveToDisk();

    return {
      filename,
      chunks_stored: textChunks.length,
      user_id: userId,
      conversation_id: conversationId,
    };
  }

  /**
   * Searches for top-k chunks with highest cosine similarity to the query, scoped to userId.
   */
  async similaritySearch(
    query: string,
    userId: string,
    conversationId?: string,
    topK: number = 4
  ): Promise<SearchResult[]> {
    const userChunks: VectorChunk[] = [];

    // Multi-tenant isolation: filter strictly by user_id
    for (const chunk of this.chunks.values()) {
      if (chunk.metadata.userId === String(userId)) {
        userChunks.push(chunk);
      }
    }

    if (userChunks.length === 0) {
      return [];
    }

    // If conversationId is specified, prioritize matching chunks in that conversation
    let targetChunks = userChunks;
    if (conversationId && conversationId !== "default") {
      const convFiltered = userChunks.filter((c) => c.metadata.conversationId === conversationId);
      if (convFiltered.length > 0) {
        targetChunks = convFiltered;
      }
    }

    const queryEmbedding = await this.embedSingleQuery(query);

    const scored = targetChunks.map((chunk) => {
      const sim = cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        content: chunk.content,
        metadata: chunk.metadata,
        similarity: sim,
      };
    });

    // Sort descending by similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topK);
  }

  /**
   * Lists unique documents uploaded by user.
   */
  listDocuments(userId: string, conversationId?: string): Array<{ filename: string; chunk_count: number }> {
    const counts = new Map<string, number>();

    for (const chunk of this.chunks.values()) {
      if (chunk.metadata.userId !== String(userId)) continue;
      if (conversationId && conversationId !== "default" && chunk.metadata.conversationId !== conversationId) {
        continue;
      }
      const fn = chunk.metadata.filename;
      counts.set(fn, (counts.get(fn) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([filename, chunk_count]) => ({
      filename,
      chunk_count,
    }));
  }

  /**
   * Deletes all chunks associated with a specific document for a user.
   */
  async deleteDocument(userId: string, filename: string, conversationId?: string): Promise<number> {
    let deletedCount = 0;
    const toDelete: string[] = [];

    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.metadata.userId !== String(userId)) continue;
      if (chunk.metadata.filename !== filename) continue;
      if (conversationId && conversationId !== "default" && chunk.metadata.conversationId !== conversationId) {
        continue;
      }
      toDelete.push(id);
    }

    for (const id of toDelete) {
      this.chunks.delete(id);
      deletedCount++;
    }

    if (deletedCount > 0) {
      await this.saveToDisk();
    }

    return deletedCount;
  }
}

export const vectorStore = new VectorStoreManager();
