import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
PYTHON_DIR = Path(__file__).resolve().parent
SERVER_DIR = PYTHON_DIR.parent
ROOT_DIR = SERVER_DIR.parent

# Load environment variables with priority:
# 1. server/.env
# 2. .env.local
# 3. .env
load_dotenv(SERVER_DIR / ".env")
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")

PORT: int = int(os.getenv("PYTHON_PORT", "8000"))
HOST: str = os.getenv("PYTHON_HOST", "0.0.0.0")

GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
AUTH_SECRET: str = os.getenv("AUTH_SECRET") or os.getenv("NEXTAUTH_SECRET") or "default_secret"

CHROMA_PERSIST_DIR: str = str(PYTHON_DIR / "chroma_db")
UPLOAD_DIR: str = str(PYTHON_DIR / "uploads")

# Ensure directories exist
os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
