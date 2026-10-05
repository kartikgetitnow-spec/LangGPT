import time
import logging
from typing import Any, Dict, List, Optional
from langchain_core.callbacks import AsyncCallbackHandler, BaseCallbackHandler
from langchain_core.outputs import LLMResult

# Configure base Python logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("LangChain")

# ANSI Color formatting for terminal clarity
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

class LangChainLoggingMiddleware(AsyncCallbackHandler, BaseCallbackHandler):
    """
    Comprehensive LangChain Logging & Tracing Middleware:
    - Logs chain start/end lifecycle with parameter summaries
    - Logs LLM invocations, model names, prompt previews
    - Tracks streaming token counts and token generation latency
    - Logs retrieval operations and similarity results
    - Captures and formats errors across all pipeline stages
    """

    def __init__(self, trace_name: str = "RAG-Pipeline"):
        super().__init__()
        self.trace_name = trace_name
        self.chain_start_time: float = 0.0
        self.llm_start_time: float = 0.0
        self.token_count: int = 0

    # --------------------------------------------------------------------------
    # Chain Lifecycle Logging
    # --------------------------------------------------------------------------
    async def on_chain_start(
        self,
        serialized: Optional[Dict[str, Any]],
        inputs: Dict[str, Any],
        **kwargs: Any
    ) -> None:
        self.chain_start_time = time.perf_counter()
        self.token_count = 0
        name = (serialized.get("name") or serialized.get("id", ["Chain"])[-1]) if serialized else self.trace_name
        keys = list(inputs.keys())
        query_preview = inputs.get("question", "")[:80]
        if query_preview:
            query_preview = f' - Query: "{query_preview}..."'
        print(f"\n{CYAN}[LangChain:Chain Start]{RESET} {BOLD}{name}{RESET} (Inputs: {keys}){query_preview}")

    async def on_chain_end(self, outputs: Dict[str, Any], **kwargs: Any) -> None:
        duration_ms = (time.perf_counter() - self.chain_start_time) * 1000
        print(f"{CYAN}[LangChain:Chain End]{RESET} Total Duration: {BOLD}{duration_ms:.1f}ms{RESET} | Tokens Streamed: {BOLD}{self.token_count}{RESET}\n")

    async def on_chain_error(self, error: BaseException, **kwargs: Any) -> None:
        duration_ms = (time.perf_counter() - self.chain_start_time) * 1000
        print(f"{RED}[LangChain:Chain Error]{RESET} Failed after {duration_ms:.1f}ms: {error}")

    # --------------------------------------------------------------------------
    # LLM Lifecycle Logging
    # --------------------------------------------------------------------------
    async def on_llm_start(
        self,
        serialized: Optional[Dict[str, Any]],
        prompts: List[str],
        **kwargs: Any
    ) -> None:
        self.llm_start_time = time.perf_counter()
        self.token_count = 0
        model = kwargs.get("invocation_params", {}).get("model", "Gemini")
        total_prompt_chars = sum(len(p) for p in prompts)
        print(f"{GREEN}[LangChain:LLM Start]{RESET} Model: {BOLD}{model}{RESET} | Prompt Size: {total_prompt_chars} chars")

    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        self.token_count += 1

    async def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        duration_ms = (time.perf_counter() - self.llm_start_time) * 1000
        tokens_per_sec = (self.token_count / (duration_ms / 1000)) if duration_ms > 0 else 0
        print(
            f"{GREEN}[LangChain:LLM Complete]{RESET} Duration: {BOLD}{duration_ms:.1f}ms{RESET} "
            f"| Generated: {BOLD}{self.token_count} tokens{RESET} ({tokens_per_sec:.1f} tps)"
        )

    async def on_llm_error(self, error: BaseException, **kwargs: Any) -> None:
        duration_ms = (time.perf_counter() - self.llm_start_time) * 1000
        print(f"{RED}[LangChain:LLM Error]{RESET} LLM call failed after {duration_ms:.1f}ms: {error}")

    # --------------------------------------------------------------------------
    # Retriever & VectorDB Logging
    # --------------------------------------------------------------------------
    def log_retriever_query(self, query: str, user_id: str, results_count: int, duration_ms: float, sources: List[str]) -> None:
        unique_sources = list(set(sources)) if sources else ["None"]
        print(
            f"{MAGENTA}[LangChain:Retriever]{RESET} Query: \"{query[:60]}...\" "
            f"| Found: {BOLD}{results_count} chunks{RESET} ({duration_ms:.1f}ms) "
            f"| Sources: {unique_sources} | User: {user_id}"
        )
