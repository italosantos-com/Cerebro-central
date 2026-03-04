#!/usr/bin/env bash
set -euo pipefail

# Streams Vertex AI Gemini output and prints only text parts.
# Requires: gcloud
# Optional: jq (better text extraction)

print_help() {
  cat <<'HELP'
Usage:
  scripts/vertex_gemini_stream_text.sh [options] [prompt...]

Options:
  --project <id>        GCP project id (default: env PROJECT_ID or repo default)
  --location <region>   Vertex region (default: env LOCATION or us-central1)
  --model <modelId>     Model id (default: env MODEL_ID or gemini-2.5-flash-lite)
  --key-file <path>     Service account JSON (default: env GOOGLE_APPLICATION_CREDENTIALS or ./service_account.json)
  --raw-json            Print raw streaming JSON instead of extracted text
  -h, --help            Show this help

Examples:
  scripts/vertex_gemini_stream_text.sh "Responda só com: ok"
  scripts/vertex_gemini_stream_text.sh --model gemini-2.5-pro "Explique X em 3 bullets"
  scripts/vertex_gemini_stream_text.sh --project projeto-italo-bc5ef --location us-central1 "Hello"
HELP
}

# Defaults (can be overridden by env or flags)
LOCATION="${LOCATION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-projeto-italo-bc5ef}"
MODEL_ID="${MODEL_ID:-gemini-2.5-flash-lite}"
RAW_JSON="false"

ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="${2:-}"; shift 2 ;;
    --location)
      LOCATION="${2:-}"; shift 2 ;;
    --model)
      MODEL_ID="${2:-}"; shift 2 ;;
    --key-file)
      GOOGLE_APPLICATION_CREDENTIALS="${2:-}"; shift 2 ;;
    --raw-json)
      RAW_JSON="true"; shift ;;
    -h|--help)
      print_help; exit 0 ;;
    --)
      shift; ARGS+=("$@"); break ;;
    *)
      ARGS+=("$1"); shift ;;
  esac
done

PROMPT="${ARGS[*]:-Escreva 5 linhas sobre fotografia. Responda em PT-BR.}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_FILE="${GOOGLE_APPLICATION_CREDENTIALS:-$REPO_ROOT/service_account.json}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Erro: gcloud não encontrado no PATH." >&2
  exit 1
fi

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Erro: service account JSON não encontrado em: $KEY_FILE" >&2
  echo "Dica: defina GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/service_account.json" >&2
  exit 1
fi

# Activate SA (idempotent) and get access token
gcloud auth activate-service-account --key-file="$KEY_FILE" --quiet >/dev/null 2>&1
ACCESS_TOKEN="$(gcloud auth print-access-token)"

URL="https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:streamGenerateContent"

# Safely JSON-escape the prompt (avoid breaking quotes/newlines)
if command -v node >/dev/null 2>&1; then
  PROMPT_JSON=$(node -e 'process.stdout.write(JSON.stringify(process.argv[1] ?? ""))' "$PROMPT")
else
  # Fallback: very minimal escaping (quotes + backslashes). Prefer installing node.
  PROMPT_JSON="\"${PROMPT//\\/\\\\}\""
  PROMPT_JSON="${PROMPT_JSON//\"/\\\"}"
fi

PAYLOAD=$(cat <<JSON
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": ${PROMPT_JSON}}
      ]
    }
  ]
}
JSON
)

# -N: no buffering in curl output
# Prefer jq (best). If jq isn't available, fall back to Node-based streaming text extraction.
if command -v jq >/dev/null 2>&1; then
  if [[ "$RAW_JSON" == "true" ]]; then
    curl -N -sS \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      "$URL" \
      -d "$PAYLOAD"
    exit 0
  fi
  curl -N -sS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "$URL" \
    -d "$PAYLOAD" \
  | jq -r --unbuffered '.. | .text? // empty'
elif command -v node >/dev/null 2>&1; then
  if [[ "$RAW_JSON" == "true" ]]; then
    curl -N -sS \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      "$URL" \
      -d "$PAYLOAD"
    exit 0
  fi
  curl -N -sS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "$URL" \
    -d "$PAYLOAD" \
  | node -e 'let buffer=""; let cursor=0; function unescapeJsonString(s){ try { return JSON.parse("\""+s+"\""); } catch { return s; } } process.stdin.setEncoding("utf8"); process.stdin.on("data", (chunk)=>{ buffer+=chunk; const regex=/"text"\s*:\s*"((?:\\\\.|[^"\\\\])*)"/g; regex.lastIndex=cursor; let m; while((m=regex.exec(buffer))!==null){ process.stdout.write(unescapeJsonString(m[1])); cursor=regex.lastIndex; } }); process.stdin.on("end", ()=>{ process.stdout.write("\n"); });'
else
  echo "Aviso: instale jq (recomendado) ou Node para extrair só o texto. Mostrando JSON bruto do stream." >&2
  curl -N -sS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "$URL" \
    -d "$PAYLOAD"
fi
