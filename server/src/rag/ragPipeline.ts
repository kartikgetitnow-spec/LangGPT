import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { vectorStore } from "./vectorStore";
import { LangChainLoggingMiddleware } from "./langchainLogger";

export const RAG_PROMPT_TEMPLATE = `You are an intelligent AI assistant powered by LangGPT with Retrieval-Augmented Generation (RAG).
You have access to context extracted from documents uploaded by the user.

Use the provided context to answer the user's question accurately.
- Cite the source filename when referencing specific facts.
- If the answer cannot be found in the context, clearly state that, then provide the best helpful answer based on your general knowledge.

=== RETRIEVED CONTEXT ===
{context}
=========================

User Question:
{question}
`;

export interface RAGQueryOptions {
  query: string;
  userId: string;
  conversationId?: string;
  modelName?: string;
  topK?: number;
}

export class RAGPipeline {
  /**
   * Executes similarity search, compiles LangChain prompt with retrieved chunks,
   * invokes Google Gemini via LangChain, and streams the answer back.
   */
  async *queryAndStream(options: RAGQueryOptions): AsyncGenerator<string, void, unknown> {
    const {
      query,
      userId,
      conversationId = "default",
      modelName,
      topK = 4,
    } = options;

    const defaultModel = process.env.DEFAULT_AI_MODEL || "gemini-2.5-flash-lite";
    const preferredModel = modelName || defaultModel;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      yield "⚠️ **Google Gemini API Key is missing** in `server/.env`. Please add `GOOGLE_API_KEY` to enable AI generation.";
      return;
    }

    const loggingMiddleware = new LangChainLoggingMiddleware("LangGPT-RAG-Chain");

    // 1. Similarity search in VectorStore with timing
    const retrievalStart = performance.now();
    let results: Awaited<ReturnType<typeof vectorStore.similaritySearch>> = [];
    try {
      results = await vectorStore.similaritySearch(query, userId, conversationId, topK);
    } catch (err) {
      console.error("❌ [RAGPipeline] Similarity search failed:", err);
    }
    const retrievalMs = performance.now() - retrievalStart;

    const sources = results.map((r) => r.metadata.filename);
    const contextParts = results.map(
      (item) => `[Source: ${item.metadata.filename} | Chunk ${item.metadata.chunkIndex + 1}]\n${item.content}`
    );

    // Log vector search results through middleware
    loggingMiddleware.logRetrieverQuery(query, userId, results.length, retrievalMs, sources);

    const formattedContext =
      contextParts.length > 0
        ? contextParts.join("\n\n---\n\n")
        : "No relevant documents found in the vector database.";

    // 2. Setup candidate models with automatic fallback on quota exhaustion (429)
    const modelCandidates = Array.from(
      new Set([preferredModel, defaultModel, "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"])
    );

    let streamSuccess = false;
    let lastError: unknown = null;

    for (const modelToTry of modelCandidates) {
      try {
        const llm = new ChatGoogleGenerativeAI({
          apiKey,
          model: modelToTry,
          streaming: true,
          temperature: 0.4,
          callbacks: [loggingMiddleware],
        });

        const prompt = ChatPromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);
        const chain = prompt.pipe(llm).pipe(new StringOutputParser());

        const stream = await chain.stream(
          {
            context: formattedContext,
            question: query,
          },
          {
            callbacks: [loggingMiddleware],
          }
        );

        for await (const chunk of stream) {
          if (chunk) {
            yield chunk;
          }
        }

        streamSuccess = true;
        break; // Successfully finished generation
      } catch (err: unknown) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isQuotaError = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("QuotaExceeded");

        if (isQuotaError && modelToTry !== modelCandidates[modelCandidates.length - 1]) {
          console.warn(`⚠️ [RAGPipeline] Model ${modelToTry} quota exceeded, falling back to next available model...`);
          continue;
        } else {
          loggingMiddleware.handleChainError(err, "chain-error");
          break;
        }
      }
    }

    if (!streamSuccess && lastError) {
      const msg = lastError instanceof Error ? lastError.message : String(lastError);
      yield `\n\n[Error generating RAG response: ${msg}]`;
    }
  }
}

export const ragPipeline = new RAGPipeline();
