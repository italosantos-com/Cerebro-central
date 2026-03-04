from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
VECTOR_DIR = BASE_DIR / "vector_db"
KNOWLEDGE_DIR = BASE_DIR / "knowledge"
PROJECTS_DIR = BASE_DIR / "projects"

INDEX_PATH = VECTOR_DIR / "index.bin"
DOCS_PATH = VECTOR_DIR / "docs.pkl"
META_PATH = VECTOR_DIR / "meta.json"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"

OLLAMA_ENDPOINT = "http://localhost:11434/api/generate"
OLLAMA_TAGS_ENDPOINT = "http://localhost:11434/api/tags"

OLLAMA_CONFIG = {
    "model": "deepseek-coder:6.7b-instruct-q4_K_M",
    "num_ctx": 1024,
    "num_thread": 4,
    "temperature": 0.2,
    "top_p": 0.9,
}

INDEXING_CONFIG = {
    "chunk_size": 1200,
    "chunk_overlap": 150,
    "top_k": 3,
    "watch_debounce_seconds": 1.0,
}

IGNORED_DIRS = {
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git",
    "public",
    "coverage",
    "__pycache__",
    "venv",
    ".venv",
}

ALLOWED_EXT = {".js", ".ts", ".tsx", ".jsx", ".py", ".md", ".json"}
