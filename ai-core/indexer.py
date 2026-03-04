from __future__ import annotations

import hashlib
import json
from pathlib import Path

from config import (
    ALLOWED_EXT,
    IGNORED_DIRS,
    INDEXING_CONFIG,
    KNOWLEDGE_DIR,
    META_PATH,
    PROJECTS_DIR,
)
from embeddings import create_embeddings, save_index


def _should_ignore(path: Path) -> bool:
    return any(part in IGNORED_DIRS for part in path.parts)


def _collect_files(base_path: Path) -> list[Path]:
    files: list[Path] = []
    if not base_path.exists():
        return files

    for path in base_path.rglob("*"):
        if not path.is_file():
            continue
        if _should_ignore(path):
            continue
        if path.suffix.lower() not in ALLOWED_EXT:
            continue
        files.append(path)
    return files


def _chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(text), step):
        chunk = text[start : start + chunk_size]
        if chunk.strip():
            chunks.append(chunk)
        if start + chunk_size >= len(text):
            break
    return chunks


def _file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            block = handle.read(1024 * 64)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def _load_meta() -> dict:
    if not META_PATH.exists():
        return {"files": {}}
    with META_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_meta(meta: dict) -> None:
    META_PATH.parent.mkdir(parents=True, exist_ok=True)
    with META_PATH.open("w", encoding="utf-8") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def build_documents() -> tuple[list[dict], dict]:
    meta = _load_meta()
    current_files: dict[str, str] = {}
    documents: list[dict] = []

    all_files = _collect_files(PROJECTS_DIR) + _collect_files(KNOWLEDGE_DIR)

    for file_path in all_files:
        rel = str(file_path)
        file_digest = _file_hash(file_path)
        current_files[rel] = file_digest

        content = file_path.read_text(encoding="utf-8", errors="ignore")
        chunks = _chunk_text(
            content,
            chunk_size=INDEXING_CONFIG["chunk_size"],
            overlap=INDEXING_CONFIG["chunk_overlap"],
        )

        for idx, chunk in enumerate(chunks):
            documents.append(
                {
                    "id": f"{rel}#{idx}",
                    "path": rel,
                    "chunk": idx,
                    "content": chunk,
                }
            )

    meta["files"] = current_files
    _save_meta(meta)
    return documents, meta


def rebuild_index() -> int:
    documents, _ = build_documents()
    texts = [doc["content"] for doc in documents]
    vectors = create_embeddings(texts) if texts else create_embeddings([""])[0:0]
    save_index(vectors, documents)
    return len(documents)
