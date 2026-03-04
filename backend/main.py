from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend.autocomplete import complete_inline, create_engine
from backend.llm_client import ollama_available

PROJECT_ROOT = Path(__file__).resolve().parents[1]
rag_engine = create_engine(PROJECT_ROOT)

app = FastAPI(title="Offline Dev Assistant")


class AutocompleteRequest(BaseModel):
    filePath: str
    language: str
    prefix: str
    suffix: str = ""


class AutocompleteResponse(BaseModel):
    completion: str


@app.on_event("startup")
def startup_reindex() -> None:
    rag_engine.rebuild()


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "ollama": ollama_available(),
    }


@app.post("/reindex")
def reindex() -> dict:
    total = rag_engine.rebuild()
    return {"indexed_chunks": total}


@app.post("/autocomplete", response_model=AutocompleteResponse)
def autocomplete(request: AutocompleteRequest) -> AutocompleteResponse:
    if not request.prefix.strip():
        return AutocompleteResponse(completion="")

    try:
        completion = complete_inline(
            rag_engine=rag_engine,
            file_path=request.filePath,
            prefix=request.prefix,
            suffix=request.suffix,
            language=request.language,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AutocompleteResponse(completion=completion)
