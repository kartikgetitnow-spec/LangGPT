import json
from typing import AsyncGenerator, Dict, Any, List, Optional
from config import GOOGLE_API_KEY
from rag.vector_store import vector_store

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

RAG_PROMPT_TEMPLATE = """You are an intelligent AI assistant powered by LangGPT with Retrieval-Augmented Generation (RAG).
You have access to context extracted from documents uploaded by the user.

Use the provided context to answer the user's question accurately.
- Cite the source filename when referencing specific facts.
- If the answer cannot be found in the context, clearly state that, then provide the best helpful answer based on your general knowledge.

=== RETRIEVED CONTEXT ===
{context}
=========================

User Question:
{question}
"""

class RAGPipeline:
    @staticmethod
    async def query_and_stream(
        query: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        model_name: str = "gemini-2.5-flash",
        top_k: int = 4
    ) -> AsyncGenerator[str, None]:
        """
        Executes similarity search on ChromaDB, compiles LangChain prompt with retrieved chunks,
        and streams the answer.
        """
        if not GOOGLE_API_KEY:
            yield "⚠️ **Google Gemini API Key is missing** in `server/.env`. Please add `GOOGLE_API_KEY` to enable AI generation."
            return

        # 1. Similarity search in ChromaDB
        results = vector_store.similarity_search(
            query=query,
            user_id=user_id,
            conversation_id=conversation_id,
            top_k=top_k
        )

        context_parts = []
        sources = []

        if results:
            for item in results:
                meta = item.get("metadata", {})
                fn = meta.get("filename", "Unknown Document")
                idx = meta.get("chunk_index", 0)
                sources.append(fn)
                context_parts.append(f"[Source: {fn} | Chunk {idx + 1}]\n{item['content']}")

        formatted_context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant documents found in the vector database."

        # 2. Setup LangChain Chain
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            llm = ChatGoogleGenerativeAI(
                model=model_name or "gemini-2.5-flash",
                google_api_key=GOOGLE_API_KEY,
                streaming=True,
                temperature=0.4
            )

            prompt = ChatPromptTemplate.from_template(RAG_PROMPT_TEMPLATE)
            chain = prompt | llm | StrOutputParser()

            # 3. Stream generated response chunks
            async for chunk in chain.astream({
                "context": formatted_context,
                "question": query
            }):
                if chunk:
                    yield chunk

        except Exception as e:
            yield f"\n\n[Error generating RAG response: {str(e)}]"

rag_pipeline = RAGPipeline()
