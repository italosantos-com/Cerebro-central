<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/81ed5372-9b85-4bfa-91bb-e9353100041e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Chat offline no terminal (sem internet) - Python

Este projeto inclui um chat local no terminal em Python, com histórico salvo em JSON.

### Pré-requisitos offline

1. Ter o Ollama instalado localmente
2. Iniciar o serviço local:
   `ollama serve`
3. Ter pelo menos um modelo baixado (feito uma vez):
   `ollama pull mistral`

Se aparecer `command not found: ollama` no macOS, instale com:

`brew install --cask ollama`

Depois abra o app Ollama uma vez e rode `ollama serve`.

### Uso

1. Inicie o chat:
   `python3 chat_cli.py`
   ou
   `npm run chat:offline`
2. (Opcional) Defina um modelo inicial:
   `python3 chat_cli.py llama3.2`

O histórico é salvo em `conversations.json` na raiz do projeto.
O aprendizado local é salvo em `learning.json` na raiz do projeto.
Se o Ollama não estiver ativo, o chat inicia em modo offline local usando apenas a base aprendida.

### Comandos no chat

- `/help` mostra os comandos
- `/new [titulo]` cria nova conversa
- `/list` lista conversas
- `/use <numero>` troca conversa ativa
- `/history` exibe histórico da conversa ativa
- `/model <nome>` troca o modelo da conversa ativa
- `/learn <pergunta> => <resposta>` adiciona aprendizado local
- `/learn-file <arquivo>` importa treinamento de arquivo
- `/learn-list` lista exemplos aprendidos
- `/learn-clear` limpa aprendizados
- `/offline-status` mostra status dos recursos locais
- `/perf on|off|status` ativa métricas de tempo e contexto usado
- `/try-ollama` tenta reconectar no Ollama local
- `/export [arquivo]` exporta conversas e aprendizado para JSON
- `/import <arquivo>` importa conversas e aprendizado de JSON
- `/exit` encerra o chat

### Inicialização rápida

No terminal, use:

`cerebro central`

## Arquitetura avançada Python (RAG leve)

Estrutura criada:

- `ai-core/main.py` (copilot técnico local)
- `ai-core/rag.py` (busca vetorial + chamada Ollama)
- `ai-core/embeddings.py` (MiniLM + FAISS)
- `ai-core/indexer.py` (indexador de código útil)
- `ai-core/config.py` (config otimizada para Mac 2017)
- `ai-core/watch.py` (aprendizado incremental por monitoramento)
- `vector_db/` (índice)
- `knowledge/` (base de conhecimento)
- `projects/` (código para indexação)

### Instalação do núcleo IA

```bash
cd ai-core
python3 -m pip install -r requirements.txt
```

### Comandos principais

- `cerebro central` inicia o copilot RAG local
- `cerebro index` reindexa conhecimento/código
- `cerebro watch` ativa reindexação incremental
- `cerebro chat` inicia o chat offline simples (`chat_cli.py`)

### Fluxo recomendado (zero travamento)

1. Coloque docs em `knowledge/`
2. Coloque projetos/código em `projects/`
3. Rode `cerebro index`
4. Inicie com `cerebro central`

### Método fácil: enviar arquivo de treinamento

Use um dos formatos abaixo e rode:

`/learn-file nome-do-arquivo`

Formatos aceitos:

- `.json` com `[{"question":"...","answer":"..."}]`
- `.jsonl` (1 JSON por linha com `question` e `answer`)
- `.csv` com colunas `question,answer`
- `.txt` ou `.md` com linhas `pergunta => resposta`

Exemplo `.json`:

```json
[
   {
      "question": "Como criar rota no Express?",
      "answer": "Use app.get('/rota', handler)."
   },
   {
      "question": "Como iniciar Vite?",
      "answer": "Execute npm run dev."
   }
]
```

## MVP: Autocomplete inline offline (VS Code)

### 1) Iniciar backend local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm run backend:dev
```

O backend sobe em `http://127.0.0.1:8000`, indexa o projeto ao iniciar e expõe:

- `POST /autocomplete`
- `POST /reindex`
- `GET /health`

### 2) Rodar Ollama local

```bash
ollama serve
ollama pull deepseek-coder:6.7b
```

### 3) Carregar extensão local no VS Code

1. Abra a pasta `vscode-extension`
2. Pressione `F5` para abrir a janela Extension Development Host
3. Na janela nova, abra seu projeto web
4. Comece a digitar em `.py`, `.js`, `.ts`, `.html` ou `.css`

As sugestões inline (ghost text) serão buscadas do backend local, usando contexto semântico do projeto (RAG) + Ollama.
