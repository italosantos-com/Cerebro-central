from __future__ import annotations

import json
import urllib.error
import urllib.request

from backend.settings import OLLAMA_ENDPOINT, OLLAMA_MODEL, OLLAMA_OPTIONS, OLLAMA_TAGS_ENDPOINT


def ollama_available() -> bool:
    try:
        request = urllib.request.Request(OLLAMA_TAGS_ENDPOINT, method="GET")
        with urllib.request.urlopen(request, timeout=2) as response:
            return response.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def generate_completion(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": OLLAMA_OPTIONS,
    }

    request = urllib.request.Request(
        OLLAMA_ENDPOINT,
        method="POST",
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload).encode("utf-8"),
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Falha ao acessar Ollama local.") from exc

    parsed = json.loads(raw)
    return (parsed.get("response") or "").strip()
