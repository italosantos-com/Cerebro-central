from __future__ import annotations

import argparse
import csv
import html
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Carrega dataset de pré-treino local (JSONL), Firestore ou BigQuery.",
    )
    parser.add_argument(
        "--source",
        choices=("local", "firestore", "bigquery"),
        default="local",
        help="Origem dos dados de treino.",
    )
    parser.add_argument(
        "--path",
        default=".",
        help="Diretório para varredura de arquivos de treino quando --source=local.",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Ativa varredura recursiva dentro do diretório informado em --path.",
    )
    parser.add_argument(
        "--ext",
        default=".json,.jsonl,.csv,.txt,.md",
        help="Lista de extensões aceitas separadas por vírgula (ex: .json,.csv,.txt).",
    )
    parser.add_argument(
        "--exclude-dirs",
        default="node_modules,.git,__pycache__,venv,.venv,dist,build,vector_db",
        help="Diretórios ignorados na varredura local (separados por vírgula).",
    )
    parser.add_argument(
        "--max-file-bytes",
        type=int,
        default=8_000_000,
        help="Tamanho máximo em bytes por arquivo durante varredura local.",
    )
    parser.add_argument(
        "--collection",
        default=os.getenv("FIRESTORE_TRAIN_COLLECTION", "offline_train"),
        help="Coleção Firestore com documentos de treino quando --source=firestore.",
    )
    parser.add_argument(
        "--project-id",
        default=os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCLOUD_PROJECT"),
        help="Project ID GCP/Firebase (opcional se já definido no ambiente).",
    )
    parser.add_argument(
        "--credentials",
        default=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        help="Caminho do service account JSON (opcional).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=500,
        help="Limite de registros carregados do Firestore/BigQuery (0 = sem limite).",
    )
    parser.add_argument(
        "--question-field",
        default="question",
        help="Nome do campo de pergunta no documento.",
    )
    parser.add_argument(
        "--answer-field",
        default="answer",
        help="Nome do campo de resposta no documento.",
    )
    parser.add_argument(
        "--output",
        default="",
        help="Arquivo de saída .jsonl opcional para salvar o dataset consolidado.",
    )
    parser.add_argument(
        "--clean-html",
        action="store_true",
        help="Remove tags HTML e normaliza espaços nas respostas antes de salvar.",
    )
    parser.add_argument(
        "--bq-project",
        default=os.getenv("BIGQUERY_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT") or "bigquery-public-data",
        help="Projeto BigQuery. Padrão usa dados públicos.",
    )
    parser.add_argument(
        "--bq-location",
        default=os.getenv("BIGQUERY_LOCATION", "US"),
        help="Localização do BigQuery (ex: US).",
    )
    parser.add_argument(
        "--bq-tags",
        default="reactjs,next.js,firebase,python",
        help="Tags para filtrar no BigQuery (separadas por vírgula).",
    )
    parser.add_argument(
        "--bq-max-bytes",
        type=int,
        default=1_000_000_000,
        help="Máximo de bytes processados na query BigQuery.",
    )
    return parser.parse_args()


def _normalize_record(payload: dict[str, Any], question_field: str, answer_field: str) -> dict[str, str] | None:
    question = payload.get(question_field)
    answer = payload.get(answer_field)
    if isinstance(question, str) and isinstance(answer, str):
        q = question.strip()
        a = answer.strip()
        if q and a:
            return {"question": q, "answer": a}
    return None


def _strip_html_text(value: str) -> str:
    text = html.unescape(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _clean_records(records: list[dict[str, str]], clean_html: bool) -> list[dict[str, str]]:
    if not clean_html:
        return records

    cleaned: list[dict[str, str]] = []
    for item in records:
        question = _strip_html_text(item["question"])
        answer = _strip_html_text(item["answer"])
        if question and answer:
            cleaned.append({"question": question, "answer": answer})
    return cleaned


def _collect_local_files(path: Path, recursive: bool, extensions: set[str], excluded_dirs: set[str], max_file_bytes: int) -> list[Path]:
    if not path.exists() or not path.is_dir():
        return []

    pattern = "**/*" if recursive else "*"
    files: list[Path] = []
    for p in path.glob(pattern):
        if not p.is_file():
            continue
        if p.suffix.lower() not in extensions:
            continue
        if any(part in excluded_dirs for part in p.parts):
            continue
        try:
            if p.stat().st_size > max_file_bytes:
                continue
        except OSError:
            continue
        files.append(p)
    files.sort()
    return files


def _parse_json_like(file_path: Path, question_field: str, answer_field: str) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    raw = file_path.read_text(encoding="utf-8", errors="ignore")

    try:
        payload = json.loads(raw)
        if isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict):
                    normalized = _normalize_record(item, question_field, answer_field)
                    if normalized:
                        records.append(normalized)
        elif isinstance(payload, dict):
            normalized = _normalize_record(payload, question_field, answer_field)
            if normalized:
                records.append(normalized)
        return records
    except json.JSONDecodeError:
        pass

    for line in raw.splitlines():
        row = line.strip()
        if not row:
            continue
        try:
            item = json.loads(row)
        except json.JSONDecodeError:
            continue
        if isinstance(item, dict):
            normalized = _normalize_record(item, question_field, answer_field)
            if normalized:
                records.append(normalized)
    return records


def _parse_csv(file_path: Path, question_field: str, answer_field: str) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    with file_path.open("r", encoding="utf-8", errors="ignore", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            normalized = _normalize_record(row, question_field, answer_field)
            if normalized:
                records.append(normalized)
    return records


def _parse_text_pairs(file_path: Path) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    for line in file_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        raw = line.strip()
        if not raw or "=>" not in raw:
            continue
        question, answer = [part.strip() for part in raw.split("=>", 1)]
        if question and answer:
            records.append({"question": question, "answer": answer})
    return records


def load_local_training_records(args: argparse.Namespace) -> tuple[list[dict[str, str]], dict[str, int], int]:
    extensions = {
        ext.strip().lower() if ext.strip().startswith(".") else f".{ext.strip().lower()}"
        for ext in args.ext.split(",")
        if ext.strip()
    }
    excluded_dirs = {item.strip() for item in args.exclude_dirs.split(",") if item.strip()}
    files = _collect_local_files(Path(args.path), args.recursive, extensions, excluded_dirs, args.max_file_bytes)
    per_file_counts: dict[str, int] = {}
    records: list[dict[str, str]] = []

    for file_path in files:
        suffix = file_path.suffix.lower()
        try:
            if suffix in {".json", ".jsonl"}:
                extracted = _parse_json_like(file_path, args.question_field, args.answer_field)
            elif suffix == ".csv":
                extracted = _parse_csv(file_path, args.question_field, args.answer_field)
            elif suffix in {".txt", ".md"}:
                extracted = _parse_text_pairs(file_path)
            else:
                extracted = []
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️ Ignorando arquivo inválido: {file_path} ({exc})")
            continue

        if extracted:
            per_file_counts[str(file_path)] = len(extracted)
            records.extend(extracted)

    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, str]] = []
    for item in records:
        key = (item["question"], item["answer"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return deduped, per_file_counts, len(files)

    if not arquivos_json:
        print(f"⚠️ Nenhum arquivo .json encontrado em: {path}")
        return pd.DataFrame()

    dataframes: list[pd.DataFrame] = []

    for arquivo in arquivos_json:
        try:
            df = pd.read_json(arquivo, lines=True)
            dataframes.append(df)
        except ValueError as exc:
            print(f"⚠️ Ignorando arquivo inválido para JSONL: {arquivo} ({exc})")

    if not dataframes:
        return pd.DataFrame()

    return pd.concat(dataframes, ignore_index=True)


def load_firestore_docs(args: argparse.Namespace) -> list[dict[str, str]]:
    try:
        from google.cloud import firestore
    except ImportError:
        print(
            "❌ Dependência ausente: google-cloud-firestore. "
            "Instale com: python3 -m pip install google-cloud-firestore"
        )
        return []

    if args.credentials:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = args.credentials

    client_kwargs: dict[str, Any] = {}
    if args.project_id:
        client_kwargs["project"] = args.project_id

    client = firestore.Client(**client_kwargs)
    docs_stream = client.collection(args.collection).stream()

    records: list[dict[str, str]] = []
    loaded = 0
    for doc in docs_stream:
        if args.limit > 0 and loaded >= args.limit:
            break

        payload = doc.to_dict() or {}
        question = payload.get(args.question_field)
        answer = payload.get(args.answer_field)

        if isinstance(question, str) and isinstance(answer, str):
            records.append({"question": question, "answer": answer})
            loaded += 1

    return records


def load_bigquery_docs(args: argparse.Namespace) -> list[dict[str, str]]:
    try:
        from google.cloud import bigquery
    except ImportError:
        print(
            "❌ Dependência ausente: google-cloud-bigquery. "
            "Instale com: python3 -m pip install google-cloud-bigquery"
        )
        return []

    if args.credentials:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = args.credentials

    tags = [tag.strip().lower() for tag in args.bq_tags.split(",") if tag.strip()]
    if not tags:
        print("❌ Nenhuma tag informada em --bq-tags.")
        return []

    tag_pattern = "|".join(tags)
    sql_limit = "" if args.limit == 0 else "LIMIT @limit"

    query = f"""
    SELECT
      q.id AS question_id,
      q.title AS question,
      a.body AS answer
    FROM `bigquery-public-data.stackoverflow.posts_questions` q
    JOIN `bigquery-public-data.stackoverflow.posts_answers` a
      ON a.id = q.accepted_answer_id
    WHERE q.accepted_answer_id IS NOT NULL
      AND REGEXP_CONTAINS(LOWER(IFNULL(q.tags, '')), @tag_pattern)
      AND q.title IS NOT NULL
      AND a.body IS NOT NULL
    ORDER BY q.score DESC, a.score DESC
    {sql_limit}
    """

    client_kwargs: dict[str, Any] = {}
    if args.bq_project:
        client_kwargs["project"] = args.bq_project
    client = bigquery.Client(**client_kwargs)

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("tag_pattern", "STRING", tag_pattern),
            bigquery.ScalarQueryParameter("limit", "INT64", int(args.limit or 0)),
        ],
        maximum_bytes_billed=int(args.bq_max_bytes),
    )

    rows = client.query(query, location=args.bq_location, job_config=job_config).result()

    records: list[dict[str, str]] = []
    for row in rows:
        question = str(row.question or "").strip()
        answer = str(row.answer or "").strip()
        if question and answer:
            records.append({"question": question, "answer": answer})

    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, str]] = []
    for item in records:
        key = (item["question"], item["answer"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def save_output(records: list[dict[str, str]], output_file: str) -> None:
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for item in records:
            handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"💾 Dataset salvo em: {output_path}")


def main() -> int:
    args = parse_args()

    if args.source == "firestore":
        records = load_firestore_docs(args)
        scanned_files = 0
        per_file_counts: dict[str, int] = {}
    elif args.source == "bigquery":
        records = load_bigquery_docs(args)
        scanned_files = 0
        per_file_counts = {}
    else:
        records, per_file_counts, scanned_files = load_local_training_records(args)

    if not records:
        print("❌ Nenhum registro válido foi carregado.")
        return 1

    records = _clean_records(records, clean_html=args.clean_html)

    if not records:
        print("❌ Nenhum registro válido após limpeza.")
        return 1

    if args.output:
        save_output(records, args.output)

    if args.source == "local":
        print(f"📁 Arquivos varridos: {scanned_files}")
        if per_file_counts:
            print("📚 Arquivos com dados de treino encontrados:")
            sorted_items = sorted(per_file_counts.items(), key=lambda item: item[1], reverse=True)
            preview_limit = 30
            for file_path, count in sorted_items[:preview_limit]:
                print(f"- {file_path}: {count}")
            remaining = len(sorted_items) - preview_limit
            if remaining > 0:
                print(f"- ... e mais {remaining} arquivo(s) com dados de treino")

    print(f"✅ Sucesso! {len(records)} registros carregados para o treino offline.")
    print("🔎 Amostra:")
    for item in records[:5]:
        print(f"- Q: {item['question']} | A: {item['answer']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
