from __future__ import annotations

from pathlib import Path

from backend.settings import ALLOWED_EXT, IGNORED_DIRS, INDEXING_CONFIG


def _should_ignore(path: Path) -> bool:
    return any(part in IGNORED_DIRS for part in path.parts)


def collect_files(root_path: Path) -> list[Path]:
    files: list[Path] = []
    for path in root_path.rglob("*"):
        if not path.is_file():
            continue
        if _should_ignore(path):
            continue
        if path.suffix.lower() not in ALLOWED_EXT:
            continue
        files.append(path)
    return files


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    chunks: list[str] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(text), step):
        chunk = text[start : start + chunk_size]
        if chunk.strip():
            chunks.append(chunk)
        if start + chunk_size >= len(text):
            break
    return chunks


def build_documents(project_root: Path) -> list[dict]:
    documents: list[dict] = []
    files = collect_files(project_root)

    for file_path in files:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        chunks = chunk_text(
            content,
            chunk_size=INDEXING_CONFIG["chunk_size"],
            overlap=INDEXING_CONFIG["chunk_overlap"],
        )
        rel_path = str(file_path.relative_to(project_root))
        for idx, chunk in enumerate(chunks):
            documents.append(
                {
                    "id": f"{rel_path}#{idx}",
                    "path": rel_path,
                    "chunk": idx,
                    "content": chunk,
                }
            )

    return documents
