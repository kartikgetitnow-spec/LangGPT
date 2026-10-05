import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from config import PORT, HOST
from auth import get_current_user
from rag.document_loader import DocumentLoader
from rag.vector_store import vector_store
from rag.rag_pipeline import rag_pipeline

app = FastAPI(
    title="LangGPT Python RAG & AI Engine",
    description="High-performance VectorDB, LangChain, and Document RAG service for LangGPT",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP Request Logging Middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000
    user_header = request.headers.get("x-user-id", "anonymous")
    status_color = "\033[92m" if response.status_code < 400 else "\033[91m"
    print(
        f"\033[94m[FastAPI:HTTP]\033[0m {request.method} {request.url.path} -> "
        f"{status_color}{response.status_code}\033[0m ({duration_ms:.1f}ms) | User: {user_header}"
    )
    return response

class RAGQueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = "default"
    model: Optional[str] = "gemini-2.5-flash"
    top_k: Optional[int] = 4

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "LangGPT Python RAG Engine",
        "vector_store": "ChromaDB (Persistent)",
        "framework": "FastAPI + LangChain",
    }

@app.post("/api/rag/upload")
async def upload_document(
    file: UploadFile = File(...),
    conversation_id: str = Form("default"),
    current_user: dict = Depends(get_current_user)
):
    """
    Protected Endpoint:
    1. Authenticates user identity.
    2. Parses PDF or text document.
    3. Chunks text and computes vector embeddings.
    4. Persists vectors to ChromaDB with user/conversation isolation.
    """
    user_id = current_user["id"]

    try:
        content_bytes = await file.read()
        if not content_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Extract text from PDF / text file
        extracted_text = DocumentLoader.extract_text(content_bytes, file.filename or "uploaded_doc")

        # Chunk and index into Chroma Vector DB
        result = vector_store.add_document(
            raw_text=extracted_text,
            user_id=user_id,
            conversation_id=conversation_id,
            filename=file.filename or "uploaded_doc"
        )

        return {
            "success": True,
            "message": f"Successfully indexed '{file.filename}' into VectorDB.",
            "data": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process and index document: {str(e)}"
        )

@app.post("/api/rag/query")
async def query_rag(
    request: RAGQueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Protected Endpoint:
    1. Authenticates user identity.
    2. Retrieves top-k semantically relevant chunks from ChromaDB.
    3. Generates and streams LangChain RAG response via SSE/chunked stream.
    """
    user_id = current_user["id"]

    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    # Stream answer back to client
    return StreamingResponse(
        rag_pipeline.query_and_stream(
            query=request.query.strip(),
            user_id=user_id,
            conversation_id=request.conversation_id,
            model_name=request.model or "gemini-2.5-flash",
            top_k=request.top_k or 4
        ),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/rag/documents")
async def list_documents(
    conversation_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Protected Endpoint: Lists all active files stored in VectorDB for this user.
    """
    user_id = current_user["id"]
    files = vector_store.list_documents(user_id=user_id, conversation_id=conversation_id)
    return {"documents": files}

@app.delete("/api/rag/documents/{filename}")
async def delete_document(
    filename: str,
    conversation_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Protected Endpoint: Removes all vector embeddings for a specific document.
    """
    user_id = current_user["id"]
    vector_store.delete_document(user_id=user_id, filename=filename, conversation_id=conversation_id)
    return {"success": True, "message": f"Document '{filename}' removed from VectorDB."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
