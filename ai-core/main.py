from __future__ import annotations

from config import OLLAMA_CONFIG
from indexer import rebuild_index
from rag import RAGEngine, ask_llm, ollama_available


def build_prompt(question: str, context: str) -> str:
    return f"""
Você é especialista em React, Next.js e arquitetura web.
Seu foco é sugerir código limpo, performático e offline-friendly.

Contexto do projeto:
{context}

Pergunta:
{question}

Responda com passos curtos e código otimizado.
""".strip()


def run() -> int:
    print("Mini Copilot Python (RAG local)")
    print(f"Modelo configurado: {OLLAMA_CONFIG['model']}")

    indexed_docs = rebuild_index()
    engine = RAGEngine()
    print(f"Índice carregado com {indexed_docs} chunks.")

    if not ollama_available():
        print("Ollama indisponível. Inicie com: ollama serve")

    while True:
        try:
            question = input("\nPergunta (/exit para sair): ").strip()
        except EOFError:
            break

        if not question:
            continue
        if question == "/exit":
            break
        if question == "/reindex":
            indexed_docs = rebuild_index()
            engine.reload()
            print(f"Reindexado com {indexed_docs} chunks.")
            continue

        results = engine.search(question)
        context = engine.context_from_results(results)
        prompt = build_prompt(question, context)

        try:
            answer = ask_llm(prompt)
        except Exception as exc:  # noqa: BLE001
            print(f"Erro LLM: {exc}")
            continue

        print("\nResposta:\n")
        print(answer)

    print("Encerrado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
