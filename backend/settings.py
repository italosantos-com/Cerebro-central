from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
VECTOR_DIR = DATA_DIR / "vector_db"
KNOWLEDGE_DIR = BASE_DIR / "knowledge"
PROJECTS_DIR = BASE_DIR / "projects"

INDEX_PATH = VECTOR_DIR / "index.bin"
DOCS_PATH = VECTOR_DIR / "docs.pkl"
CACHE_PATH = VECTOR_DIR / "embedding_cache.pkl"

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

OLLAMA_ENDPOINT = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434/api/generate")
OLLAMA_TAGS_ENDPOINT = os.getenv("OLLAMA_TAGS_ENDPOINT", "http://localhost:11434/api/tags")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-coder:6.7b")

LLM_RUNTIME = os.getenv("LLM_RUNTIME", "auto")  # auto | ollama | llamacpp | offline
LLAMACPP_BINARY = os.getenv("LLAMACPP_BINARY", "llama-cli")
LLAMACPP_MODEL_PATH = os.getenv("LLAMACPP_MODEL_PATH", str(BASE_DIR / "models" / "codellama-7b-instruct.Q4_K_M.gguf"))
LLAMACPP_OPTIONS = {
    "num_ctx": int(os.getenv("LLAMACPP_NUM_CTX", "1024")),
    "num_thread": int(os.getenv("LLAMACPP_NUM_THREAD", "4")),
    "temperature": float(os.getenv("LLAMACPP_TEMPERATURE", "0.2")),
    "top_p": float(os.getenv("LLAMACPP_TOP_P", "0.9")),
    "num_predict": int(os.getenv("LLAMACPP_NUM_PREDICT", "160")),
}

OLLAMA_OPTIONS = {
    "num_ctx": 1024,
    "num_thread": 4,
    "temperature": 0.2,
    "num_predict": 120,
    "top_p": 0.9,
}

INDEXING_CONFIG = {
    "chunk_size": 1200,
    "chunk_overlap": 150,
    "top_k": 3,
    "watch_debounce_seconds": 1.2,
    "max_file_bytes": 4_000_000,
    "max_chunks_per_file": 60,
}

AUTO_REINDEX_ENABLED = os.getenv("AUTO_REINDEX_ENABLED", "1") == "1"
METRICS_WINDOW_SIZE = int(os.getenv("METRICS_WINDOW_SIZE", "200"))

ALLOWED_EXT = {".py", ".html", ".css", ".js", ".ts", ".tsx", ".jsx", ".md", ".json", ".jsonl"}

IGNORED_FILE_SUFFIXES = {
    "weights_manifest.json",
    ".min.js",
    ".min.css",
    ".map",
}

IGNORED_FILE_NAMES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
}

IGNORED_PATH_KEYWORDS = {
    "/public/models/",
}

IGNORED_DIRS = {
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    ".git",
    "dist",
    "build",
    "vector_db",
    ".vscode",
}
