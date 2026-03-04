from __future__ import annotations

import pickle
from typing import Iterable

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from config import DOCS_PATH, EMBEDDING_MODEL, INDEX_PATH, VECTOR_DIR

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def create_embeddings(texts: Iterable[str]) -> np.ndarray:
    model = get_model()
    vectors = model.encode(
        list(texts),
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return np.asarray(vectors, dtype="float32")


def save_index(vectors: np.ndarray, documents: list[dict]) -> None:
    VECTOR_DIR.mkdir(parents=True, exist_ok=True)

    if vectors.size == 0:
        dim = 384
        index = faiss.IndexFlatIP(dim)
    else:
        dim = vectors.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(vectors)

    faiss.write_index(index, str(INDEX_PATH))

    with DOCS_PATH.open("wb") as handle:
        pickle.dump(documents, handle)


def load_index_and_docs() -> tuple[faiss.Index, list[dict]]:
    index = faiss.read_index(str(INDEX_PATH))
    with DOCS_PATH.open("rb") as handle:
        docs = pickle.load(handle)
    return index, docs
