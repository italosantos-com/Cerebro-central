#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import math
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

BASE_DIR = Path.cwd()
STORE_PATH = BASE_DIR / "conversations.json"
LEARNING_PATH = BASE_DIR / "learning.json"
DEFAULT_MODEL = sys.argv[1] if len(sys.argv) > 1 else "mistral"
OLLAMA_URL = "http://localhost:11434"


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_tokens(text: str) -> list[str]:
    clean = re.sub(r"[^\w\s]", " ", text.lower(), flags=re.UNICODE)
    return [token.strip() for token in clean.split() if len(token.strip()) > 2]


def read_json_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json_file(path: Path, payload: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def create_conversation(title: str, model: str) -> dict[str, Any]:
    now = iso_now()
    return {
        "id": str(uuid4()),
        "title": title,
        "model": model,
        "createdAt": now,
        "updatedAt": now,
        "messages": [],
    }


def ensure_store_file() -> None:
    if STORE_PATH.exists():
        return
    conv = create_conversation("Conversa 1", DEFAULT_MODEL)
    write_json_file(
        STORE_PATH,
        {
            "activeConversationId": conv["id"],
            "conversations": [conv],
        },
    )


def ensure_learning_file() -> None:
    if LEARNING_PATH.exists():
        return
    write_json_file(
        LEARNING_PATH,
        {
            "updatedAt": iso_now(),
            "examples": [],
        },
    )


def verify_ollama() -> bool:
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def call_ollama(model: str, prompt: str) -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_ctx": 4096,
            "temperature": 0.5,
            "num_predict": 500,
        },
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            raw = response.read().decode("utf-8")
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Falha ao acessar Ollama local. Verifique se ele está rodando.") from exc

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Resposta inválida do Ollama.") from exc

    text = (parsed.get("response") or "").strip()
    if not text:
        raise RuntimeError("Resposta inválida do Ollama.")
    return text


def parse_json_examples(raw: str) -> list[dict[str, str]]:
    parsed = json.loads(raw)

    def to_pair(item: Any) -> dict[str, str] | None:
        if not isinstance(item, dict):
            return None
        question = item.get("question")
        answer = item.get("answer")
        if isinstance(question, str) and isinstance(answer, str):
            question = question.strip()
            answer = answer.strip()
            if question and answer:
                return {"question": question, "answer": answer}
        return None

    if isinstance(parsed, list):
        return [item for item in (to_pair(entry) for entry in parsed) if item]

    if isinstance(parsed, dict) and isinstance(parsed.get("examples"), list):
        return [item for item in (to_pair(entry) for entry in parsed["examples"]) if item]

    return []


def parse_jsonl_examples(raw: str) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for line in [entry.strip() for entry in raw.splitlines() if entry.strip()]:
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(parsed, dict):
            continue
        question = parsed.get("question")
        answer = parsed.get("answer")
        if isinstance(question, str) and isinstance(answer, str):
            question = question.strip()
            answer = answer.strip()
            if question and answer:
                results.append({"question": question, "answer": answer})
    return results


def parse_csv_examples(raw: str) -> list[dict[str, str]]:
    rows = list(csv.reader(raw.splitlines()))
    if not rows:
        return []

    start = 0
    if len(rows[0]) >= 2:
        h1 = rows[0][0].strip().lower()
        h2 = rows[0][1].strip().lower()
        if "question" in h1 and "answer" in h2:
            start = 1

    results: list[dict[str, str]] = []
    for row in rows[start:]:
        if len(row) < 2:
            continue
        question = row[0].strip()
        answer = ",".join(row[1:]).strip()
        if question and answer:
            results.append({"question": question, "answer": answer})
    return results


def parse_text_examples(raw: str) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []

    blocks = [block.strip() for block in re.split(r"\n\s*---+\s*\n", raw) if block.strip()]
    for block in blocks:
        q_match = re.search(r"(?:^|\n)q(?:uestion)?\s*:\s*([\s\S]*?)(?:\n(?:a(?:nswer)?\s*:)|$)", block, re.IGNORECASE)
        a_match = re.search(r"(?:^|\n)a(?:nswer)?\s*:\s*([\s\S]*)$", block, re.IGNORECASE)
        if not q_match or not a_match:
            continue
        question = q_match.group(1).strip()
        answer = a_match.group(1).strip()
        if question and answer:
            results.append({"question": question, "answer": answer})

    if results:
        return results

    for line in [entry.strip() for entry in raw.splitlines() if entry.strip()]:
        if "=>" not in line:
            continue
        left, right = line.split("=>", 1)
        question = left.strip()
        answer = right.strip()
        if question and answer:
            results.append({"question": question, "answer": answer})

    return results


@dataclass
class IndexEntry:
    example: dict[str, Any]
    token_set: set[str]


@dataclass
class LearningIndex:
    entries: list[IndexEntry]
    token_freq: dict[str, int]
    total_entries: int


def build_learning_index(learning_store: dict[str, Any]) -> LearningIndex:
    freq: dict[str, int] = {}
    entries: list[IndexEntry] = []

    for example in learning_store.get("examples", []):
        combined = f"{example.get('question', '')} {example.get('answer', '')}"
        token_set = set(normalize_tokens(combined))
        for token in token_set:
            freq[token] = freq.get(token, 0) + 1
        entries.append(IndexEntry(example=example, token_set=token_set))

    return LearningIndex(entries=entries, token_freq=freq, total_entries=max(1, len(entries)))


def rank_examples_fast(user_message: str, learning_index: LearningIndex, max_results: int = 5) -> list[dict[str, Any]]:
    query_tokens = list(set(normalize_tokens(user_message)))
    if not query_tokens:
        return []

    ranked: list[tuple[float, dict[str, Any]]] = []
    for entry in learning_index.entries:
        weighted_overlap = 0.0
        overlap_count = 0

        for token in query_tokens:
            if token not in entry.token_set:
                continue
            overlap_count += 1
            freq = learning_index.token_freq.get(token, 1)
            rarity = math.log2(1 + learning_index.total_entries / freq)
            weighted_overlap += rarity

        if overlap_count == 0:
            continue

        question_tokens = set(normalize_tokens(str(entry.example.get("question", ""))))
        question_overlap = sum(1 for token in query_tokens if token in question_tokens)

        question_boost = question_overlap * 0.35
        coverage_boost = overlap_count / max(1, len(query_tokens))
        score = weighted_overlap + question_boost + coverage_boost
        ranked.append((score, entry.example))

    ranked.sort(key=lambda item: item[0], reverse=True)
    return [example for _, example in ranked[:max_results]]


def build_prompt(conversation: dict[str, Any], user_message: str, learned_examples: list[dict[str, Any]]) -> str:
    recent = conversation.get("messages", [])[-20:]
    history = "\n".join(f"{message.get('role')}: {message.get('content')}" for message in recent)

    learning_context = ""
    if learned_examples:
        chunks = ["Learned examples (local knowledge base):"]
        for idx, item in enumerate(learned_examples, start=1):
            chunks.append(f"example {idx} question: {item.get('question', '')}\nexample {idx} answer: {item.get('answer', '')}")
        learning_context = "\n\n".join(chunks)

    parts = [
        "You are a senior software engineer assistant focused on practical webapp development.",
        "Keep answers concise and actionable.",
        "If learned examples are relevant, prioritize those patterns in your response.",
        learning_context,
        history,
        f"user: {user_message}",
        "assistant:",
    ]

    return "\n\n".join([part for part in parts if part])


def build_local_only_response(examples: list[dict[str, Any]]) -> str:
    if not examples:
        return (
            "Estou em modo offline local (sem Ollama). "
            "Ainda não tenho um exemplo suficiente para essa pergunta. "
            "Use /learn ou /learn-file para me ensinar respostas específicas."
        )

    top = examples[0]
    alternatives = examples[1:3]

    if not alternatives:
        return f"Modo offline local ativo. Resposta sugerida (aprendida): {top.get('answer', '')}"

    alt_text = " | ".join(f"{index + 1}) {item.get('answer', '')}" for index, item in enumerate(alternatives))
    return (
        f"Modo offline local ativo. Resposta principal: {top.get('answer', '')} "
        f"Alternativas aprendidas: {alt_text}"
    )


def print_help() -> None:
    print("\nComandos:")
    print("  /help                 Mostra ajuda")
    print("  /new [titulo]         Cria nova conversa")
    print("  /list                 Lista conversas")
    print("  /use <numero>         Seleciona conversa pelo número da lista")
    print("  /history              Mostra histórico da conversa ativa")
    print("  /model <nome>         Troca modelo da conversa ativa")
    print("  /learn <p> => <r>     Adiciona exemplo de aprendizado local")
    print("  /learn-file <arquivo> Importa arquivo de treinamento")
    print("  /learn-list           Lista exemplos aprendidos")
    print("  /learn-clear          Remove todos os exemplos aprendidos")
    print("  /offline-status       Mostra status local/offline")
    print("  /perf [on|off|status] Mostra métricas de tempo e contexto")
    print("  /try-ollama           Tenta reconectar ao Ollama local")
    print("  /export [arquivo]     Exporta conversas+aprendizado para JSON")
    print("  /import <arquivo>     Importa conversas+aprendizado de JSON")
    print("  /exit                 Sai do chat\n")


def show_offline_status() -> None:
    print("\nStatus offline:")
    print(f"- Ollama local: {'OK' if verify_ollama() else 'indisponível'}")
    print(f"- Chat JSON ({STORE_PATH.name}): {'OK' if STORE_PATH.exists() else 'ausente'}")
    print(f"- Learning JSON ({LEARNING_PATH.name}): {'OK' if LEARNING_PATH.exists() else 'ausente'}")
    print()


def import_learning_file(file_name: str, learning_store: dict[str, Any]) -> int:
    target = (BASE_DIR / file_name.strip()).resolve()
    ext = target.suffix.lower()
    raw = target.read_text(encoding="utf-8")

    if ext == ".json":
        parsed = parse_json_examples(raw)
    elif ext == ".jsonl":
        parsed = parse_jsonl_examples(raw)
    elif ext == ".csv":
        parsed = parse_csv_examples(raw)
    elif ext in {".txt", ".md"}:
        parsed = parse_text_examples(raw)
    else:
        raise RuntimeError("Formato não suportado. Use .json, .jsonl, .csv, .txt ou .md")

    if not parsed:
        raise RuntimeError("Nenhum par pergunta/resposta válido encontrado no arquivo.")

    existing = {
        f"{str(item.get('question', '')).lower()}::{str(item.get('answer', '')).lower()}"
        for item in learning_store.get("examples", [])
    }

    inserted = 0
    for item in parsed:
        key = f"{item['question'].lower()}::{item['answer'].lower()}"
        if key in existing:
            continue
        learning_store["examples"].insert(
            0,
            {
                "id": str(uuid4()),
                "question": item["question"],
                "answer": item["answer"],
                "createdAt": iso_now(),
            },
        )
        existing.add(key)
        inserted += 1

    learning_store["updatedAt"] = iso_now()
    write_json_file(LEARNING_PATH, learning_store)
    return inserted


def export_offline_data(chat_store: dict[str, Any], learning_store: dict[str, Any], file_name: str | None) -> str:
    target = BASE_DIR / (file_name.strip() if file_name else f"offline-export-{int(time.time())}.json")
    payload = {
        "version": 1,
        "exportedAt": iso_now(),
        "chatStore": chat_store,
        "learningStore": learning_store,
    }
    write_json_file(target, payload)
    return str(target.resolve())


def is_valid_import_payload(payload: Any) -> bool:
    return (
        isinstance(payload, dict)
        and isinstance(payload.get("version"), int)
        and isinstance(payload.get("chatStore"), dict)
        and isinstance(payload["chatStore"].get("activeConversationId"), str)
        and isinstance(payload["chatStore"].get("conversations"), list)
        and isinstance(payload.get("learningStore"), dict)
        and isinstance(payload["learningStore"].get("examples"), list)
    )


def run() -> int:
    ensure_store_file()
    ensure_learning_file()

    ollama_available = verify_ollama()
    perf_mode = False

    chat_store = read_json_file(STORE_PATH)
    learning_store = read_json_file(LEARNING_PATH)
    learning_index = build_learning_index(learning_store)

    def persist_store() -> None:
        write_json_file(STORE_PATH, chat_store)

    def persist_learning() -> None:
        nonlocal learning_index
        learning_store["updatedAt"] = iso_now()
        write_json_file(LEARNING_PATH, learning_store)
        learning_index = build_learning_index(learning_store)

    print("\nMiniCopilot Offline (Terminal Python)")
    print("Histórico em JSON: conversations.json")
    print("Aprendizado em JSON: learning.json")
    if not ollama_available:
        print("Ollama não encontrado. Chat iniciado em modo offline local.")
        print("Dica: instale Ollama e rode `ollama serve`, depois use /try-ollama.")
    print("Digite /help para comandos.\n")

    while True:
        active = next(
            (conv for conv in chat_store.get("conversations", []) if conv.get("id") == chat_store.get("activeConversationId")),
            None,
        )

        if active is None:
            conv = create_conversation("Conversa 1", DEFAULT_MODEL)
            chat_store["conversations"] = [conv]
            chat_store["activeConversationId"] = conv["id"]
            persist_store()
            active = conv

        prompt_prefix = f"[{active.get('title')} | model={active.get('model')}]"

        try:
            user_input = input(f"{prompt_prefix} > ").strip()
        except EOFError:
            break

        if not user_input:
            continue

        if user_input == "/exit":
            break

        if user_input == "/help":
            print_help()
            continue

        if user_input == "/list":
            print("\nConversas:")
            for index, conv in enumerate(chat_store.get("conversations", []), start=1):
                marker = "*" if conv.get("id") == chat_store.get("activeConversationId") else " "
                print(f"{marker} {index}. {conv.get('title')} ({len(conv.get('messages', []))} msgs, model={conv.get('model')})")
            print()
            continue

        if user_input.startswith("/new"):
            title = user_input.replace("/new", "", 1).strip() or f"Conversa {len(chat_store.get('conversations', [])) + 1}"
            conv = create_conversation(title, active.get("model") or DEFAULT_MODEL)
            chat_store.setdefault("conversations", []).insert(0, conv)
            chat_store["activeConversationId"] = conv["id"]
            persist_store()
            print(f"Nova conversa criada: {conv['title']}")
            continue

        if user_input.startswith("/use"):
            index_text = user_input.replace("/use", "", 1).strip()
            try:
                index = int(index_text) - 1
            except ValueError:
                index = -1
            conversations = chat_store.get("conversations", [])
            if index < 0 or index >= len(conversations):
                print("Índice inválido. Use /list para ver as conversas.")
                continue
            chat_store["activeConversationId"] = conversations[index]["id"]
            persist_store()
            print(f"Conversa ativa: {conversations[index]['title']}")
            continue

        if user_input == "/history":
            messages = active.get("messages", [])
            if not messages:
                print("Sem mensagens nesta conversa.\n")
                continue
            print()
            for message in messages:
                print(f"{message.get('role')}: {message.get('content')}\n")
            continue

        if user_input.startswith("/model"):
            new_model = user_input.replace("/model", "", 1).strip()
            if not new_model:
                print("Informe o modelo. Exemplo: /model llama3.2")
                continue
            active["model"] = new_model
            active["updatedAt"] = iso_now()
            persist_store()
            print(f"Modelo atualizado para: {new_model}")
            continue

        if user_input.startswith("/learn "):
            payload = user_input.replace("/learn", "", 1).strip()
            parts = payload.split("=>")
            if len(parts) < 2:
                print("Formato inválido. Use: /learn pergunta => resposta")
                continue
            question = parts[0].strip()
            answer = "=>".join(parts[1:]).strip()
            if not question or not answer:
                print("Pergunta e resposta não podem estar vazias.")
                continue
            learning_store.setdefault("examples", []).insert(
                0,
                {
                    "id": str(uuid4()),
                    "question": question,
                    "answer": answer,
                    "createdAt": iso_now(),
                },
            )
            persist_learning()
            print("Exemplo aprendido com sucesso.")
            continue

        if user_input.startswith("/learn-file"):
            file_name = user_input.replace("/learn-file", "", 1).strip()
            if not file_name:
                print("Informe o arquivo. Exemplo: /learn-file training.json")
                continue
            try:
                total = import_learning_file(file_name, learning_store)
                learning_index = build_learning_index(learning_store)
                print(f"Aprendizado importado: {total} exemplos novos.")
            except Exception as exc:  # noqa: BLE001
                print(f"Falha ao importar treinamento: {exc}")
            continue

        if user_input == "/learn-list":
            examples = learning_store.get("examples", [])
            if not examples:
                print("Sem exemplos aprendidos. Use /learn para adicionar.")
                continue
            print("\nExemplos aprendidos:")
            for idx, example in enumerate(examples[:20], start=1):
                print(f"{idx}. Q: {example.get('question')}")
                print(f"   A: {example.get('answer')}")
            print()
            continue

        if user_input == "/learn-clear":
            learning_store["examples"] = []
            persist_learning()
            print("Aprendizado local limpo.")
            continue

        if user_input == "/offline-status":
            show_offline_status()
            continue

        if user_input.startswith("/perf"):
            value = user_input.replace("/perf", "", 1).strip().lower()
            if value in {"", "status"}:
                print(f"Perf mode: {'ON' if perf_mode else 'OFF'}")
                continue
            if value == "on":
                perf_mode = True
                print("Perf mode ativado.")
                continue
            if value == "off":
                perf_mode = False
                print("Perf mode desativado.")
                continue
            print("Uso: /perf on | /perf off | /perf status")
            continue

        if user_input == "/try-ollama":
            ollama_available = verify_ollama()
            if ollama_available:
                print("Conexão com Ollama restabelecida.")
            else:
                print("Ollama ainda indisponível em http://localhost:11434.")
            continue

        if user_input.startswith("/export"):
            file_name = user_input.replace("/export", "", 1).strip()
            try:
                out_path = export_offline_data(chat_store, learning_store, file_name if file_name else None)
                print(f"Dados exportados para: {out_path}")
            except Exception as exc:  # noqa: BLE001
                print(f"Falha ao exportar: {exc}")
            continue

        if user_input.startswith("/import"):
            file_name = user_input.replace("/import", "", 1).strip()
            if not file_name:
                print("Informe o arquivo. Exemplo: /import offline-export-123.json")
                continue
            try:
                target = (BASE_DIR / file_name).resolve()
                payload = read_json_file(target)
                if not is_valid_import_payload(payload):
                    raise RuntimeError("Arquivo de importação inválido.")
                chat_store = payload["chatStore"]
                learning_store = payload["learningStore"]
                write_json_file(STORE_PATH, chat_store)
                write_json_file(LEARNING_PATH, learning_store)
                learning_index = build_learning_index(learning_store)
                print("Dados importados com sucesso.")
            except Exception as exc:  # noqa: BLE001
                print(f"Falha ao importar: {exc}")
            continue

        user_message = {
            "id": str(uuid4()),
            "role": "user",
            "content": user_input,
            "createdAt": iso_now(),
        }
        active.setdefault("messages", []).append(user_message)
        active["updatedAt"] = iso_now()
        persist_store()

        started_at = time.perf_counter()
        examples = rank_examples_fast(user_input, learning_index)
        response_source = "offline"

        if ollama_available:
            try:
                prompt = build_prompt(active, user_input, examples)
                assistant_text = call_ollama(active.get("model") or DEFAULT_MODEL, prompt)
                response_source = "ollama"
            except Exception:  # noqa: BLE001
                ollama_available = False
                assistant_text = build_local_only_response(examples)
                response_source = "offline"
        else:
            assistant_text = build_local_only_response(examples)
            response_source = "offline"

        elapsed_ms = round((time.perf_counter() - started_at) * 1000)

        assistant_message = {
            "id": str(uuid4()),
            "role": "assistant",
            "content": assistant_text,
            "createdAt": iso_now(),
        }
        active.setdefault("messages", []).append(assistant_message)
        active["updatedAt"] = iso_now()
        persist_store()

        print(f"\nassistant: {assistant_text}\n")
        if perf_mode:
            print(
                f"[perf] source={response_source} time={elapsed_ms}ms "
                f"examples_used={len(examples)} model={active.get('model')}"
            )

    print("Chat encerrado.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except KeyboardInterrupt:
        print("\nChat encerrado.")
        raise SystemExit(0)
