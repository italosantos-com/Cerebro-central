from __future__ import annotations

import pickle
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from backend.indexer import build_documents
from backend.settings import DOCS_PATH, EMBEDDING_MODEL, INDEX_PATH, INDEXING_CONFIG, VECTOR_DIR

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _create_embeddings(texts: list[str]) -> np.ndarray:
    if not texts:
        return np.asarray([], dtype="float32")
    model = _get_model()
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return np.asarray(vectors, dtype="float32")


def _save_index(vectors: np.ndarray, documents: list[dict]) -> None:
    VECTOR_DIR.mkdir(parents=True, exist_ok=True)
    if vectors.size == 0:
        index = faiss.IndexFlatIP(384)
    else:
        index = faiss.IndexFlatIP(vectors.shape[1])
        index.add(vectors)
    faiss.write_index(index, str(INDEX_PATH))

    with DOCS_PATH.open("wb") as handle:
        pickle.dump(documents, handle)


def _load_index() -> tuple[faiss.Index, list[dict]]:
    index = faiss.read_index(str(INDEX_PATH))
    with DOCS_PATH.open("rb") as handle:
        docs = pickle.load(handle)
    return index, docs


class RAGEngine:
    def __init__(self, project_root: Path) -> None:
        self.project_root = project_root
        self.index: faiss.Index | None = None
        self.documents: list[dict] = []

    def rebuild(self) -> int:
        documents = build_documents(self.project_root)
        vectors = _create_embeddings([doc["content"] for doc in documents])
        _save_index(vectors, documents)
        self.index, self.documents = _load_index()
        return len(documents)

    def ensure_loaded(self) -> None:
        if self.index is not None and self.documents:
            return
        if INDEX_PATH.exists() and DOCS_PATH.exists():
            self.index, self.documents = _load_index()
            return
        self.rebuild()

    def search(self, query: str, k: int | None = None) -> list[dict]:
        self.ensure_loaded()
        if self.index is None:
            return []

        top_k = k or INDEXING_CONFIG["top_k"]
        query_vector = _create_embeddings([query])
        if query_vector.size == 0:
            return []

        distances, indices = self.index.search(query_vector, top_k)
        results: list[dict] = []
        for score, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.documents):
                continue
            row = dict(self.documents[idx])
            row["score"] = float(score)
            results.append(row)
        return results

    @staticmethod
    def context_from_results(results: list[dict]) -> str:
        if not results:
            return ""
        return "\n\n".join(
            f"[source: {item['path']} chunk:{item['chunk']} score:{item['score']:.4f}]\n{item['content']}"
            for item in results
        )
