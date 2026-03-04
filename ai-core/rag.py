from __future__ import annotations

import json
import urllib.error
import urllib.request

import numpy as np

from config import INDEXING_CONFIG, OLLAMA_CONFIG, OLLAMA_ENDPOINT, OLLAMA_TAGS_ENDPOINT
from embeddings import create_embeddings, load_index_and_docs


class RAGEngine:
    def __init__(self) -> None:
        self.index, self.documents = load_index_and_docs()

    def reload(self) -> None:
        self.index, self.documents = load_index_and_docs()

    def search(self, query: str, k: int | None = None) -> list[dict]:
        top_k = k or INDEXING_CONFIG["top_k"]
        query_vector = create_embeddings([query])
        if query_vector.size == 0:
            return []

        distances, indices = self.index.search(np.asarray(query_vector, dtype="float32"), top_k)

        results: list[dict] = []
        for score, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.documents):
                continue
            row = dict(self.documents[idx])
            row["score"] = float(score)
            results.append(row)
        return results

    def context_from_results(self, results: list[dict]) -> str:
        if not results:
            return ""
        return "\n\n".join(
            f"[source: {item['path']} chunk:{item['chunk']} score:{item['score']:.4f}]\n{item['content']}"
            for item in results
        )


def ollama_available() -> bool:
    try:
        req = urllib.request.Request(OLLAMA_TAGS_ENDPOINT, method="GET")
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def ask_llm(prompt: str) -> str:
    payload = {
        **OLLAMA_CONFIG,
        "prompt": prompt,
        "stream": False,
    }

    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        OLLAMA_ENDPOINT,
        method="POST",
        headers={"Content-Type": "application/json"},
        data=data,
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Falha ao acessar Ollama local.") from exc

    parsed = json.loads(raw)
    answer = (parsed.get("response") or "").strip()
    if not answer:
        raise RuntimeError("Resposta inválida do Ollama.")
    return answer
