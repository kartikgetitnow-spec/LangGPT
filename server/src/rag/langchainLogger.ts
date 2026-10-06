import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { LLMResult } from "@langchain/core/outputs";

const CYAN = "\x1b[96m";
const GREEN = "\x1b[92m";
const YELLOW = "\x1b[93m";
const MAGENTA = "\x1b[95m";
const RED = "\x1b[91m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

export class LangChainLoggingMiddleware extends BaseCallbackHandler {
  name = "LangChainLoggingMiddleware";
  private traceName: string;
  private chainStartTime: number = 0;
  private llmStartTime: number = 0;
  private tokenCount: number = 0;

  constructor(traceName: string = "LangGPT-RAG-Chain") {
    super();
    this.traceName = traceName;
  }

  // --------------------------------------------------------------------------
  // Chain Lifecycle Logging
  // --------------------------------------------------------------------------
  handleChainStart(
    chain: { id: string[] },
    inputs: Record<string, unknown>,
    _runId: string,
    _parentRunId?: string,
    _tags?: string[],
    _metadata?: Record<string, unknown>,
    _runType?: string,
    name?: string
  ): void {
    this.chainStartTime = performance.now();
    this.tokenCount = 0;
    const chainName = name || (chain.id && chain.id[chain.id.length - 1]) || this.traceName;
    const inputKeys = Object.keys(inputs);
    const query = typeof inputs.question === "string" ? inputs.question.slice(0, 80) : "";
    const preview = query ? ` - Query: "${query}..."` : "";

    console.log(
      `\n${CYAN}[LangChain:Chain Start]${RESET} ${BOLD}${chainName}${RESET} (Inputs: [${inputKeys.join(", ")}])${preview}`
    );
  }

  handleChainEnd(_outputs: Record<string, unknown>, _runId: string): void {
    const durationMs = performance.now() - this.chainStartTime;
    console.log(
      `${CYAN}[LangChain:Chain End]${RESET} Total Duration: ${BOLD}${durationMs.toFixed(1)}ms${RESET} | Tokens Streamed: ${BOLD}${this.tokenCount}${RESET}\n`
    );
  }

  handleChainError(err: Error | unknown, _runId: string): void {
    const durationMs = performance.now() - this.chainStartTime;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `${RED}[LangChain:Chain Error]${RESET} Failed after ${durationMs.toFixed(1)}ms: ${msg}`
    );
  }

  // --------------------------------------------------------------------------
  // LLM Lifecycle Logging
  // --------------------------------------------------------------------------
  handleLLMStart(
    _llm: { id: string[] },
    prompts: string[],
    _runId: string,
    _parentRunId?: string,
    extraParams?: Record<string, unknown>,
    _tags?: string[],
    _metadata?: Record<string, unknown>,
    name?: string
  ): void {
    this.llmStartTime = performance.now();
    this.tokenCount = 0;
    const modelName = name || (extraParams?.model as string) || (extraParams?.modelName as string) || "Gemini";
    const totalChars = prompts.reduce((sum, p) => sum + p.length, 0);

    console.log(
      `${GREEN}[LangChain:LLM Start]${RESET} Model: ${BOLD}${modelName}${RESET} | Prompt Size: ${totalChars} chars`
    );
  }

  handleLLMNewToken(_token: string): void {
    this.tokenCount += 1;
  }

  handleLLMEnd(_output: LLMResult, _runId: string): void {
    const durationMs = performance.now() - this.llmStartTime;
    const tokensPerSec = durationMs > 0 ? (this.tokenCount / (durationMs / 1000)) : 0;
    console.log(
      `${GREEN}[LangChain:LLM Complete]${RESET} Duration: ${BOLD}${durationMs.toFixed(1)}ms${RESET} | Generated: ${BOLD}${this.tokenCount} tokens${RESET} (${tokensPerSec.toFixed(1)} tps)`
    );
  }

  handleLLMError(err: Error | unknown, _runId: string): void {
    const durationMs = performance.now() - this.llmStartTime;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `${RED}[LangChain:LLM Error]${RESET} LLM call failed after ${durationMs.toFixed(1)}ms: ${msg}`
    );
  }

  // --------------------------------------------------------------------------
  // Retriever & VectorDB Logging
  // --------------------------------------------------------------------------
  logRetrieverQuery(
    query: string,
    userId: string,
    resultsCount: number,
    durationMs: number,
    sources: string[]
  ): void {
    const uniqueSources = sources.length > 0 ? Array.from(new Set(sources)) : ["None"];
    console.log(
      `${MAGENTA}[LangChain:Retriever]${RESET} Query: "${query.slice(0, 60)}..." | Found: ${BOLD}${resultsCount} chunks${RESET} (${durationMs.toFixed(1)}ms) | Sources: [${uniqueSources.join(", ")}] | User: ${userId}`
    );
  }
}
