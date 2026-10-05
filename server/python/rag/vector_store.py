import os
import uuid
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

from config import CHROMA_PERSIST_DIR, GOOGLE_API_KEY
from langchain_text_splitters import RecursiveCharacterTextSplitter

class VectorStoreManager:
    def __init__(self):
        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        
        # Determine embedding function (Google Gemini or Chroma Default)
        self.embedding_fn = None
        if GOOGLE_API_KEY:
            try:
                # Use Google GenAI Embedding function if available
                self.embedding_fn = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
                    api_key=GOOGLE_API_KEY,
                    model_name="models/embedding-001"
                )
            except Exception:
                self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        else:
            self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()

        # Get or create isolated collection for LangGPT RAG
        self.collection = self.client.get_or_create_collection(
            name="langgpt_documents",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def add_document(
        self,
        raw_text: str,
        user_id: str,
        conversation_id: str,
        filename: str
    ) -> Dict[str, Any]:
        """
        Splits raw text into semantic chunks and inserts them with metadata into ChromaDB.
        """
        if not raw_text.strip():
            raise ValueError("Document contains no readable text content.")

        chunks = self.text_splitter.split_text(raw_text)
        if not chunks:
            raise ValueError("No chunks produced from document.")

        ids = []
        documents = []
        metadatas = []

        for idx, chunk in enumerate(chunks):
            chunk_id = f"{user_id}_{conversation_id}_{filename}_{idx}_{uuid.uuid4().hex[:6]}"
            ids.append(chunk_id)
            documents.append(chunk)
            metadatas.append({
                "user_id": str(user_id),
                "conversation_id": str(conversation_id),
                "filename": str(filename),
                "chunk_index": idx,
                "total_chunks": len(chunks)
            })

        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

        return {
            "filename": filename,
            "chunks_stored": len(chunks),
            "user_id": user_id,
            "conversation_id": conversation_id
        }

    def similarity_search(
        self,
        query: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Searches ChromaDB for chunks matching query, scoped strictly to the authenticated user.
        """
        # Strict user scoping ensures zero cross-user data leakage
        where_filter = {"user_id": str(user_id)}
        if conversation_id:
            where_filter = {
                "$and": [
                    {"user_id": str(user_id)},
                    {"conversation_id": str(conversation_id)}
                ]
            }

        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where_filter
            )
        except Exception:
            # Fallback to broader user filter if conversation_id had 0 items
            results = self.collection.query(
                query_texts=[query],
                n_results=top_k,
                where={"user_id": str(user_id)}
            )

        output = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metadatas = results["metadatas"][0] if "metadatas" in results else []
            distances = results["distances"][0] if "distances" in results else []

            for i in range(len(docs)):
                meta = metadatas[i] if i < len(metadatas) else {}
                dist = distances[i] if i < len(distances) else None
                output.append({
                    "content": docs[i],
                    "metadata": meta,
                    "distance": dist
                })

        return output

    def list_documents(self, user_id: str, conversation_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lists unique files uploaded by the user in this conversation.
        """
        where_filter = {"user_id": str(user_id)}
        if conversation_id:
            where_filter = {
                "$and": [
                    {"user_id": str(user_id)},
                    {"conversation_id": str(conversation_id)}
                ]
            }

        data = self.collection.get(where=where_filter, include=["metadatas"])
        unique_files: Dict[str, int] = {}
        if data and "metadatas" in data and data["metadatas"]:
            for meta in data["metadatas"]:
                fn = meta.get("filename", "unknown")
                unique_files[fn] = unique_files.get(fn, 0) + 1

        return [{"filename": fn, "chunk_count": count} for fn, count in unique_files.items()]

    def delete_document(self, user_id: str, filename: str, conversation_id: Optional[str] = None) -> int:
        """
        Deletes all chunks of a specific file for a user.
        """
        where_filter = {
            "$and": [
                {"user_id": str(user_id)},
                {"filename": str(filename)}
            ]
        }
        if conversation_id:
            where_filter["$and"].append({"conversation_id": str(conversation_id)})

        self.collection.delete(where=where_filter)
        return 1

# Singleton instance
vector_store = VectorStoreManager()
