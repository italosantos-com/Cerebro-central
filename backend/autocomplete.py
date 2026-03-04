from __future__ import annotations

from pathlib import Path

from backend.llm_client import generate_completion
from backend.rag_engine import RAGEngine


def build_prompt(prefix: str, suffix: str, language: str, rag_context: str) -> str:
    return f"""
You are a senior web developer mentoring a beginner.
Write clean, simple, commented code.
Avoid complex abstractions.
Follow best practices.

Task: complete the code inline.
Rules:
- Return only the continuation text, no markdown.
- Keep continuation short and coherent with current style.
- Do not repeat text already in the prefix.

Language: {language}

Project context (RAG):
{rag_context}

Code before cursor:
{prefix}

Code after cursor:
{suffix}
""".strip()


def complete_inline(
    rag_engine: RAGEngine,
    file_path: str,
    prefix: str,
    suffix: str,
    language: str,
) -> str:
    query = "\n".join(filter(None, [file_path, language, prefix[-800:]]))
    results = rag_engine.search(query)
    rag_context = rag_engine.context_from_results(results)
    prompt = build_prompt(prefix=prefix, suffix=suffix, language=language, rag_context=rag_context)
    return generate_completion(prompt)


def create_engine(project_root: Path) -> RAGEngine:
    return RAGEngine(project_root=project_root)
